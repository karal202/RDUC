param(
  [Parameter(Mandatory = $false)][string]$BackendUrl = '',
  [Parameter(Mandatory = $true)][string]$OutputJson,
  [Parameter(Mandatory = $true)][string]$SealedLicenseOutput,
  [Parameter(Mandatory = $true)][string]$RegFlagFile,
  [Parameter(Mandatory = $false)][string]$EncryptPs1Path = '',
  [Parameter(Mandatory = $false)][string]$GateIconPath = ''
)

if ([string]::IsNullOrWhiteSpace($BackendUrl)) {
  $BackendUrl = $env:BACKEND_URL
}
if ([string]::IsNullOrWhiteSpace($BackendUrl)) {
  $BackendUrl = 'https://rduc.onrender.com/api/license/validate'
}

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Net.ServicePointManager]::Expect100Continue = $false

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

function Get-BackendBaseUrl {
  param([string]$Url)
  try {
    $u = New-Object System.Uri($Url)
    return ($u.Scheme + '://' + $u.Authority)
  } catch {
    if ($Url -match '^(https?://[^/]+)') { return $Matches[1] }
    return 'https://rduc.onrender.com'
  }
}

function Test-BackendRetryableError {
  param([Exception]$Ex)
  if (-not $Ex) { return $false }
  if ($Ex -is [System.Net.WebException]) {
    if ($Ex.Response -eq $null) { return $true }
    if ($null -eq $Ex.Response) { return $true }
    $code = [int]$Ex.Response.StatusCode
    return ($code -ge 500 -or $code -eq 429 -or $code -eq 408)
  }
  if ($Ex.InnerException) { return (Test-BackendRetryableError $Ex.InnerException) }
  return $false
}

function Invoke-BackendWithRetry {
  param(
    [Parameter(Mandatory=$true)][string]$Uri,
    [Parameter(Mandatory=$false)][string]$Method = 'Get',
    [Parameter(Mandatory=$false)][string]$Body = '',
    [Parameter(Mandatory=$false)][string]$ContentType = 'application/json; charset=utf-8',
    [Parameter(Mandatory=$false)][int]$TimeoutPerTrySec = 25,
    [Parameter(Mandatory=$false)][int]$MaxAttempts = 6,
    [Parameter(Mandatory=$false)][scriptblock]$OnRetry = $null
  )
  $delays = @(1000,2000,4000,8000,16000,32000)
  $attempt = 0
  $lastEx = $null
  while ($attempt -lt $MaxAttempts) {
    $attempt++
    try {
      $splat = @{ Uri = $Uri; Method = $Method; TimeoutSec = $TimeoutPerTrySec; UseBasicParsing = $true }
      if (-not [string]::IsNullOrWhiteSpace($Body)) {
        $splat['Body'] = $Body
        $splat['ContentType'] = $ContentType
      }
      return (Invoke-RestMethod @splat)
    } catch {
      $lastEx = $_.Exception
      $retryable = (Test-BackendRetryableError $lastEx) -or ($attempt -lt 2 -and [string]::IsNullOrWhiteSpace("$($_.Exception.Response)"))
      if (-not $retryable -or $attempt -ge $MaxAttempts) { throw }
      $delay = $delays[($attempt-1)]
      if ($OnRetry) { try { & $OnRetry $attempt $MaxAttempts $delay $lastEx | Out-Null } catch {} }
      Start-Sleep -Milliseconds $delay
    }
  }
  if ($lastEx) { throw $lastEx }
}

function Invoke-BackendWarmup {
  param([Parameter(Mandatory=$false)][int]$TimeoutSec = 55)
  $base = Get-BackendBaseUrl $BackendUrl
  $probeUrls = @(
    ($base + '/api/license/desktop/check'),
    ($base + '/updates'),
    ($base + '/api/file-manager/desktop-policy')
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  foreach ($url in $probeUrls) {
    if ((Get-Date) -ge $deadline) { break }
    try {
      $leftMs = [int](($deadline - (Get-Date)).TotalMilliseconds)
      if ($leftMs -lt 1500) { break }
      $tmo = [Math]::Max(5, [Math]::Min(20, [int](($deadline - (Get-Date)).TotalSeconds)))
      $null = Invoke-BackendWithRetry -Uri $url -Method Get -TimeoutPerTrySec $tmo -MaxAttempts 2
      return $true
    } catch {}
  }
  return $false
}

# ========================================================================
#  HARDWARE ID + SEALING - 100% IDENTICAL with runtime Node.js
#  src/main/services/licenseService.js getHardwareHash() uses:
#    `${system.uuid}-${system.serial}-${cpu.manufacturer}-${cpu.brand}
#     -${osInfo.serial}-${os.hostname()}`
#  KEY MAPPINGS (JS -> PS WMI/Registry):
#    system.uuid    = Win32_ComputerSystemProduct.UUID
#    system.serial  = Win32_SystemEnclosure.SerialNumber -> fallback Win32_BIOS.SerialNumber
#    cpu.manufacturer = Win32_Processor.Manufacturer (short: "Intel"/"AMD")
#    cpu.brand      = HKLM:\HARDWARE\DESCRIPTION\System\CentralProcessor\0\ProcessorNameString
#                     (exact raw string with Unicode (R)(TM), matches Node brand UTF-8)
#    osInfo.serial  = Win32_OperatingSystem.SerialNumber
#    os.hostname()  = $env:COMPUTERNAME
#  Deviating from any of these = HWID hash mismatch = backend device binding wrong
#  and runtime decryptInstallerLicenseFile will fail (double key-entry bug).
# ========================================================================

function Get-JsCompatibleCpuBrand {
  $brand = ''
  try {
    $regVal = Get-ItemProperty -Path 'HKLM:\HARDWARE\DESCRIPTION\System\CentralProcessor\0' -Name 'ProcessorNameString' -ErrorAction Stop
    if ($regVal -and "$($regVal.ProcessorNameString)") { $brand = ("$($regVal.ProcessorNameString)").Trim() }
  } catch {}
  if ([string]::IsNullOrWhiteSpace($brand)) {
    try {
      $cpu = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
      if ($cpu -and "$($cpu.Name)") { $brand = ("$($cpu.Name)").Trim() }
    } catch {}
  }
  if ([string]::IsNullOrWhiteSpace($brand)) { return '' }
  # Normalize Unicode trademark symbols to match Node.js systeminformation cpu brand (registry stores ASCII (R)/(TM) → si returns Unicode ®/™)
  $brand = $brand -replace '\(R\)', [string][char]0x00AE
  $brand = $brand -replace '\(TM\)', [string][char]0x2122
  # Node si strips only the leading "<ordinal> " word (e.g. "13th "), preserves "Gen Intel(R)...". After (R)/(TM) Unicode normalize → exactly "Gen Intel® Core™..." hex matches node.
  $brand = $brand -replace '^\s*\(?\d+\s*(?:st|nd|rd|th)\)?\s+', ''
  return $brand.Trim()
}

function Get-JsCompatibleSystemSerial {
  try {
    $ch = Get-CimInstance Win32_SystemEnclosure -ErrorAction Stop
    if ($ch -and "$($ch.SerialNumber)") {
      $v = ("$($ch.SerialNumber)").Trim()
      if ($v -and $v -notmatch '^(0+|To be filled|Default|None|Not |N/A|$)' -and $v.Length -ge 4) {
        return $v
      }
    }
  } catch {}
  try {
    $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
    if ($bios -and "$($bios.SerialNumber)") {
      $v = ("$($bios.SerialNumber)").Trim()
      if ($v -and $v -notmatch '^(0+|To be filled|Default|None|Not |N/A|$)') { return $v }
    }
  } catch {}
  return ''
}

function Get-HardwareHash {
  try {
    $sys         = Get-CimInstance Win32_ComputerSystemProduct -ErrorAction Stop
    $serialField = Get-JsCompatibleSystemSerial
    $cpu         = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
    $osCim       = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $cpuBrand    = Get-JsCompatibleCpuBrand
    $cpuMfgRaw   = if ("$($cpu.Manufacturer)") { ("$($cpu.Manufacturer)").Trim() } else { '' }
    $cpuMfg      = if ($cpuMfgRaw -eq 'GenuineIntel') { 'Intel' } elseif ($cpuMfgRaw -eq 'AuthenticAMD') { 'AMD' } else { $cpuMfgRaw }
    $osSerial    = if ("$($osCim.SerialNumber)")  { ("$($osCim.SerialNumber)").Trim() }  else { '' }
    $hostName    = if ("$env:COMPUTERNAME") { "$env:COMPUTERNAME" } else { [System.Net.Dns]::GetHostName() }
    $uuidField   = if ("$($sys.UUID)") { ("$($sys.UUID)").Trim().ToLowerInvariant() } else { '' }
    $raw = $uuidField + '-' + $serialField + '-' + $cpuMfg + '-' + $cpuBrand + '-' + $osSerial + '-' + $hostName
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    $sha   = [System.Security.Cryptography.SHA256]::Create()
    return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
  } catch {
    try {
      $hostName = if ("$env:COMPUTERNAME") { "$env:COMPUTERNAME" } else { [System.Net.Dns]::GetHostName() }
      $is64     = [System.Environment]::Is64BitOperatingSystem
      $osVer    = [System.Environment]::OSVersion
      $plat     = if ($IsCoreCLR) { [System.Runtime.InteropServices.RuntimeInformation]::OSDescription } else { 'win32' }
      $release  = $osVer.Version.Major.ToString() + '.' + $osVer.Version.Minor.ToString() + '.' + $osVer.Version.Build.ToString()
      $procIdent= [System.Environment]::GetEnvironmentVariable('PROCESSOR_IDENTIFIER')
      if ([string]::IsNullOrWhiteSpace($procIdent)) { $procIdent = '' }
      $raw = "$hostName-$is64-$plat-$release-$procIdent"
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
      $sha   = [System.Security.Cryptography.SHA256]::Create()
      return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
    } catch {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('fallback_hwid')
      $sha   = [System.Security.Cryptography.SHA256]::Create()
      return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
    }
  }
}

# Mirrors Get-HardwareHash exactly (used for AES-CBC key derivation in seal step).
# PS5.1 compatible null-coalesce via if-else branches.
function Get-HardwareIdSeal {
  try {
    $sys         = Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
    $serialField = Get-JsCompatibleSystemSerial
    $cpu         = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
    $osCim       = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    $cpuBrand    = Get-JsCompatibleCpuBrand
    $p1 = if ("$($sys.UUID)") { ("$($sys.UUID)").Trim().ToLowerInvariant() } else { '' }
    $p2 = if ($serialField)   { $serialField } else { '' }
    $p3Raw = if ("$($cpu.Manufacturer)") { ("$($cpu.Manufacturer)").Trim() } else { '' }
    $p3 = if ($p3Raw -eq 'GenuineIntel') { 'Intel' } elseif ($p3Raw -eq 'AuthenticAMD') { 'AMD' } else { $p3Raw }
    $p4 = if ($cpuBrand) { $cpuBrand } else { '' }
    $p5 = if ("$($osCim.SerialNumber)") { ("$($osCim.SerialNumber)").Trim() } else { '' }
    $p6 = if ("$env:COMPUTERNAME") { "$env:COMPUTERNAME" } else { '' }
    $raw = (@($p1,$p2,$p3,$p4,$p5,$p6) -join '-')
    if ([string]::IsNullOrWhiteSpace($raw)) { $raw = 'fallback_hwid' }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
  } catch {
    $osPlatform = 'win32'
    $osRelease = [System.Environment]::OSVersion.Version.Major.ToString() + '.' +
                 [System.Environment]::OSVersion.Version.Minor.ToString() + '.' +
                 [System.Environment]::OSVersion.Version.Build.ToString()
    $procIdent = [System.Environment]::GetEnvironmentVariable('PROCESSOR_IDENTIFIER')
    if ([string]::IsNullOrWhiteSpace($procIdent)) { $procIdent = '' }
    $hostName = if ("$env:COMPUTERNAME") { "$env:COMPUTERNAME" } else { [System.Net.Dns]::GetHostName() }
    $is64 = [System.Environment]::Is64BitOperatingSystem
    $raw = (@($hostName, $is64, ($osPlatform + '-' + $osRelease), $procIdent) -join '-')
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
  }
}

# AES-CBC-256 PKCS7 with prepended IV - byte-for-byte identical output to
# running encrypt-license.ps1. No cross-process / sandbox / WorkingDirectory
# risks. All exceptions are captured and surfaced as log lines.
function Invoke-LicenseSealInline {
  param(
    [Parameter(Mandatory = $true)][string]$JsonPath,
    [Parameter(Mandatory = $true)][string]$OutPath
  )
  $PEPPER = 'D4W4_OP71M1Z3R_K3RN3L_V4UL7_2026_SEAL'
  $hwid = Get-HardwareIdSeal
  $keyMaterial = [System.Text.Encoding]::UTF8.GetBytes(($hwid + $PEPPER))
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $key = $sha256.ComputeHash($keyMaterial)

  $jsonBytes = [System.IO.File]::ReadAllBytes($JsonPath)

  $aes = [System.Security.Cryptography.Aes]::Create()
  $aes.Key = $key
  $aes.GenerateIV()
  $encryptor = $aes.CreateEncryptor()
  $ciphertext = $encryptor.TransformFinalBlock($jsonBytes, 0, $jsonBytes.Length)

  $finalBlob = New-Object byte[] ($aes.IV.Length + $ciphertext.Length)
  [Buffer]::BlockCopy($aes.IV, 0, $finalBlob, 0, $aes.IV.Length)
  [Buffer]::BlockCopy($ciphertext, 0, $finalBlob, $aes.IV.Length, $ciphertext.Length)

  $encoded = [Convert]::ToBase64String($finalBlob)
  $outDir = Split-Path -Parent $OutPath
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
  [System.IO.File]::WriteAllText($OutPath, $encoded, [System.Text.Encoding]::ASCII)

  if ($encryptor) { try { $encryptor.Dispose() } catch {} }
  if ($aes)       { try { $aes.Dispose() } catch {} }
  if ($sha256)    { try { $sha256.Dispose() } catch {} }
}

# Resolve the encrypt-license.ps1 companion script path
if ([string]::IsNullOrWhiteSpace($EncryptPs1Path)) {
  $EncryptPs1Path = Join-Path $PSScriptRoot 'encrypt-license.ps1'
}
$sealUtilName = if (Test-Path $EncryptPs1Path) { (Split-Path $EncryptPs1Path -Leaf) } else { 'AES-CBC (inline, equiv. encrypt-license.ps1)' }



function Write-GateFatalError {
  param([Parameter(Mandatory=$true)][string]$Message)
  try { [Console]::Error.WriteLine(($Message + [Environment]::NewLine)) } catch {}
}

$gateOuterOk = $false
$script:window = $null
$script:hwid = $null
$script:displayFingerprint = 'Đang đọc thiết bị...'
$script:LicenseEdit = $null
$script:SubmitBtn = $null
$script:SubmitText = $null
$script:SubmitIcon = $null
$script:KeyCounter = $null
$script:KeyBorder = $null
$script:FormAlert = $null
$script:FormAlertText = $null
$script:FingerprintText = $null
$script:PanelBorder = $null
$script:ShieldPath = $null
$script:ShieldCheck = $null
$script:ShieldAlert = $null
$script:MarkBorder = $null
$script:DeviceReadyDot = $null
$script:brushConv = $null
$script:Validated = $false
$script:GlobalResult = $null
$script:Busy = $false
$script:TypingIndex = 0
$script:TypingActive = $true
$script:TypingTimer = $null

try {
  $ErrorActionPreference = 'Continue'
  $script:brushConv = [System.Windows.Media.BrushConverter]::new()
  try { [System.Windows.Media.RenderOptions]::ProcessRenderMode = [System.Windows.Interop.RenderMode]::Hardware } catch { try { [System.Windows.Media.RenderOptions]::ProcessRenderMode = [System.Windows.Interop.RenderMode]::SoftwareOnly } catch {} }
  $procArch = if ("$env:PROCESSOR_ARCHITECTURE") { ("$env:PROCESSOR_ARCHITECTURE").ToLowerInvariant() } else { '' }
  if ($procArch -eq 'arm64') { $arch = 'arm64' }
  elseif ($procArch -eq 'amd64' -or $procArch -eq 'x64') { $arch = 'x64' }
  elseif ($procArch -eq 'x86') {
    if ([Environment]::Is64BitProcess) { $arch = 'x64' } else { $arch = 'ia32' }
  }
  elseif ([Environment]::Is64BitProcess) { $arch = 'x64' }
  else { $arch = 'ia32' }
  $osType = 'Windows_NT'
  $osRelease = [Environment]::OSVersion.Version.Major.ToString() + '.' +
               [Environment]::OSVersion.Version.Minor.ToString() + '.' +
               [Environment]::OSVersion.Version.Build.ToString()
  $osInfo = "$osType $osRelease ($arch)"
  $hostnameDisplay = if ("$env:COMPUTERNAME") { "$env:COMPUTERNAME" } else { [System.Net.Dns]::GetHostName() }
  $hostnameCanonical = $hostnameDisplay.ToLowerInvariant()
  $placeholderHwid = '000000000000000000000000000000000000000000000000000000000000000000000'
  $script:hwid = $placeholderHwid
  $script:displayFingerprint = 'Đang đọc thiết bị...'
  $xamlClean = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="DAWA OPTIMIZER - LICENSE ACTIVATION" Height="560" Width="920"
        Background="#07070a" Foreground="#F8FAFC"
        WindowStartupLocation="CenterScreen" ResizeMode="NoResize"
        WindowStyle="SingleBorderWindow" Topmost="True"
        ShowInTaskbar="True" ShowActivated="True"
        FontFamily="Segoe UI, Inter, sans-serif"
        TextOptions.TextFormattingMode="Display">
  <Window.Resources>
    <ControlTemplate x:Key="AccentButtonTemplate" TargetType="Button">
      <Border x:Name="border" Background="{TemplateBinding Background}" CornerRadius="10" BorderThickness="{TemplateBinding BorderThickness}" BorderBrush="{TemplateBinding BorderBrush}" Padding="{TemplateBinding Padding}">
        <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center" TextBlock.Foreground="{TemplateBinding Foreground}" TextBlock.FontWeight="{TemplateBinding FontWeight}" TextBlock.FontSize="{TemplateBinding FontSize}"/>
      </Border>
      <ControlTemplate.Triggers>
        <Trigger Property="IsMouseOver" Value="True">
          <Setter TargetName="border" Property="Background">
            <Setter.Value>
              <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
                <GradientStop Color="#3990ff" Offset="0"/>
                <GradientStop Color="#00c2ff" Offset="1"/>
              </LinearGradientBrush>
            </Setter.Value>
          </Setter>
        </Trigger>
        <Trigger Property="IsEnabled" Value="False">
          <Setter TargetName="border" Property="Opacity" Value="0.55"/>
        </Trigger>
      </ControlTemplate.Triggers>
    </ControlTemplate>
  </Window.Resources>

  <!-- Root = activation-screen (fullscreen container 920x560 #07070a) -->
  <Grid x:Name="Root" ClipToBounds="True" Background="#07070a" UseLayoutRounding="True" SnapsToDevicePixels="True" RenderOptions.BitmapScalingMode="LowQuality" RenderOptions.ClearTypeHint="Auto">

    <!-- ============================================================
         1. activation-art (grid-column:1/-1 FULL-WIDTH FULL-HEIGHT 920x560
            = banner image + aurora 3-orb radial + scrim gradient black L-R + T-B
         VUEL220% overlay
         Việc làm 100% full-bleed phủ toàn bộ cửa sổ (Fix chính khiến panel nổi
         bên trái trên nền ảnh background.
         ============================================================ -->
    <Grid x:Name="ArtCol" ClipToBounds="True" HorizontalAlignment="Stretch" VerticalAlignment="Stretch" Width="920" Height="560" UseLayoutRounding="True" SnapsToDevicePixels="True" RenderOptions.BitmapScalingMode="LowQuality">
      <!-- Base cyberpunk gradient backdrop (substitute Vue landscapeBanner.jpg)
           rocket-aurora 3 radial-gradient(css) = 3 Ellipse RadialGradient blur 90px:
             (1) cyan 22d3ee @28% closest-side 22% 50%
             (2) violet a855f7 @30% closest-side 76% 42%
             (3) blue 3b82f6 @26% closest-side 50% 86% -->
      <Grid>
        <Grid.Background>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,1">
            <GradientStop Color="#0a0f1e" Offset="0"/>
            <GradientStop Color="#061428" Offset="0.42"/>
            <GradientStop Color="#082f49" Offset="0.7"/>
            <GradientStop Color="#0c4a6e" Offset="1"/>
          </LinearGradientBrush>
        </Grid.Background>
        <Grid.RenderTransform>
          <ScaleTransform x:Name="ArtScale" CenterX="0.5" CenterY="0.5" ScaleX="1.08" ScaleY="1.08"/>
        </Grid.RenderTransform>
      </Grid>

      <!-- Rocket-Aurora 3 orbs (blur 90px) -->
      <Canvas IsHitTestVisible="False">
        <!-- Cyan orb (22d3ee 28% closest-side at 22% 50% → X=-180 Y=160 R=340 -->
        <Ellipse Canvas.Left="-180" Canvas.Top="160" Width="500" Height="500">
          <Ellipse.Fill>
            <RadialGradientBrush>
              <GradientStop Color="#4722d3ee" Offset="0"/>
              <GradientStop Color="#0022d3ee" Offset="0.62"/>
            </RadialGradientBrush>
          </Ellipse.Fill>
          <Ellipse.Effect><BlurEffect Radius="90" KernelType="Gaussian" RenderingBias="Performance"/></Ellipse.Effect>
        </Ellipse>
        <!-- Violet orb (a855f7 30% closest-side at 76% 42% → X=560 Y=100 R=400 -->
        <Ellipse Canvas.Left="560" Canvas.Top="100" Width="560" Height="560">
          <Ellipse.Fill>
            <RadialGradientBrush>
              <GradientStop Color="#4da855f7" Offset="0"/>
              <GradientStop Color="#00a855f7" Offset="0.62"/>
            </RadialGradientBrush>
          </Ellipse.Fill>
          <Ellipse.Effect><BlurEffect Radius="90" KernelType="Gaussian" RenderingBias="Performance"/></Ellipse.Effect>
        </Ellipse>
        <!-- Blue orb (3b82f6 26% closest-side at 50% 86% → X=230 Y=350 R=460 -->
        <Ellipse Canvas.Left="230" Canvas.Top="350" Width="460" Height="460">
          <Ellipse.Fill>
            <RadialGradientBrush>
              <GradientStop Color="#423b82f6" Offset="0"/>
              <GradientStop Color="#003b82f6" Offset="0.66"/>
            </RadialGradientBrush>
          </Ellipse.Fill>
          <Ellipse.Effect><BlurEffect Radius="90" KernelType="Gaussian" RenderingBias="Performance"/></Ellipse.Effect>
        </Ellipse>
      </Canvas>

      <!-- Accent particle dots floating background -->
      <Canvas Opacity="0.85" IsHitTestVisible="False">
        <Ellipse Canvas.Left="140" Canvas.Top="170" Width="2.2" Height="2.2" Fill="#ffffff" Opacity="0.7"/>
        <Ellipse Canvas.Left="750" Canvas.Top="120" Width="1.7" Height="1.7" Fill="#00c2ff" Opacity="0.7"/>
        <Ellipse Canvas.Left="410" Canvas.Top="440" Width="1.6" Height="1.6" Fill="#ffffff" Opacity="0.55"/>
        <Ellipse Canvas.Left="620" Canvas.Top="360" Width="2.2" Height="2.2" Fill="#1677ff" Opacity="0.65"/>
        <Ellipse Canvas.Left="280" Canvas.Top="500" Width="1.6" Height="1.6" Fill="#ffffff" Opacity="0.6"/>
        <Ellipse Canvas.Left="830" Canvas.Top="460" Width="2" Height="2" Fill="#00c2ff" Opacity="0.6"/>
      </Canvas>

      <!-- .activation-art-scrim L→R 96%→22% black gradient + T→B 20%→55% black
           (Vue CSS linear-gradient(90deg, 0.96 at 0%, 0.78 at 38%, 0.22 at 72%, 0.45 at 100%)
                    linear-gradient(180deg, 0.2 → 0.55 black) -->
      <Rectangle>
        <Rectangle.Fill>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
            <GradientStop Color="#F507070a" Offset="0"/>
            <GradientStop Color="#C707070a" Offset="0.38"/>
            <GradientStop Color="#3807070a" Offset="0.72"/>
            <GradientStop Color="#7307070a" Offset="1"/>
          </LinearGradientBrush>
        </Rectangle.Fill>
      </Rectangle>
      <Rectangle>
        <Rectangle.Fill>
          <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">
            <GradientStop Color="#3307070a" Offset="0"/>
            <GradientStop Color="#8C07070a" Offset="1"/>
          </LinearGradientBrush>
        </Rectangle.Fill>
      </Rectangle>

      <!-- vignette cyan top-right / blue bottom-left (soft glow overlay) -->
      <Rectangle IsHitTestVisible="False">
        <Rectangle.Fill>
          <RadialGradientBrush Center="0.7,0.28" GradientOrigin="0.7,0.28" RadiusX="0.6" RadiusY="0.5">
            <GradientStop Color="#2E00c2ff" Offset="0"/>
            <GradientStop Color="#0000c2ff" Offset="0.65"/>
          </RadialGradientBrush>
        </Rectangle.Fill>
      </Rectangle>

      <!-- .activation-art-copy: brand + unlock rig (NO meta pills)
           absolute position right:36, bottom:40, max-width:42ch, W420
           DAWA 132px wide logo → TextBlock 44px 900
           h1: Unlock the rig — 44px 800 line-height 1.08
           p: Kích hoạt xong... — 14px max-width 36ch color #d4d4d8 line-height 1.5 -->
      <StackPanel HorizontalAlignment="Right" VerticalAlignment="Bottom" Margin="0,0,36,40" Width="420">
        <TextBlock FontFamily="Segoe UI, Inter" FontWeight="900" Foreground="#ffffff"
                   FontSize="44" Margin="0,0,0,14">DAWA</TextBlock>
        <TextBlock FontFamily="Segoe UI, Inter" FontWeight="800" Foreground="#ffffff"
                   FontSize="44" LineHeight="1.08" TextWrapping="Wrap">Unlock the rig</TextBlock>
        <TextBlock Foreground="#d4d4d8" FontSize="14" LineHeight="1.5"
                   TextWrapping="Wrap" Margin="0,10,0,0" Width="380">Kích hoạt xong mới vào khu tối ưu FPS. Key khóa theo máy này.</TextBlock>
      </StackPanel>
    </Grid>

    <!-- ============================================================
         2. activation-fx : grid 42x42px + scan CRT 3px repeat scanlines
            OpacityMask linear L→R mask black 0% → transparent 58%
            Vue mask-image: linear-gradient(90deg, #000 0%, transparent 58%)
         ============================================================ -->
    <Grid IsHitTestVisible="False">
      <Grid.OpacityMask>
        <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
          <GradientStop Color="#000000" Offset="0"/>
          <GradientStop Color="#000000" Offset="0.58"/>
          <GradientStop Color="#00000000" Offset="1"/>
        </LinearGradientBrush>
      </Grid.OpacityMask>
      <!-- 42x42 grid 1px white 3.5% opacity (rgba 255 0.035) -->
      <Grid.Background>
        <DrawingBrush Viewport="0,0,42,42" ViewportUnits="Absolute" TileMode="Tile" Opacity="0.2">
          <DrawingBrush.Drawing>
            <GeometryDrawing Brush="Transparent">
              <GeometryDrawing.Pen><Pen Brush="#ffffff" Thickness="1"/></GeometryDrawing.Pen>
              <GeometryDrawing.Geometry>
                <GeometryGroup>
                  <LineGeometry StartPoint="0,0" EndPoint="42,0"/>
                  <LineGeometry StartPoint="0,0" EndPoint="0,42"/>
                </GeometryGroup>
              </GeometryDrawing.Geometry>
            </GeometryDrawing>
          </DrawingBrush.Drawing>
        </DrawingBrush>
      </Grid.Background>
      <!-- Scanlines CRT 3px step 2-transparent-18% black opacity 0.35 -->
      <Rectangle Opacity="0.35">
        <Rectangle.Fill>
          <VisualBrush TileMode="Tile" Viewport="0,0,1,3" ViewportUnits="Absolute">
            <VisualBrush.Visual>
              <StackPanel>
                <Rectangle Height="2" Width="1" Fill="Transparent"/>
                <Rectangle Height="1" Width="1" Fill="#000000"/>
              </StackPanel>
            </VisualBrush.Visual>
          </VisualBrush>
        </Rectangle.Fill>
      </Rectangle>
    </Grid>

    <!-- ============================================================
         3. activation-panel FLOATING GLASS PANEL overlay bên trái
            V-center, W420 MARGIN L=36 CENTER-18 (calc(100%-36) max-width 420 padding 28|28|28|26
            clip-path: polygon(12px 0, 100% 0, 100% calc(100%-12px), calc(100%-12px) 100%, 0 100%, 0 12px)
            border 1 rgba(22,119,255,0.32) — background rgba(12,12,16,0.86)
            shadow 0 24 60 rgba(0,0,0,0.45)
         ============================================================ -->
    <Border x:Name="PanelBorder"
            HorizontalAlignment="Left" VerticalAlignment="Center"
            Margin="36,0,0,0" Width="420" Padding="28,28,28,26"
            Background="#DB0c0c10"
            BorderBrush="#521677ff" BorderThickness="1"
            SnapsToDevicePixels="True" ClipToBounds="True">
      <Border.Clip>
        <PathGeometry>
          <PathGeometry.Figures>
            <PathFigure StartPoint="12,0" IsClosed="True" IsFilled="True">
              <LineSegment Point="420,0"/>
              <LineSegment Point="420,488"/>
              <LineSegment Point="408,500"/>
              <LineSegment Point="0,500"/>
              <LineSegment Point="0,12"/>
            </PathFigure>
          </PathGeometry.Figures>
        </PathGeometry>
      </Border.Clip>
      <Border.Effect>
        <DropShadowEffect Color="#000000" BlurRadius="60" ShadowDepth="20" Opacity="0.5"/>
      </Border.Effect>

      <Grid>
        <!-- activation-scanline: horizontal sweep 8%-8% margin (activation panel top-of-glass overlay) -->
        <Canvas IsHitTestVisible="False">
          <Line x:Name="ScanLine" X1="33.6" X2="386.4" Y1="1" Y2="1" StrokeThickness="2" StrokeEndLineCap="Round" StrokeStartLineCap="Round">
            <Line.Stroke>
              <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
                <GradientStop Color="#0000c2ff" Offset="0"/>
                <GradientStop Color="#0000c2ff" Offset="0.1"/>
                <GradientStop Color="#8000c2ff" Offset="0.5"/>
                <GradientStop Color="#0000c2ff" Offset="0.9"/>
                <GradientStop Color="#0000c2ff" Offset="1"/>
              </LinearGradientBrush>
            </Line.Stroke>
            <Line.Effect><DropShadowEffect Color="#00c2ff" BlurRadius="10" ShadowDepth="0" Opacity="0.5"/></Line.Effect>
          </Line>
        </Canvas>

        <!-- Corner markers TL/BR (Vue ::before/::after 16x16 2px accent) -->
        <Canvas IsHitTestVisible="False">
          <Line X1="0" Y1="0" X2="16" Y2="0" Stroke="#1677ff" StrokeThickness="2"/>
          <Line X1="0" Y1="0" X2="0" Y2="16" Stroke="#1677ff" StrokeThickness="2"/>
          <Line X1="404" Y1="500" X2="420" Y2="500" Stroke="#22d3ee" StrokeThickness="2"/>
          <Line X1="420" Y1="484" X2="420" Y2="500" Stroke="#22d3ee" StrokeThickness="2"/>
        </Canvas>

        <!-- Inner form layout. Activation spec:
             Margin 28,28,28,26 — already Border.Padding -->
        <Grid>
        <Grid.RowDefinitions>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- activation-mark 40x40 FLAT SQUARE corners (match Vue)
             background accent-primary-ghost rgba(22,119,255,0.14)
             border rgba(22,119,255,0.28) color accent-primary: #1677ff
             ShieldCheck icon (22px stroke 2): default mark state ShieldCheck stroke=#1677ff (Vue line 181 ShieldCheck) -->
        <Grid Grid.Row="0" HorizontalAlignment="Left" Width="40" Height="40">
          <Border x:Name="MarkBorder" BorderBrush="#471677ff" BorderThickness="1" Background="#241677ff" CornerRadius="0"/>
          <Viewbox Width="22" Height="22" Stretch="Uniform" Margin="9">
            <Grid>
              <Path x:Name="ShieldPath" Stroke="#1677ff" StrokeThickness="2" Fill="Transparent"
                    StrokeStartLineCap="Round" StrokeEndLineCap="Round" StrokeLineJoin="Round"
                    Data="M12 2 L21 5 V11 C21 16 17 21 12 22 C7 21 3 16 3 11 V5 L12 2 Z"/>
              <Path x:Name="ShieldCheck" Stroke="#1677ff" StrokeThickness="2.4" StrokeStartLineCap="Round" StrokeEndLineCap="Round"
                    Data="M7.5 12 L11 15.5 L16.5 9" Visibility="Visible" Fill="Transparent"/>
              <Path x:Name="ShieldAlert" Stroke="#ef4444" StrokeThickness="2.4" StrokeStartLineCap="Round" StrokeEndLineCap="Round"
                    Data="M12 8 L12 14 M12 17 L12 17.01" Visibility="Collapsed" Fill="Transparent"/>
            </Grid>
          </Viewbox>
        </Grid>

        <!-- H2 "Kích hoạt bản quyền": FontSize 24 800 #fff, margin 0 16 0 0 vs Mark above (16px below mark) -->
        <TextBlock Grid.Row="1" FontSize="24" FontWeight="800" Foreground="#ffffff" Margin="0,16,0,0" FontFamily="Segoe UI, Inter">Kích hoạt bản quyền</TextBlock>

        <!-- p.activation-lead 13px #a1a1aa line-height 1.55 (21px 21.08
             margin 8 0 18 — 8px below h2, 18px below text -->
        <TextBlock Grid.Row="2" Foreground="#a1a1aa" FontSize="13" LineHeight="21" Margin="0,8,0,18" TextWrapping="Wrap">Nhập key để mở DAWA Optimizer trên thiết bị đã đăng ký.</TextBlock>

        <!-- activation-device block: status dot + MACHINE ID block
             specs
             .activation-device-status: TextBlock (no wrap layout)
               .activation-device-dot circle 8px,
               text fingerprint-ready → fill=#22d3ee (cyan accent)
               text = fingerprint exists → "Thiết bị đã khóa với app
             .activation-device-specs dl: <dt>MACHINE ID<dd>…</dd> -->
        <Grid Grid.Row="3">
          <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
          </Grid.RowDefinitions>
          <StackPanel Grid.Row="0" Orientation="Horizontal">
            <Ellipse x:Name="DeviceReadyDot" Width="8" Height="8" VerticalAlignment="Center" Margin="0,0,8,0" Fill="#22d3ee"/>
            <TextBlock Foreground="#a1a1aa" FontSize="12" VerticalAlignment="Center">Thiết bị đã khóa với app</TextBlock>
          </StackPanel>
          <StackPanel Grid.Row="1" Orientation="Horizontal" Margin="0,10,0,0">
            <TextBlock Foreground="#737373" FontSize="10" FontWeight="700" VerticalAlignment="Center" Margin="0,0,10,0">MACHINE ID</TextBlock>
            <TextBlock x:Name="FingerprintText" FontFamily="Consolas" Foreground="#00c2ff" FontSize="12" VerticalAlignment="Center" Text="$displayFingerprint"/>
          </StackPanel>
        </Grid>

        <!-- key-field-heading label left / count right
             margin top = 22 below device block → Grid.Row="4" Margin="0,22,0,9"
             label = "Mã key kích hoạt" (MÃ — Vue: label.field-label 11px mono font-weight 600 LS 0.4px color:#737373 (text-dim)
             key-field-count: 10px mono #737373 LS 0.5px → format len/14 -->
        <Grid Grid.Row="4" Margin="0,22,0,9">
          <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
            <ColumnDefinition Width="Auto"/>
          </Grid.ColumnDefinitions>
          <TextBlock Grid.Column="0" Foreground="#737373" FontFamily="Consolas" FontSize="11" FontWeight="600">MÃ KEY KÍCH HOẠT</TextBlock>
          <TextBlock Grid.Column="1" x:Name="KeyCounter" Foreground="#737373" FontFamily="Consolas" FontSize="10" Text="0/14"/>
        </Grid>

        <!-- key-input-wrap 56px H R10 prefix KEY divider field icon -->
        <Grid Grid.Row="5" x:Name="KeyWrap">
          <Border x:Name="KeyBorder" CornerRadius="10" BorderBrush="#2a2a36" BorderThickness="1" Padding="0">
            <Border.Background>
              <!-- key-input-field 135deg diagonal gradient -->
              <LinearGradientBrush StartPoint="0,0" EndPoint="1,1">
                <GradientStop Color="#FA0f1117" Offset="0"/>
                <GradientStop Color="#FA08090d" Offset="1"/>
              </LinearGradientBrush>
            </Border.Background>
            <Grid Height="56">
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="52"/>
                <ColumnDefinition Width="1"/>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="44"/>
              </Grid.ColumnDefinitions>
              <TextBlock Grid.Column="0" Foreground="#1677ff" FontFamily="Consolas" FontSize="11" FontWeight="700" VerticalAlignment="Center" HorizontalAlignment="Center">KEY</TextBlock>
              <Rectangle Grid.Column="1" Fill="#2a2a36" Width="1" Height="22" VerticalAlignment="Center"/>
              <TextBox Grid.Column="2" x:Name="LicenseEdit" FontFamily="Consolas" FontSize="16" FontWeight="700"
                       Background="Transparent" Foreground="#ffffff" BorderThickness="0" Padding="16,0,4,0"
                       VerticalContentAlignment="Center" CaretBrush="#1677ff"
                       VerticalAlignment="Stretch" HorizontalContentAlignment="Stretch"
                       SpellCheck.IsEnabled="False" AutoWordSelection="False"/>
              <TextBlock Grid.Column="3" Foreground="#737373" FontSize="15" VerticalAlignment="Center" HorizontalAlignment="Center" Margin="0,0,14,0">🗝</TextBlock>
            </Grid>
          </Border>
        </Grid>

        <!-- form-alert error ok -->
        <Border Grid.Row="6" x:Name="FormAlert" Visibility="Collapsed" CornerRadius="8" Padding="12,10" Margin="0,12,0,0" BorderThickness="1">
          <TextBlock x:Name="FormAlertText" FontSize="13" TextWrapping="Wrap" Foreground="#a1a1aa"/>
        </Border>

        <!-- Submit gradient button 1677ff to 3990ff to 00c2ff -->
        <Grid Grid.Row="7" Margin="0,16,0,0">
          <Button x:Name="SubmitBtn" Height="50"
                  Foreground="#ffffff" FontWeight="700" FontSize="14"
                  BorderThickness="0" Cursor="Hand"
                  Template="{StaticResource AccentButtonTemplate}">
            <Button.Background>
              <LinearGradientBrush StartPoint="0,0.5" EndPoint="1,0.5">
                <GradientStop Color="#1677ff" Offset="0"/>
                <GradientStop Color="#3990ff" Offset="0.42"/>
                <GradientStop Color="#00c2ff" Offset="1"/>
              </LinearGradientBrush>
            </Button.Background>
            <Button.Effect>
              <DropShadowEffect Color="#1677ff" BlurRadius="14" ShadowDepth="0" Opacity="0.45"/>
            </Button.Effect>
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
              <TextBlock x:Name="SubmitIcon" VerticalAlignment="Center" FontSize="14" Margin="0,0,8,0">🔑</TextBlock>
              <TextBlock x:Name="SubmitText" VerticalAlignment="Center">Kích hoạt</TextBlock>
            </StackPanel>
          </Button>
        </Grid>
        </Grid>
      </Grid>
    </Border>
  </Grid>
</Window>
"@
  
  [xml]$gateXmlDoc = $xamlClean
  $xmlReader = New-Object System.Xml.XmlNodeReader $gateXmlDoc
  $script:window = [Windows.Markup.XamlReader]::Load($xmlReader)
  if (-not $script:window) { throw 'XamlReader.Load returned $null — invalid XAML document.' }
  $xmlReader.Close()
  
  if (-not [string]::IsNullOrWhiteSpace($GateIconPath) -and (Test-Path $GateIconPath)) {
    try {
      $iconFs = [System.IO.File]::OpenRead($GateIconPath)
      $iconFrame = [System.Windows.Media.Imaging.BitmapFrame]::Create($iconFs, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
      $iconFs.Dispose()
      $script:window.Icon = $iconFrame
    } catch { <# icon load best-effort — fall back to PS default if corrupt/missing #> }
  }

  $script:window.Dispatcher.Add_UnhandledException({
    param($s, $e)
    try {
      $inner = $e.Exception
      $st = ''
      try { $st = $inner.InnerException.ErrorRecord.ScriptStackTrace } catch {}
      Write-GateFatalError ("GATE-HANDLER-EX: " + $inner.ToString() + "`r`n" + $st)
    } catch {}
    $e.Handled = $true
  })
  
  $script:LicenseEdit = $script:window.FindName('LicenseEdit')
  if (-not $script:LicenseEdit) { throw "Required WPF control FindName('LicenseEdit') returned `$null (missing x:Name in XAML)." }
  $script:SubmitBtn = $script:window.FindName('SubmitBtn')
  if (-not $script:SubmitBtn) { throw "Required WPF control FindName('SubmitBtn') returned `$null (missing x:Name in XAML)." }
  $script:SubmitText = $script:window.FindName('SubmitText')
  if (-not $script:SubmitText) { throw "Required WPF control FindName('SubmitText') returned `$null (missing x:Name in XAML)." }
  $script:SubmitIcon = $script:window.FindName('SubmitIcon')
  if (-not $script:SubmitIcon) { throw "Required WPF control FindName('SubmitIcon') returned `$null (missing x:Name in XAML)." }
  $script:KeyCounter = $script:window.FindName('KeyCounter')
  if (-not $script:KeyCounter) { throw "Required WPF control FindName('KeyCounter') returned `$null (missing x:Name in XAML)." }
  $script:KeyBorder = $script:window.FindName('KeyBorder')
  if (-not $script:KeyBorder) { throw "Required WPF control FindName('KeyBorder') returned `$null (missing x:Name in XAML)." }
  $script:FormAlert = $script:window.FindName('FormAlert')
  if (-not $script:FormAlert) { throw "Required WPF control FindName('FormAlert') returned `$null (missing x:Name in XAML)." }
  $script:FormAlertText = $script:window.FindName('FormAlertText')
  if (-not $script:FormAlertText) { throw "Required WPF control FindName('FormAlertText') returned `$null (missing x:Name in XAML)." }
  $script:FingerprintText = $script:window.FindName('FingerprintText')
  if (-not $script:FingerprintText) { throw "Required WPF control FindName('FingerprintText') returned `$null (missing x:Name in XAML)." }
  $script:PanelBorder = $script:window.FindName('PanelBorder')
  if (-not $script:PanelBorder) { throw "Required WPF control FindName('PanelBorder') returned `$null (missing x:Name in XAML)." }
  $script:ShieldPath = $script:window.FindName('ShieldPath')
  if (-not $script:ShieldPath) { throw "Required WPF control FindName('ShieldPath') returned `$null (missing x:Name in XAML)." }
  $script:ShieldCheck = $script:window.FindName('ShieldCheck')
  if (-not $script:ShieldCheck) { throw "Required WPF control FindName('ShieldCheck') returned `$null (missing x:Name in XAML)." }
  $script:ShieldAlert = $script:window.FindName('ShieldAlert')
  if (-not $script:ShieldAlert) { throw "Required WPF control FindName('ShieldAlert') returned `$null (missing x:Name in XAML)." }
  $script:MarkBorder = $script:window.FindName('MarkBorder')
  if (-not $script:MarkBorder) { throw "Required WPF control FindName('MarkBorder') returned `$null (missing x:Name in XAML)." }
  $script:DeviceReadyDot = $script:window.FindName('DeviceReadyDot')
  if (-not $script:DeviceReadyDot) { throw "Required WPF control FindName('DeviceReadyDot') returned `$null (missing x:Name in XAML)." }
  
  $script:Validated = $false
  $script:GlobalResult = $null
  $script:Busy = $false
  
  function Set-MarkState {
    param([ValidateSet('default','success','error')][string]$State)
    switch ($State) {
      'default' {
        $script:MarkBorder.BorderBrush = $script:brushConv.ConvertFromString('#1677ff47')
        $script:ShieldPath.Stroke    = $script:brushConv.ConvertFromString('#22d3ee')
        $script:ShieldCheck.Visibility = [System.Windows.Visibility]::Visible
        $script:ShieldCheck.Stroke   = $script:brushConv.ConvertFromString('#22d3ee')
        $script:ShieldAlert.Visibility = [System.Windows.Visibility]::Collapsed
      }
      'success' {
        $script:MarkBorder.BorderBrush = $script:brushConv.ConvertFromString('#10b9813d')
        $script:ShieldPath.Stroke    = $script:brushConv.ConvertFromString('#10b981')
        $script:ShieldCheck.Visibility = [System.Windows.Visibility]::Visible
        $script:ShieldCheck.Stroke   = $script:brushConv.ConvertFromString('#10b981')
        $script:ShieldAlert.Visibility = [System.Windows.Visibility]::Collapsed
      }
      'error' {
        $script:MarkBorder.BorderBrush = $script:brushConv.ConvertFromString('#ef444440')
        $script:ShieldPath.Stroke    = $script:brushConv.ConvertFromString('#ef4444')
        $script:ShieldCheck.Visibility = [System.Windows.Visibility]::Collapsed
        $script:ShieldAlert.Visibility = [System.Windows.Visibility]::Visible
      }
    }
  }
  
  function Set-KeyBorderState {
    param([ValidateSet('default','success','error')][string]$State)
    switch ($State) {
      'default' { $script:KeyBorder.BorderBrush = $script:brushConv.ConvertFromString('#27272a') }
      'success' { $script:KeyBorder.BorderBrush = $script:brushConv.ConvertFromString('#10b981') }
      'error'   { $script:KeyBorder.BorderBrush = $script:brushConv.ConvertFromString('#ef4444') }
    }
  }
  
  function Show-Alert {
    param(
      [Parameter(Mandatory)][ValidateSet('error','ok')][string]$Kind,
      [Parameter(Mandatory)][string]$Message
    )
    if ($Kind -eq 'error') {
      $script:FormAlert.BorderBrush = $script:brushConv.ConvertFromString('#dc262666')
      $script:FormAlert.Background  = $script:brushConv.ConvertFromString('#dc262626')
      $script:FormAlertText.Foreground = $script:brushConv.ConvertFromString('#fca5a5')
    } else {
      $script:FormAlert.BorderBrush = $script:brushConv.ConvertFromString('#10b98166')
      $script:FormAlert.Background  = $script:brushConv.ConvertFromString('#10b98126')
      $script:FormAlertText.Foreground = $script:brushConv.ConvertFromString('#6ee7b7')
    }
    $script:FormAlertText.Text = $Message
    $script:FormAlert.Visibility = [System.Windows.Visibility]::Visible
  }
  function Hide-Alert { $script:FormAlert.Visibility = [System.Windows.Visibility]::Collapsed }
  
  function Format-KeyInput {
    param([string]$Raw)
    $compact = ($Raw -replace '[^A-Za-z0-9]','').ToUpper()
    if ($compact.Length -gt 12) { $compact = $compact.Substring(0,12) }
    $parts = [regex]::Matches($compact, '.{1,4}') | ForEach-Object { $_.Value }
    return ($parts -join '-')
  }

  function Format-Fingerprint {
  param([string]$Hash)
  if ([string]::IsNullOrWhiteSpace($Hash) -or $Hash.Length -lt 16) { return $Hash }
  return ($Hash.Substring(0,8).ToUpper() + '-' + $Hash.Substring($Hash.Length - 8).ToUpper())
  }
  
  # Populate device info + trigger dot green ready (placeholder till HWID ready)
  $script:FingerprintText.Text = $script:displayFingerprint
  if ($script:PanelBorder) { $script:PanelBorder.Tag = 'ready' }
  Set-MarkState 'default'
  Set-KeyBorderState 'default'
  Hide-Alert
  
  $TYPING_FRAMES = @(
    'XXXX-XXXX-XXXX',
    'DXXX-XXXX-XXXX',
    'DAXX-XXXX-XXXX',
    'DAWX-XXXX-XXXX',
    'DAWA-XXXX-XXXX',
    'DAWA-SXXX-XXXX',
    'DAWA-SEXX-XXXX',
    'DAWA-SECX-XXXX',
    'DAWA-SECR-XXXX',
    'DAWA-SECRET-KEY'
  )
  $script:TypingIndex = 0
  $script:TypingActive = $true
  $script:LicenseEdit.Foreground = $script:brushConv.ConvertFromString('#52525b')
  $script:LicenseEdit.Text = $TYPING_FRAMES[0]
  
  $script:TypingTimer = New-Object System.Windows.Threading.DispatcherTimer
  $script:TypingTimer.Interval = [TimeSpan]::FromMilliseconds(720)
  $script:TypingTimer.Add_Tick({
    $script:TypingIndex = ($script:TypingIndex + 1)
    if ($script:TypingIndex -ge $TYPING_FRAMES.Length) {
      Stop-TypingCycle
      $script:LicenseEdit.Text = $TYPING_FRAMES[$TYPING_FRAMES.Length - 1]
      return
    }
    if ($script:TypingActive) { $script:LicenseEdit.Text = $TYPING_FRAMES[$script:TypingIndex] }
  })
  $script:TypingTimer.Start()
  
  function Stop-TypingCycle {
    if ($script:TypingTimer) {
      $script:TypingTimer.Stop()
      $script:TypingTimer = $null
    }
    $script:TypingActive = $false
  }
  
  $script:LicenseEdit.Add_GotFocus({
    if ($script:TypingActive) {
      Stop-TypingCycle
      $script:LicenseEdit.Text = ''
      $script:LicenseEdit.Foreground = $script:brushConv.ConvertFromString('#ffffff')
    }
  })
  
  $script:LicenseEdit.Add_TextChanged({
    $caret = $script:LicenseEdit.CaretIndex
    $formatted = Format-KeyInput $script:LicenseEdit.Text
    if ($script:TypingActive -or $script:LicenseEdit.Text -cne $formatted) {
      if (-not $script:TypingActive) {
        $script:LicenseEdit.Text = $formatted
        $script:LicenseEdit.CaretIndex = [Math]::Min($caret + 1, $formatted.Length)
      }
    }
    if ($script:TypingActive) {
      $script:KeyCounter.Text = '0/14'
    } else {
      $script:KeyCounter.Text = "$($formatted.Replace('-','').Length)/14"
    }
    Hide-Alert
    Set-KeyBorderState 'default'
    Set-MarkState 'default'
  })
  
  $script:Busy = $false
  
  function Set-Busy {
    param([bool]$State)
    $script:Busy = $State
    $script:SubmitBtn.IsEnabled = -not $State
    $script:LicenseEdit.IsEnabled = -not $State
    if ($State) {
      $script:SubmitText.Text = 'Đang xác thực...'
      $script:SubmitIcon.Text = '⏳'
    } else {
      $script:SubmitText.Text = 'Kích hoạt'
      $script:SubmitIcon.Text = '🔑'
    }
  }

  $script:SubmitBtn.Add_Click({
    if ($script:Busy -or $script:Validated) { return }
    if ($script:TypingActive) {
      Stop-TypingCycle
      $script:LicenseEdit.Text = ''
      $script:LicenseEdit.Foreground = $script:brushConv.ConvertFromString('#ffffff')
      $script:LicenseEdit.Focus() | Out-Null
      Show-Alert 'error' 'Vui lòng nhập mã key kích hoạt.'
      Set-MarkState 'error'
      Set-KeyBorderState 'error'
      return
    }
    $__keyText = [string]$script:LicenseEdit.Text
    $__keyClean = $__keyText -replace '[^A-Za-z0-9]',''
    $keyRaw = $__keyClean.ToUpper()
    if ($keyRaw.Length -lt 8) {
      Show-Alert 'error' 'Vui lòng nhập mã key kích hoạt.'
      Set-MarkState 'error'
      Set-KeyBorderState 'error'
      return
    }
    $keyFormatted = Format-KeyInput $keyRaw
    $script:LicenseEdit.Text = $keyFormatted
    Hide-Alert
    Set-MarkState 'default'
    Set-KeyBorderState 'default'
    Set-Busy $true
    $script:window.Dispatcher.Invoke([action]{}, [System.Windows.Threading.DispatcherPriority]::Render)

    if ($script:hwid -eq $placeholderHwid) {
  try { $script:hwid = Get-HardwareHash } catch {}
  }

    $bodyObj = @{
      key_code    = $keyFormatted
      device_hash = $script:hwid
      hardware_id = $script:hwid
      hwid        = $script:hwid
      device_name = $hostnameCanonical   # lowercase invariant = exact match Node.js
      os_info     = $osInfo
    }
    $bodyJson = $bodyObj | ConvertTo-Json -Depth 4

    $resp = $null
    $offline = $false
    $msg = ''
    $tryCb = {
      param($att,$max,$delayMs,$ex)
      $winDisp = $script:window.Dispatcher
      if (-not $winDisp) { return }
      try {
        $winDisp.Invoke([action]{
          try {
            $sec = [int][Math]::Ceiling($delayMs / 1000)
            $msgRetry = "Server đang khởi động (lần $att/$max) — chờ $sec giây..."
            $script:FormAlert.Visibility = [System.Windows.Visibility]::Visible
            $script:FormAlert.BorderBrush = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#661677ff')
            $script:FormAlert.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#1a1677ff10')
            $script:FormAlertText.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString('#93c5fd')
            $script:FormAlertText.Text = $msgRetry
          } catch {}
        }, [System.Windows.Threading.DispatcherPriority]::Background) | Out-Null
      } catch {}
    }
    try {
      $resp = Invoke-BackendWithRetry -Uri $BackendUrl -Method Post -Body $bodyJson `
        -ContentType 'application/json; charset=utf-8' -TimeoutPerTrySec 25 -MaxAttempts 6 -OnRetry $tryCb
      $script:window.Dispatcher.Invoke([action]{ Hide-Alert }, [System.Windows.Threading.DispatcherPriority]::Background) | Out-Null
    } catch {
      $msg = $_.Exception.Message
      $offline = ($_.Exception -is [System.Net.WebException] -and
        ($_.Exception.Response -eq $null -or [int]$_.Exception.Response.StatusCode -ge 500))
      if (-not $offline) {
        try {
          $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
          $raw = $reader.ReadToEnd()
          $reader.Dispose()
          $parsed = $raw | ConvertFrom-Json
          $msg = [string]$parsed.message
        } catch { <# ignore #> }
      }
    }
  
    if ($resp -and [bool]$resp.valid) {
      $resultObj = @{
        success      = $true
        valid        = $true
        message      = [string]$resp.message
        isOffline    = $false
        keyCode      = [string]$keyFormatted
        deviceHash   = [string]$script:hwid
        accessToken  = [string]$resp.accessToken
        refreshToken = [string]$resp.refreshToken
        expiresAt    = [string]$resp.expiresAt
        activatedAt  = [string]$resp.activatedAt
        signature    = [string]$resp.signature
      }
      $script:Validated = $true
      $script:GlobalResult = $resultObj
  
      $tmpJson = Join-Path ([System.IO.Path]::GetTempPath()) ("dawa-license-" + [guid]::NewGuid().ToString('N') + '.json')
      [System.IO.File]::WriteAllText($tmpJson, ($resultObj | ConvertTo-Json -Depth 6 -Compress), [System.Text.Encoding]::UTF8)
  
      $sealOk = $false
      $sealErr = ''
      try {
        Invoke-LicenseSealInline -JsonPath $tmpJson -OutPath $SealedLicenseOutput
        if (Test-Path $SealedLicenseOutput) { $sealOk = $true } else { $sealErr = 'Output file missing after Invoke-LicenseSealInline' }
      } catch {
        $sealErr = $_.Exception.GetType().Name + ': ' + $_.Exception.Message
        if ($_.Exception.InnerException) { $sealErr += ' | Inner: ' + $_.Exception.InnerException.Message }
      }
      Remove-Item $tmpJson -Force -ErrorAction SilentlyContinue
  
      if (-not $sealOk) {
        $script:Validated = $false
        $script:GlobalResult = @{ success = $false; valid = $false; message = "Seal failed: $sealErr"; isOffline = $false }
        Show-Alert 'error' ("Lỗi hệ thống khi mã hóa license: $sealErr")
        Set-MarkState 'error'
        Set-Busy $false
        return
      }
  
      try {
        $regDir = Split-Path -Parent $RegFlagFile
        if (-not (Test-Path $regDir)) { New-Item -ItemType Directory -Path $regDir -Force | Out-Null }
        [System.IO.File]::WriteAllText($RegFlagFile, '1', [System.Text.Encoding]::ASCII)

        # HMAC-SHA256 registry seal - stores "1:YYYYMMDD:hmac64" instead of plain "1"
        # An attacker manually writing the registry cannot produce the correct HMAC
        # without knowing GATE_PEPPER, so "reg add ... /d 1" no longer bypasses the gate.
        $GATE_PEPPER = 'D4W4_INST4LL3R_G4T3_S3AL_2026_HMAC_K3Y'
        $installDateUtc = (Get-Date).ToUniversalTime().ToString('yyyyMMdd')
        $hmacMsgBytes = [System.Text.Encoding]::UTF8.GetBytes($GATE_PEPPER + '|' + $script:hwid + '|' + $installDateUtc)
        $hmacKeyBytes = [System.Text.Encoding]::UTF8.GetBytes($GATE_PEPPER)
        $hmacAlg = New-Object System.Security.Cryptography.HMACSHA256
        $hmacAlg.Key = $hmacKeyBytes
        $hmacSig = [BitConverter]::ToString($hmacAlg.ComputeHash($hmacMsgBytes)).Replace('-', '').ToLowerInvariant()
        $hmacAlg.Dispose()
        # Format: "1:YYYYMMDD:hmac64" - old app reads first char "1" -> still truthy
        $regValue = '1:' + $installDateUtc + ':' + $hmacSig

        if (-not (Test-Path 'HKCU:\Software\Dawa Optimizer')) { New-Item -Path 'HKCU:\Software\Dawa Optimizer' -Force | Out-Null }
        Set-ItemProperty -Path 'HKCU:\Software\Dawa Optimizer' -Name 'InstallerActivated' -Value $regValue -Type String -Force | Out-Null
        try {
          if (-not (Test-Path 'HKLM:\Software\Dawa Optimizer')) { New-Item -Path 'HKLM:\Software\Dawa Optimizer' -Force -ErrorAction Stop | Out-Null }
          Set-ItemProperty -Path 'HKLM:\Software\Dawa Optimizer' -Name 'InstallerActivated' -Value $regValue -Type String -Force -ErrorAction SilentlyContinue | Out-Null
        } catch { <# ignore HKLM permission #> }
        [System.IO.File]::WriteAllText($OutputJson, ($resultObj | ConvertTo-Json -Depth 6 -Compress), [System.Text.Encoding]::UTF8)
      } catch {
        $writeErr = $_.Exception.Message
        $script:Validated = $false
        Show-Alert 'error' "Lỗi lưu trạng thái kích hoạt: $writeErr"
        Set-MarkState 'error'
        Set-Busy $false
        return
      }
  
      Set-MarkState 'success'
      Set-KeyBorderState 'success'
      $okMsg = if ([string]::IsNullOrWhiteSpace("$($resultObj.message)")) { 'Kích hoạt bản quyền thành công.' } else { [string]$resultObj.message }
      Show-Alert 'ok' $okMsg
      $script:SubmitText.Text = 'Bạn đã kích hoạt ✓'
      $script:SubmitIcon.Text = '✅'
  
      # Auto-close after 0.8s (UX smooth, mirrors old Continue auto-close).
      # Leave SubmitBtn disabled & Cancel disabled during close countdown.
      $script:CloseTimer = New-Object System.Windows.Threading.DispatcherTimer
      $script:CloseTimer.Interval = [TimeSpan]::FromMilliseconds(800)
      $script:CloseTimer.Add_Tick({
        try { $script:CloseTimer.Stop() } catch {}
        $script:window.DialogResult = $true   # tự đóng cửa sổ modal, KHÔNG gọi Close() nữa
      })
      $script:CloseTimer.Start()
      return
    }
  
    # Validation failed path
    $failMsg = if ($offline) { 'Không thể kết nối đến máy chủ xác thực key. Kiểm tra kết nối mạng hoặc server backend.' } elseif ($msg) { $msg } else { 'Key không hợp lệ, đã hết hạn hoặc đã đạt giới hạn số thiết bị.' }
    $script:Validated = $false
    $script:GlobalResult = @{ success = $false; valid = $false; message = $failMsg; isOffline = [bool]$offline }
    try { [System.IO.File]::WriteAllText($OutputJson, ($script:GlobalResult | ConvertTo-Json -Depth 6 -Compress), [System.Text.Encoding]::UTF8) } catch {}
    Show-Alert 'error' $failMsg
    Set-MarkState 'error'
    Set-KeyBorderState 'error'
    Set-Busy $false
  })
  
  $script:window.Add_KeyDown({
    param($s, $e)
    if ($e.Key -eq 'Return' -and $script:SubmitBtn.IsEnabled -and -not $script:Validated) {
      $script:SubmitBtn.RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Primitives.ButtonBase]::ClickEvent))
    } elseif ($e.Key -eq 'Escape') {
      if ($script:Validated -ne $true) {
      $script:window.DialogResult = $false
      }
    }
  })
  
  # Focus key input after window loaded (smooth UX)
  # We use WPF native ShowActivated="True" + Topmost="True" +
  # Loaded Activate() to grab focus. Avoid Add-Type DllImport
  # pinvokes because CSharpCodeProvider temp compilation inside
  # NSIS elevated 64-bit sysnative PowerShell can hit cross-arch
  # TEMP reference corruption -> BadImageFormatException on the
  # generated System.dll metadata assembly.
  $script:window.Add_SourceInitialized({
    try {
      $null = New-Object System.Windows.Interop.WindowInteropHelper($script:window)
    } catch {}
  })
  $script:window.Add_Loaded({
    $script:window.Dispatcher.Invoke([action]{
      try { $script:window.Activate() | Out-Null } catch {}
      try { $script:window.Topmost = $true } catch {}
      try {
        $script:LicenseEdit.Focus() | Out-Null
        $script:LicenseEdit.Select($script:LicenseEdit.Text.Length, 0) | Out-Null
      } catch {}
    }, [System.Windows.Threading.DispatcherPriority]::Background) | Out-Null
    $script:window.Dispatcher.InvokeAsync([scriptblock]{
      try {
          $warmReq = [System.Net.WebRequest]::Create((Get-BackendBaseUrl $BackendUrl) + '/api/license/desktop/check')
          $warmReq.Timeout = 50000
          $null = $warmReq.GetResponseAsync()   # fire-and-forget, không chặn UI
      } catch {}
    }, [System.Windows.Threading.DispatcherPriority]::ApplicationIdle) | Out-Null
    # Async compute HWID (WMI/CIM can take 1-3s) AFTER window painted
    $script:window.Dispatcher.InvokeAsync([scriptblock]{
      try {
        $realHw = Get-HardwareHash -CanonicalHostname $hostnameCanonical -Arch $arch -OsRelease $osRelease
        if ($realHw -and "$realHw" -ne '') {
          $script:hwid = "$realHw"
          try { $script:FingerprintText.Text = Format-Fingerprint ("$realHw") } catch {}
          try { $script:DeviceReadyDot.Fill = $script:brushConv.ConvertFromString('#22c55e') } catch {}
        }
      } catch {}
    }, [System.Windows.Threading.DispatcherPriority]::Background) | Out-Null
  })

  $gateOuterOk = $true
} catch {
  $_ex = $_.Exception
  $_depth = 0
  $_msg = $_ex.Message
  while ($_ex.InnerException -and $_depth -lt 8) {
    $_ex = $_ex.InnerException
    $_msg = $_msg + ' | Inner' + $_depth + ': ' + $_ex.Message
    $_depth++
  }
  $_line = 0
  try { if ($_.InvocationInfo -and $_.InvocationInfo.ScriptLineNumber) { $_line = [int]$_.InvocationInfo.ScriptLineNumber } } catch {}
  if ($_ -is [System.Windows.Markup.XamlParseException]) {
    try { $_msg = $_msg + ' [XAML Line='+$_.Exception.LineNumber+' Pos='+$_.Exception.LinePosition+']' } catch {}
  }
  $_full = ('GATE-FATAL [line '+$_line+']: ' + $_msg)
  Write-GateFatalError $_full
  if ($script:window) { try { $script:window.Close() } catch {} }
  exit 1
}

if (-not $gateOuterOk) { exit 1 }

try {
  $ErrorActionPreference = 'Continue'
  if (-not $script:window) {
    Write-GateFatalError 'GATE-FATAL-SHOWDIALOG: window is null before ShowDialog (script scope leak or Xaml load failed)'
    exit 1
  }
  $result = $script:window.ShowDialog()
  if ($result -eq $true -and $script:Validated) { exit 0 } else { exit 1 }
} catch {
  $_ex2 = $_.Exception
  $_depth2 = 0
  $_msg2 = $_ex2.Message
  while ($_ex2.InnerException -and $_depth2 -lt 8) { $_ex2 = $_ex2.InnerException; $_msg2 = $_msg2 + ' | Inner' + $_depth2 + ': ' + $_ex2.Message; $_depth2++ }
  $_line2 = 0; try { if ($_.InvocationInfo) { $_line2 = [int]$_.InvocationInfo.ScriptLineNumber } } catch {}
  Write-GateFatalError ('GATE-FATAL-SHOWDIALOG [line '+$_line2+']: ' + $_msg2)
  exit 1
}
