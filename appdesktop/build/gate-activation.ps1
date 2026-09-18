param(
  [Parameter(Mandatory = $true)][string]$BackendUrl,
  [Parameter(Mandatory = $true)][string]$OutputJson,
  [Parameter(Mandatory = $true)][string]$SealedLicenseOutput,
  [Parameter(Mandatory = $true)][string]$RegFlagFile,
  [Parameter(Mandatory = $false)][string]$EncryptPs1Path = ''
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

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
function Seal-LicenseJsonInline {
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
# (kept as a sanity check / fallback log label; sealing now happens inline)
if ([string]::IsNullOrWhiteSpace($EncryptPs1Path)) {
  $EncryptPs1Path = Join-Path $PSScriptRoot 'encrypt-license.ps1'
}
$sealUtilName = if (Test-Path $EncryptPs1Path) { (Split-Path $EncryptPs1Path -Leaf) } else { 'AES-CBC (inline, equiv. encrypt-license.ps1)' }

$hwid = Get-HardwareHash
# ========================================================================
#  ARCH NORMALIZATION — byte-for-byte identical to Node.js os.arch() output.
#  Node os.arch() returns: 'x64' | 'arm64' | 'ia32'
#  PS [Environment]::Is64BitOperatingSystem only tells us x64-vs-x86.
#  We must distinguish ARM64 Windows manually via PROCESSOR_ARCHITECTURE env
#  var so users running DAWA on Surface ARM64 laptop report the SAME string
#  from both gate-activation.ps1 (installer) AND licenseService.js (app).
#  The Node.js side (src/main/services/licenseService.js validateWithBackend)
#  reports os.arch() directly; without this matching, server gets two
#  different device rows per install and HWID-bound license denies re-activ.
# ========================================================================
$procArch = if ("$env:PROCESSOR_ARCHITECTURE") { ("$env:PROCESSOR_ARCHITECTURE").ToLowerInvariant() } else { '' }
if ($procArch -eq 'arm64') { $arch = 'arm64' }
elseif ($procArch -eq 'amd64' -or $procArch -eq 'x64') { $arch = 'x64' }
elseif ([Environment]::Is64BitOperatingSystem) { $arch = 'x64' }
else { $arch = 'ia32' }
$osType = 'Windows_NT'
$osRelease = [Environment]::OSVersion.Version.Major.ToString() + '.' +
             [Environment]::OSVersion.Version.Minor.ToString() + '.' +
             [Environment]::OSVersion.Version.Build.ToString()
$osInfo = "$osType $osRelease ($arch)"
# HOSTNAME NORMALIZATION — TWO values:
#   $hostnameDisplay = original case (shown in UI pills / HostNamePill,
#                       matches what user sees in System Properties)
#   $hostnameCanonical = lowercase invariant (SENT to server device_name,
#                         byte-identical to Node.js os.hostname().toLowerCase())
# Server dedup logic compares raw strings — if we sent case-mixed hostname
# from one side and lowercase from the other, the backend would register
# TWO different devices for the same physical machine and deny HWID bind.
$hostnameDisplay = if ("$env:COMPUTERNAME") { "$env:COMPUTERNAME" } else { [System.Net.Dns]::GetHostName() }
$hostnameCanonical = $hostnameDisplay.ToLowerInvariant()
$displayFingerprint = if ($hwid.Length -ge 12) { $hwid.Substring(0, 8) + '…' + $hwid.Substring($hwid.Length - 4) } else { $hwid }

$brushConv = [System.Windows.Media.BrushConverter]::new()

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
      <Border x:Name="border" Background="{TemplateBinding Background}" CornerRadius="{TemplateBinding CornerRadius}" BorderThickness="{TemplateBinding BorderThickness}" BorderBrush="{TemplateBinding BorderBrush}" Padding="{TemplateBinding Padding}">
        <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center" TextBlock.Foreground="{TemplateBinding Foreground}" TextBlock.FontWeight="{TemplateBinding FontWeight}" TextBlock.FontSize="{TemplateBinding FontSize}" TextBlock.LetterSpacing="{TemplateBinding Tag}"/>
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
        <Trigger Property="IsPressed" Value="True">
          <Setter TargetName="border" Property="RenderTransform">
            <Setter.Value><TranslateTransform Y="1"/></Setter.Value>
          </Setter>
        </Trigger>
        <Trigger Property="IsEnabled" Value="False">
          <Setter TargetName="border" Property="Opacity" Value="0.55"/>
        </Trigger>
      </ControlTemplate.Triggers>
    </ControlTemplate>
    <ControlTemplate x:Key="GhostButtonTemplate" TargetType="Button">
      <Border x:Name="border" Background="{TemplateBinding Background}" CornerRadius="{TemplateBinding CornerRadius}" BorderThickness="{TemplateBinding BorderThickness}" BorderBrush="{TemplateBinding BorderBrush}" Padding="{TemplateBinding Padding}">
        <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center" TextBlock.Foreground="{TemplateBinding Foreground}" TextBlock.FontWeight="{TemplateBinding FontWeight}" TextBlock.FontSize="{TemplateBinding FontSize}"/>
      </Border>
      <ControlTemplate.Triggers>
        <Trigger Property="IsMouseOver" Value="True">
          <Setter TargetName="border" Property="Background"><Setter.Value><SolidColorBrush Color="#18181b"/></Setter.Value></Setter>
          <Setter TargetName="border" Property="BorderBrush"><Setter.Value><SolidColorBrush Color="#3f3f46"/></Setter.Value></Setter>
        </Trigger>
        <Trigger Property="IsEnabled" Value="False">
          <Setter TargetName="border" Property="Opacity" Value="0.5"/>
        </Trigger>
      </ControlTemplate.Triggers>
    </ControlTemplate>
  </Window.Resources>

  <!-- Root = activation-screen fullscreen container -->
  <Grid x:Name="Root" ClipToBounds="True">
    <!-- Animated floating orbs glow blur 90px background (.activation-screen::before / ::after) -->
    <Canvas IsHitTestVisible="False">
      <Ellipse Canvas.Left="-160" Canvas.Top="-200" Width="560" Height="560">
        <Ellipse.Fill>
          <RadialGradientBrush>
            <GradientStop Color="#1677ff" Offset="0" Opacity="0.58"/>
            <GradientStop Color="#1677ff" Offset="0.65" Opacity="0"/>
          </RadialGradientBrush>
        </Ellipse.Fill>
        <Ellipse.Effect><BlurEffect Radius="90" KernelType="Gaussian"/></Ellipse.Effect>
      </Ellipse>
      <Ellipse Canvas.Left="640" Canvas.Top="260" Width="640" Height="640">
        <Ellipse.Fill>
          <RadialGradientBrush>
            <GradientStop Color="#00c2ff" Offset="0" Opacity="0.45"/>
            <GradientStop Color="#00c2ff" Offset="0.62" Opacity="0"/>
          </RadialGradientBrush>
        </Ellipse.Fill>
        <Ellipse.Effect><BlurEffect Radius="90" KernelType="Gaussian"/></Ellipse.Effect>
      </Ellipse>
    </Canvas>

    <!-- activation-orbs particle dots radial -->
    <Canvas Opacity="0.85" IsHitTestVisible="False">
      <Ellipse Canvas.Left="140" Canvas.Top="170" Width="2.2" Height="2.2" Fill="#ffffff" Opacity="0.7"/>
      <Ellipse Canvas.Left="750" Canvas.Top="120" Width="1.7" Height="1.7" Fill="#00c2ff" Opacity="0.7"/>
      <Ellipse Canvas.Left="410" Canvas.Top="440" Width="1.6" Height="1.6" Fill="#ffffff" Opacity="0.55"/>
      <Ellipse Canvas.Left="620" Canvas.Top="360" Width="2.2" Height="2.2" Fill="#1677ff" Opacity="0.65"/>
      <Ellipse Canvas.Left="280" Canvas.Top="500" Width="1.6" Height="1.6" Fill="#ffffff" Opacity="0.6"/>
      <Ellipse Canvas.Left="830" Canvas.Top="460" Width="2" Height="2" Fill="#00c2ff" Opacity="0.6"/>
    </Canvas>

    <!-- activation-fx: 42x42 grid + scanlines CRT mask 58% -->
    <Grid Opacity="1" IsHitTestVisible="False">
      <Grid.OpacityMask>
        <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
          <GradientStop Color="#000" Offset="0"/>
          <GradientStop Color="#000" Offset="0.58" Opacity="1"/>
          <GradientStop Color="#000" Offset="1" Opacity="0"/>
        </LinearGradientBrush>
      </Grid.OpacityMask>
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

    <!-- =========================================================
         .activation-art = banner left + image + scrim + copy
         ========================================================= -->
    <Grid x:Name="ArtCol" HorizontalAlignment="Left" Width="440" ClipToBounds="True">
      <!-- Banner background (cyberpunk landscape image substitute: aurora gradient + vignette) -->
      <Grid>
        <Grid.Background>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,1">
            <GradientStop Color="#0f172a" Offset="0"/>
            <GradientStop Color="#1e3a8a" Offset="0.42"/>
            <GradientStop Color="#0369a1" Offset="0.78"/>
            <GradientStop Color="#082f49" Offset="1"/>
          </LinearGradientBrush>
        </Grid.Background>
        <!-- Ken Burns slow zoom transform scale(1.06) → scale(1.12) infinite alternate -->
        <Grid.RenderTransform>
          <ScaleTransform x:Name="ArtScale" CenterX="0.5" CenterY="0.5" ScaleX="1.08" ScaleY="1.08"/>
        </Grid.RenderTransform>
        <!-- Radial vignette glow cyan top-right / blue mid -->
        <Canvas>
          <Ellipse Canvas.Left="260" Canvas.Top="-30" Width="360" Height="240">
            <Ellipse.Fill>
              <RadialGradientBrush>
                <GradientStop Color="#00c2ff" Offset="0" Opacity="0.45"/>
                <GradientStop Color="#00c2ff" Offset="0.6" Opacity="0"/>
              </RadialGradientBrush>
            </Ellipse.Fill>
          </Ellipse>
          <Ellipse Canvas.Left="-60" Canvas.Top="300" Width="320" Height="280">
            <Ellipse.Fill>
              <RadialGradientBrush>
                <GradientStop Color="#1677ff" Offset="0" Opacity="0.4"/>
                <GradientStop Color="#1677ff" Offset="0.6" Opacity="0"/>
              </RadialGradientBrush>
            </Ellipse.Fill>
          </Ellipse>
          <Ellipse Canvas.Left="160" Canvas.Top="440" Width="260" Height="200">
            <Ellipse.Fill>
              <RadialGradientBrush>
                <GradientStop Color="#6366f1" Offset="0" Opacity="0.3"/>
                <GradientStop Color="#6366f1" Offset="0.6" Opacity="0"/>
              </RadialGradientBrush>
            </Ellipse.Fill>
          </Ellipse>
        </Canvas>
      </Grid>

      <!-- .activation-art-scrim : overlay gradient black left→right + top→bottom -->
      <Rectangle>
        <Rectangle.Fill>
          <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
            <GradientStop Color="#07070a" Offset="0" Opacity="0.96"/>
            <GradientStop Color="#07070a" Offset="0.38" Opacity="0.78"/>
            <GradientStop Color="#07070a" Offset="0.72" Opacity="0.22"/>
            <GradientStop Color="#07070a" Offset="1" Opacity="0.45"/>
          </LinearGradientBrush>
        </Rectangle.Fill>
      </Rectangle>
      <Rectangle>
        <Rectangle.Fill>
          <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">
            <GradientStop Color="#07070a" Offset="0" Opacity="0.2"/>
            <GradientStop Color="#07070a" Offset="1" Opacity="0.55"/>
          </LinearGradientBrush>
        </Rectangle.Fill>
      </Rectangle>

      <!-- Art column soft grain + vignette radial glow -->
      <Rectangle IsHitTestVisible="False">
        <Rectangle.Fill>
          <RadialGradientBrush Center="0.7" GradientOrigin="0.7 0.28" RadiusX="0.6" RadiusY="0.5">
            <GradientStop Color="#00c2ff" Offset="0" Opacity="0.18"/>
            <GradientStop Color="#00c2ff" Offset="0.65" Opacity="0"/>
          </RadialGradientBrush>
        </Rectangle.Fill>
      </Rectangle>

      <!-- .activation-art-copy : brand + unlock rig + device meta pills -->
      <StackPanel HorizontalAlignment="Right" VerticalAlignment="Bottom" Margin="0,0,36,40" Width="360">
        <!-- logo DAWA 132px width -->
        <TextBlock FontFamily="Segoe UI, Inter" FontWeight="900" Foreground="#ffffff"
                   FontSize="44" LetterSpacing="2.5" Margin="0,0,0,10">DAWA</TextBlock>
        <TextBlock FontFamily="Segoe UI, Inter" FontWeight="800" Foreground="#ffffff"
                   FontSize="40" LineHeight="1.08" TextWrapping="Wrap">Unlock the rig</TextBlock>
        <TextBlock Foreground="#d4d4d8" FontSize="14" LineHeight="1.5"
                   TextWrapping="Wrap" Margin="0,10,0,0">Kích hoạt xong mới vào khu tối ưu FPS. Key khóa theo máy này.</TextBlock>

        <!-- Art meta pills: hostname + os -->
        <StackPanel Orientation="Vertical" Margin="0,14,0,0">
          <Border CornerRadius="8" BorderThickness="1" Padding="5,5"
                  HorizontalAlignment="Left"
                  Background="#1677ff26" BorderBrush="#1677ff52">
            <TextBlock x:Name="HostNamePill" FontFamily="Consolas" FontSize="13" FontWeight="700" Foreground="#ffffff" Padding="6,1" Text="$hostname"/>
          </Border>
          <Border CornerRadius="8" BorderThickness="1" Padding="5,5"
                  HorizontalAlignment="Left" Margin="0,4,0,0"
                  Background="#ffffff0d" BorderBrush="#ffffff15">
            <TextBlock x:Name="OsPill" FontFamily="Consolas" FontSize="11.5" Foreground="#cbd5e1" Padding="6,1" Text="$osInfo"/>
          </Border>
        </StackPanel>
      </StackPanel>
    </Grid>

    <!-- =========================================================
         .activation-panel = floating glass center-left overlay
         ========================================================= -->
    <Border x:Name="PanelBorder"
            HorizontalAlignment="Left" VerticalAlignment="Center"
            Margin="36,0,0,0" Width="420"
            CornerRadius="1" Background="#0e0e13f0"
            BorderBrush="#1677ff52" BorderThickness="1"
            SnapsToDevicePixels="True" ClipToBounds="True">
      <Border.Effect>
        <DropShadowEffect Color="#000000" BlurRadius="50" ShadowDepth="10" Opacity="0.55"/>
      </Border.Effect>
      <Border.Resources>
        <Style TargetType="Border">
          <Setter Property="CornerRadius" Value="1"/>
        </Style>
      </Border.Resources>

      <!-- Animated gradient border travel -->
      <Border.OpacityMask>
        <LinearGradientBrush StartPoint="0,0" EndPoint="1,1"/>
      </Border.OpacityMask>

      <!-- scan-sweep animated horizontal line on top of panel (8%-8%) -->
      <Canvas IsHitTestVisible="False">
        <Line x:Name="ScanLine" X1="33.6" X2="386.4" Y1="1" Y2="1" StrokeThickness="2" StrokeEndLineCap="Round" StrokeStartLineCap="Round">
          <Line.Stroke>
            <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
              <GradientStop Color="#00c2ff" Offset="0" Opacity="0"/>
              <GradientStop Color="#00c2ff" Offset="0.1" Opacity="0"/>
              <GradientStop Color="#00c2ff" Offset="0.5" Opacity="0.5"/>
              <GradientStop Color="#00c2ff" Offset="0.9" Opacity="0"/>
              <GradientStop Color="#00c2ff" Offset="1" Opacity="0"/>
            </LinearGradientBrush>
          </Line.Stroke>
          <Line.Effect><DropShadowEffect Color="#00c2ff" BlurRadius="10" ShadowDepth="0" Opacity="0.5"/></Line.Effect>
        </Line>
      </Canvas>

      <!-- Corner TL accent blue 2px (TL) + corner BR accent cyan 2px (BR) -->
      <Canvas IsHitTestVisible="False">
        <Line X1="0" Y1="0" X2="18" Y2="0" Stroke="#1677ff" StrokeThickness="2"/>
        <Line X1="0" Y1="0" X2="0" Y2="18" Stroke="#1677ff" StrokeThickness="2"/>
        <Line X1="402" Y1="496" X2="420" Y2="496" Stroke="#22d3ee" StrokeThickness="2"/>
        <Line X1="420" Y1="478" X2="420" Y2="496" Stroke="#22d3ee" StrokeThickness="2"/>
      </Canvas>

      <Grid Margin="28,28,28,26">
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

        <!-- .activation-mark 40x40 rounded TL blue 12 BL 12  (shield + state colors) -->
        <Grid Grid.Row="0" HorizontalAlignment="Left" Width="40" Height="40">
          <Grid.Clip>
            <RectangleGeometry Rect="0,0,40,40" RadiusX="10" RadiusY="10"/>
          </Grid.Clip>
          <Border x:Name="MarkBorder" BorderBrush="#1677ff47" BorderThickness="1" Background="#1677ff17" CornerRadius="10"/>
          <Viewbox Width="22" Height="22" Stretch="Uniform" Margin="9">
            <Grid>
              <Path x:Name="ShieldPath" Stroke="#22d3ee" StrokeThickness="2" Fill="Transparent"
                    StrokeStartLineCap="Round" StrokeEndLineCap="Round" StrokeLineJoin="Round"
                    Data="M12 2 L21 5 V11 C21 16 17 21 12 22 C7 21 3 16 3 11 V5 L12 2 Z"/>
              <Path x:Name="ShieldCheck" Stroke="#22d3ee" StrokeThickness="2.4" StrokeStartLineCap="Round" StrokeEndLineCap="Round"
                    Data="M7.5 12 L11 15.5 L16.5 9" Visibility="Visible" Fill="Transparent"/>
              <Path x:Name="ShieldAlert" Stroke="#ef4444" StrokeThickness="2.4" StrokeStartLineCap="Round" StrokeEndLineCap="Round"
                    Data="M12 8 L12 14 M12 17 L12 17.01" Visibility="Collapsed" Fill="Transparent"/>
            </Grid>
          </Viewbox>
        </Grid>

        <!-- Heading + lead -->
        <TextBlock Grid.Row="1" FontSize="24" FontWeight="800" Foreground="#ffffff" Margin="0,16,0,0" FontFamily="Segoe UI, Inter">Kích hoạt bản quyền</TextBlock>
        <TextBlock Grid.Row="2" Foreground="#a1a1aa" FontSize="13" LineHeight="21" Margin="0,8,0,18" TextWrapping="Wrap">Nhập key để mở DAWA Optimizer trên thiết bị đã đăng ký.</TextBlock>

        <!-- activation-device block: ready dot + MACHINE ID pill mask 8…4 copy -->
        <Grid Grid.Row="3">
          <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
          </Grid.RowDefinitions>
          <StackPanel Grid.Row="0" Orientation="Horizontal">
            <Ellipse x:Name="DeviceReadyDot" Width="8" Height="8" VerticalAlignment="Center" Margin="0,0,8,0">
              <Ellipse.Style>
                <Style TargetType="Ellipse">
                  <Setter Property="Fill" Value="#71717a"/>
                  <Style.Triggers>
                    <DataTrigger Binding="{Binding Tag, ElementName=PanelBorder}" Value="ready">
                      <Setter Property="Fill" Value="#22d3ee"/>
                    </DataTrigger>
                  </Style.Triggers>
                </Style>
              </Ellipse.Style>
            </Ellipse>
            <TextBlock Foreground="#a1a1aa" FontSize="11" VerticalAlignment="Center">Thiết bị đã khóa với app</TextBlock>
          </StackPanel>
          <Grid Grid.Row="1" Margin="0,10,0,0">
            <Grid.ColumnDefinitions>
              <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>
            <StackPanel Orientation="Horizontal">
              <TextBlock Foreground="#71717a" FontSize="10" FontWeight="700" LetterSpacing="1.2" VerticalAlignment="Center" Margin="0,0,10,0">MACHINE ID</TextBlock>
              <!-- hwid-pill clickable copy mask 8…4 cyan pill -->
              <Button x:Name="FingerprintBtn" Template="{StaticResource GhostButtonTemplate}" Padding="10,4" BorderThickness="1"
                      CornerRadius="999"
                      Background="#22d3ee1a" BorderBrush="#22d3ee47" Cursor="Hand" HorizontalAlignment="Left">
                <StackPanel Orientation="Horizontal">
                  <TextBlock x:Name="FingerprintText" FontFamily="Consolas" Foreground="#67e8f9" FontSize="12" VerticalAlignment="Center" Text="$displayFingerprint"/>
                  <TextBlock x:Name="FingerprintIcon" FontSize="12" Foreground="#22d3ee" Margin="8,0,0,0" VerticalAlignment="Center">⎘</TextBlock>
                </StackPanel>
              </Button>
            </StackPanel>
          </Grid>
        </Grid>

        <!-- key-field-heading: label + counter -->
        <Grid Grid.Row="4" Margin="0,22,0,9">
          <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
            <ColumnDefinition Width="Auto"/>
          </Grid.ColumnDefinitions>
          <TextBlock Grid.Column="0" Foreground="#a1a1aa" FontFamily="Consolas" FontSize="11" FontWeight="600" LetterSpacing="0.4">MÃ KEY KÍCH HOẠT</TextBlock>
          <TextBlock Grid.Column="1" x:Name="KeyCounter" Foreground="#71717a" FontFamily="Consolas" FontSize="10" LetterSpacing="0.5" Text="0/14"/>
        </Grid>

        <!-- key-input-wrap 56 height : KEY prefix 52 / 1px divider / textbox / KeyRound icon -->
        <Grid Grid.Row="5" x:Name="KeyWrap">
          <Border x:Name="KeyBorder" CornerRadius="10" Background="#0f1117" BorderBrush="#27272a" BorderThickness="1" Padding="0">
            <Grid Height="56">
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="52"/>
                <ColumnDefinition Width="1"/>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="44"/>
              </Grid.ColumnDefinitions>
              <!-- .key-input-prefix KEY cyan mono 11px -->
              <TextBlock Grid.Column="0" Foreground="#22d3ee" FontFamily="Consolas" FontSize="11" FontWeight="700" LetterSpacing="1.2" VerticalAlignment="Center" HorizontalAlignment="Center">KEY</TextBlock>
              <Rectangle Grid.Column="1" Fill="#27272a" Width="1" Height="22" VerticalAlignment="Center"/>
              <TextBox Grid.Column="2" x:Name="LicenseEdit" FontFamily="Consolas" FontSize="16" FontWeight="700"
                       Background="Transparent" Foreground="#ffffff" BorderThickness="0" Padding="16,0,4,0"
                       VerticalContentAlignment="Center" CaretBrush="#22d3ee"
                       VerticalAlignment="Stretch" HorizontalContentAlignment="Stretch"
                       SpellCheck.IsEnabled="False" AutoWordSelection="False"/>
              <!-- KeyRound simple icon on right -->
              <TextBlock Grid.Column="3" Foreground="#a1a1aa" FontSize="15" VerticalAlignment="Center" HorizontalAlignment="Center" Margin="0,0,14,0">🗝</TextBlock>
            </Grid>
          </Border>
        </Grid>

        <!-- form-alert error/ok -->
        <Border Grid.Row="6" x:Name="FormAlert" Visibility="Collapsed" CornerRadius="6" Padding="12,10" Margin="0,12,0,0" BorderThickness="1">
          <TextBlock x:Name="FormAlertText" FontSize="13" TextWrapping="Wrap" Foreground="#a1a1aa"/>
        </Border>

        <!-- Submit gradient button 1677ff → 3990ff → 00c2ff : KÍCH HOẠT & TIẾP TỤC-->
        <Grid Grid.Row="7" Margin="0,18,0,0">
          <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
            <ColumnDefinition Width="Auto"/>
          </Grid.ColumnDefinitions>
          <Button x:Name="SubmitBtn" Grid.Column="0" Height="50"
                  Background="{x:Null}"
                  Foreground="#ffffff" FontWeight="700" FontSize="14"
                  BorderThickness="0" Cursor="Hand" CornerRadius="10"
                  Template="{StaticResource AccentButtonTemplate}">
            <Button.Tag>0.6</Button.Tag>
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
              <TextBlock x:Name="SubmitText" VerticalAlignment="Center" LetterSpacing="0.8">KÍCH HOẠT &amp; TIẾP TỤC</TextBlock>
            </StackPanel>
          </Button>
          <Button x:Name="CancelBtn" Grid.Column="1" Margin="14,0,0,0" Width="110" Height="50"
                  Background="Transparent" Foreground="#d4d4d8" FontWeight="600" FontSize="13"
                  BorderBrush="#27272a" BorderThickness="1" Cursor="Hand" CornerRadius="10"
                  Template="{StaticResource GhostButtonTemplate}">Hủy bỏ</Button>
        </Grid>
      </Grid>
    </Border>
  </Grid>
</Window>
"@

$xmlReader = New-Object System.Xml.XmlNodeReader ([xml]$xamlClean)
$window = [Windows.Markup.XamlReader]::Load($xmlReader)
$xmlReader.Close()

$LicenseEdit    = $window.FindName('LicenseEdit')
$SubmitBtn      = $window.FindName('SubmitBtn')
$SubmitText     = $window.FindName('SubmitText')
$SubmitIcon     = $window.FindName('SubmitIcon')
$CancelBtn      = $window.FindName('CancelBtn')
$KeyCounter     = $window.FindName('KeyCounter')
$KeyBorder      = $window.FindName('KeyBorder')
$FormAlert      = $window.FindName('FormAlert')
$FormAlertText  = $window.FindName('FormAlertText')
$FingerprintText= $window.FindName('FingerprintText')
$FingerprintBtn = $window.FindName('FingerprintBtn')
$FingerprintIcon= $window.FindName('FingerprintIcon')
$HostNamePill   = $window.FindName('HostNamePill')
$OsPill         = $window.FindName('OsPill')
$PanelBorder    = $window.FindName('PanelBorder')
$ShieldPath     = $window.FindName('ShieldPath')
$ShieldCheck    = $window.FindName('ShieldCheck')
$ShieldAlert    = $window.FindName('ShieldAlert')
$MarkBorder     = $window.FindName('MarkBorder')
$DeviceReadyDot = $window.FindName('DeviceReadyDot')

$script:Validated = $false
$script:GlobalResult = $null
$script:Busy = $false

function Set-MarkState {
  param([ValidateSet('default','success','error')][string]$State)
  switch ($State) {
    'default' {
      $MarkBorder.BorderBrush = $brushConv.ConvertFromString('#1677ff47')
      $ShieldPath.Stroke    = $brushConv.ConvertFromString('#22d3ee')
      $ShieldCheck.Visibility = [System.Windows.Visibility]::Visible
      $ShieldCheck.Stroke   = $brushConv.ConvertFromString('#22d3ee')
      $ShieldAlert.Visibility = [System.Windows.Visibility]::Collapsed
    }
    'success' {
      $MarkBorder.BorderBrush = $brushConv.ConvertFromString('#10b9813d')
      $ShieldPath.Stroke    = $brushConv.ConvertFromString('#10b981')
      $ShieldCheck.Visibility = [System.Windows.Visibility]::Visible
      $ShieldCheck.Stroke   = $brushConv.ConvertFromString('#10b981')
      $ShieldAlert.Visibility = [System.Windows.Visibility]::Collapsed
    }
    'error' {
      $MarkBorder.BorderBrush = $brushConv.ConvertFromString('#ef444440')
      $ShieldPath.Stroke    = $brushConv.ConvertFromString('#ef4444')
      $ShieldCheck.Visibility = [System.Windows.Visibility]::Collapsed
      $ShieldAlert.Visibility = [System.Windows.Visibility]::Visible
    }
  }
}

function Set-KeyBorderState {
  param([ValidateSet('default','success','error')][string]$State)
  switch ($State) {
    'default' { $KeyBorder.BorderBrush = $brushConv.ConvertFromString('#27272a') }
    'success' { $KeyBorder.BorderBrush = $brushConv.ConvertFromString('#10b981') }
    'error'   { $KeyBorder.BorderBrush = $brushConv.ConvertFromString('#ef4444') }
  }
}

function Show-Alert {
  param(
    [Parameter(Mandatory)][ValidateSet('error','ok')][string]$Kind,
    [Parameter(Mandatory)][string]$Message
  )
  if ($Kind -eq 'error') {
    $FormAlert.BorderBrush = $brushConv.ConvertFromString('#dc262666')
    $FormAlert.Background  = $brushConv.ConvertFromString('#dc262626')
    $FormAlertText.Foreground = $brushConv.ConvertFromString('#fca5a5')
  } else {
    $FormAlert.BorderBrush = $brushConv.ConvertFromString('#10b98166')
    $FormAlert.Background  = $brushConv.ConvertFromString('#10b98126')
    $FormAlertText.Foreground = $brushConv.ConvertFromString('#6ee7b7')
  }
  $FormAlertText.Text = $Message
  $FormAlert.Visibility = [System.Windows.Visibility]::Visible
}
function Hide-Alert { $FormAlert.Visibility = [System.Windows.Visibility]::Collapsed }

function Format-KeyInput {
  param([string]$Raw)
  $compact = ($Raw -replace '[^A-Za-z0-9]','').ToUpper()
  if ($compact.Length -gt 12) { $compact = $compact.Substring(0,12) }
  $parts = [regex]::Matches($compact, '.{1,4}') | ForEach-Object { $_.Value }
  return ($parts -join '-')
}

# Populate device info + trigger dot green ready
# HostNamePill shows DISPLAY case (user expects DESKTOP-XXX uppercase as in System
# Properties). The canonical lowercase hostname is only used for server POST.
$HostNamePill.Text = $hostnameDisplay
$OsPill.Text       = $osInfo
$FingerprintText.Text = $displayFingerprint
if ($PanelBorder) { $PanelBorder.Tag = 'ready' }
Set-MarkState 'default'
Set-KeyBorderState 'default'
Hide-Alert

# Fingerprint pill click = copy hwid full to clipboard
if ($FingerprintBtn) {
  $FingerprintBtn.Add_Click({
    try {
      [System.Windows.Clipboard]::SetText($hwid)
      $FingerprintIcon.Text = '✓'
      $FingerprintIcon.Foreground = $brushConv.ConvertFromString('#10b981')
      $FingerprintBtn.Background = $brushConv.ConvertFromString('#10b9811a')
      $FingerprintBtn.BorderBrush = $brushConv.ConvertFromString('#10b98147')
      $timer = New-Object System.Windows.Threading.DispatcherTimer
      $timer.Interval = [TimeSpan]::FromMilliseconds(1400)
      $timer.Add_Tick({
        $timer.Stop()
        $FingerprintIcon.Text = '⎘'
        $FingerprintIcon.Foreground = $brushConv.ConvertFromString('#22d3ee')
        $FingerprintBtn.Background = $brushConv.ConvertFromString('#22d3ee1a')
        $FingerprintBtn.BorderBrush = $brushConv.ConvertFromString('#22d3ee47')
      })
      $timer.Start()
    } catch { /* clipboard deny - ignore */ }
  })
}

$LicenseEdit.Add_TextChanged({
  $caret = $LicenseEdit.CaretIndex
  $formatted = Format-KeyInput $LicenseEdit.Text
  if ($LicenseEdit.Text -cne $formatted) {
    $LicenseEdit.Text = $formatted
    $LicenseEdit.CaretIndex = [Math]::Min($caret + 1, $formatted.Length)
  }
  $KeyCounter.Text = "$($formatted.Replace('-','').Length)/14"
  Hide-Alert
  Set-KeyBorderState 'default'
  Set-MarkState 'default'
})

$script:Busy = $false

function Set-Busy {
  param([bool]$State)
  $script:Busy = $State
  $SubmitBtn.IsEnabled = -not $State
  $LicenseEdit.IsEnabled = -not $State
  $CancelBtn.IsEnabled = -not $State
  if ($FingerprintBtn) { $FingerprintBtn.IsEnabled = -not $State }
  if ($State) {
    $SubmitText.Text = 'Đang xác thực...'
    $SubmitIcon.Text = '⏳'
  } else {
    $SubmitText.Text = 'KÍCH HOẠT & TIẾP TỤC'
    $SubmitIcon.Text = '🔑'
  }
}

$SubmitBtn.Add_Click({
  if ($script:Busy -or $script:Validated) { return }
  $__keyText = [string]$LicenseEdit.Text
  $__keyClean = $__keyText -replace '[^A-Za-z0-9]',''
  $keyRaw = $__keyClean.ToUpper()
  if ($keyRaw.Length -lt 8) {
    Show-Alert 'error' 'Vui lòng nhập mã key kích hoạt.'
    Set-MarkState 'error'
    Set-KeyBorderState 'error'
    return
  }
  $keyFormatted = Format-KeyInput $keyRaw
  $LicenseEdit.Text = $keyFormatted
  Hide-Alert
  Set-MarkState 'default'
  Set-KeyBorderState 'default'
  Set-Busy $true

  $bodyObj = @{
    key_code    = $keyFormatted
    device_hash = $hwid
    hardware_id = $hwid
    hwid        = $hwid
    device_name = $hostnameCanonical   # lowercase invariant = exact match Node.js
    os_info     = $osInfo
  }
  $bodyJson = $bodyObj | ConvertTo-Json -Depth 4

  $resp = $null
  $offline = $false
  $msg = ''
  try {
    $resp = Invoke-RestMethod -Uri $BackendUrl -Method Post -Body $bodyJson `
      -ContentType 'application/json; charset=utf-8' -TimeoutSec 25
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
      } catch { /* ignore */ }
    }
  }

  if ($resp -and [bool]$resp.valid) {
    $resultObj = @{
      success      = $true
      valid        = $true
      message      = [string]$resp.message
      isOffline    = $false
      keyCode      = [string]$keyFormatted
      deviceHash   = [string]$hwid
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
      Seal-LicenseJsonInline -JsonPath $tmpJson -OutPath $SealedLicenseOutput
      if (Test-Path $SealedLicenseOutput) { $sealOk = $true } else { $sealErr = 'Output file missing after Seal-LicenseJsonInline' }
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
      if (-not (Test-Path 'HKCU:\Software\Dawa Optimizer')) { New-Item -Path 'HKCU:\Software\Dawa Optimizer' -Force | Out-Null }
      Set-ItemProperty -Path 'HKCU:\Software\Dawa Optimizer' -Name 'InstallerActivated' -Value '1' -Type String -Force | Out-Null
      try {
        if (-not (Test-Path 'HKLM:\Software\Dawa Optimizer')) { New-Item -Path 'HKLM:\Software\Dawa Optimizer' -Force -ErrorAction Stop | Out-Null }
        Set-ItemProperty -Path 'HKLM:\Software\Dawa Optimizer' -Name 'InstallerActivated' -Value '1' -Type String -Force -ErrorAction SilentlyContinue | Out-Null
      } catch { /* ignore HKLM permission */ }
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
    $SubmitText.Text = 'Bạn đã kích hoạt ✓'
    $SubmitIcon.Text = '✅'

    # Auto-close after 0.8s (UX smooth, mirrors old Continue auto-close).
    # Leave SubmitBtn disabled & Cancel disabled during close countdown.
    $timer = New-Object System.Windows.Threading.DispatcherTimer
    $timer.Interval = [TimeSpan]::FromMilliseconds(800)
    $timer.Add_Tick({
      $timer.Stop()
      $window.DialogResult = $true
      $window.Close()
    })
    $timer.Start()
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

$CancelBtn.Add_Click({
  if ($script:Validated -ne $true) {
    $res = [System.Windows.MessageBox]::Show(
      "License activation is required to run this installer.`r`n`r`nNo valid key = no files extracted. Are you sure you want to cancel setup?",
      'Confirm Cancel', 'YesNo', 'Warning', 'No')
    if ($res -ne 'Yes') { return }
  }
  $window.DialogResult = $false
  $window.Close()
})

$window.Add_KeyDown({
  param($s, $e)
  if ($e.Key -eq 'Return' -and $SubmitBtn.IsEnabled -and -not $script:Validated) {
    $SubmitBtn.RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Primitives.ButtonBase]::ClickEvent))
  } elseif ($e.Key -eq 'Escape') {
    $CancelBtn.RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Primitives.ButtonBase]::ClickEvent))
  }
})

# Focus key input after window loaded (smooth UX)
# Also aggressively STEAL foreground since we run during NSIS
# preInit, immediately after user dismisses the SmartScreen
# "Run anyway" warning; Windows often gives foreground lock
# to the Explorer.exe process that spawned Setup.exe. This
# hack (AttachThreadInput + AllowSetForegroundWindow +
# SetForegroundWindow) reliably bypasses the 30-second lock.
$window.Add_SourceInitialized({
  try {
    $hwndSrc = New-Object System.Windows.Interop.WindowInteropHelper($window)
    $hwndVal = $hwndSrc.EnsureHandle()
    if ($hwndVal -ne [IntPtr]::Zero) {
      $typeUser32 = Add-Type -MemberDefinition @'
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr lpProcessId);
[DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
[DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
[DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(uint dwProcessId);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")] public static extern IntPtr SetActiveWindow(IntPtr hWnd);
'@ -Name 'DawaGateWin32' -Namespace 'Dawa' -PassThru
      if ($typeUser32) {
        $foreHwnd  = $typeUser32::GetForegroundWindow()
        $foreTid   = $typeUser32::GetWindowThreadProcessId($foreHwnd, [IntPtr]::Zero)
        $thisTid   = $typeUser32::GetCurrentThreadId()
        if ($foreTid -ne 0 -and $foreTid -ne $thisTid) {
          $null = $typeUser32::AttachThreadInput($thisTid, $foreTid, $true)
        }
        $procId    = [System.Diagnostics.Process]::GetCurrentProcess().Id
        $null      = $typeUser32::AllowSetForegroundWindow($procId)
        $null      = $typeUser32::ShowWindowAsync($hwndVal, 9)   ; # SW_RESTORE = 9 (pull from minimized if any)
        $null      = $typeUser32::SetForegroundWindow($hwndVal)
        $null      = $typeUser32::SetActiveWindow($hwndVal)
        if ($foreTid -ne 0 -and $foreTid -ne $thisTid) {
          $null = $typeUser32::AttachThreadInput($thisTid, $foreTid, $false)
        }
      }
    }
  } catch {
    # Fallback: Activate() if the native pinvoke chain fails silently
    try { $window.Activate() | Out-Null } catch {}
  }
})
$window.Add_Loaded({
  $window.Dispatcher.Invoke([action]{
    try { $window.Activate() | Out-Null } catch {}
    try { $window.Topmost = $true } catch {}
    $LicenseEdit.Focus() | Out-Null
    $LicenseEdit.Select($LicenseEdit.Text.Length, 0) | Out-Null
  }, [System.Windows.Threading.DispatcherPriority]::Background) | Out-Null
})

$result = $window.ShowDialog()
if ($result -eq $true -and $script:Validated) {
  exit 0
} else {
  exit 1
}
