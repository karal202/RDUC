param(
    [Parameter(Mandatory = $true)][string]$InputFile,
    [Parameter(Mandatory = $true)][string]$OutputFile,
    [string]$OverrideHardwareId = ""
)

$ErrorActionPreference = "Stop"

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
  $brand = $brand -replace '\(R\)', [string][char]0x00AE
  $brand = $brand -replace '\(TM\)', [string][char]0x2122
  $brand = $brand -replace '^\s*\(?\d+\s*(?:st|nd|rd|th)\)?\s+', ''
  return $brand.Trim()
}

function Get-JsCompatibleSystemSerial {
  try {
    $ch = Get-CimInstance Win32_SystemEnclosure -ErrorAction Stop
    if ($ch -and "$($ch.SerialNumber)") {
      $v = ("$($ch.SerialNumber)").Trim()
      if ($v -and $v -notmatch '^(0+|To be filled|Default|None|Not |N/A|$)' -and $v.Length -ge 4) { return $v }
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

function Get-HardwareId {
  try {
    $sys = Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
    $serialField = Get-JsCompatibleSystemSerial
    $cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
    $osCim = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    $cpuBrand = Get-JsCompatibleCpuBrand
    $p1 = if ("$($sys.UUID)") { ("$($sys.UUID)").Trim().ToLowerInvariant() } else { '' }
    $p2 = if ($serialField) { $serialField } else { '' }
    $p3Raw = if ("$($cpu.Manufacturer)") { ("$($cpu.Manufacturer)").Trim() } else { '' }
    $p3 = if ($p3Raw -eq 'GenuineIntel') { 'Intel' } elseif ($p3Raw -eq 'AuthenticAMD') { 'AMD' } else { $p3Raw }
    $p4 = if ($cpuBrand) { $cpuBrand } else { '' }
    $p5 = if ("$($osCim.SerialNumber)") { ("$($osCim.SerialNumber)").Trim() } else { '' }
    $p6 = if ("$env:COMPUTERNAME") { "$env:COMPUTERNAME" } else { '' }
    $raw = (@($p1,$p2,$p3,$p4,$p5,$p6) -join '-')
    if ([string]::IsNullOrWhiteSpace($raw)) { $raw = 'fallback_hwid' }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
  }
  catch {
    $osPlatform = 'win32'
    $osRelease = [System.Environment]::OSVersion.Version.Major.ToString() + '.' + [System.Environment]::OSVersion.Version.Minor.ToString() + '.' + [System.Environment]::OSVersion.Version.Build.ToString()
    $procIdent = [System.Environment]::GetEnvironmentVariable('PROCESSOR_IDENTIFIER')
    if ([string]::IsNullOrWhiteSpace($procIdent)) { $procIdent = '' }
    $hostName = if ("$env:COMPUTERNAME") { "$env:COMPUTERNAME" } else { [System.Net.Dns]::GetHostName() }
    $is64 = [System.Environment]::Is64BitOperatingSystem
    $raw = (@($hostName, $is64, ($osPlatform + '-' + $osRelease), $procIdent) -join '-')
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
  }
}

$PEPPER = "D4W4_OP71M1Z3R_K3RN3L_V4UL7_2026_SEAL"
$hwid = if (-not [string]::IsNullOrWhiteSpace($OverrideHardwareId)) { $OverrideHardwareId } else { Get-HardwareId }

$keyMaterial = [System.Text.Encoding]::UTF8.GetBytes(($hwid + $PEPPER))
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$key = $sha256.ComputeHash($keyMaterial)

$jsonBytes = [System.IO.File]::ReadAllBytes($InputFile)

$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Key = $key
$aes.GenerateIV()
$encryptor = $aes.CreateEncryptor()
$ciphertext = $encryptor.TransformFinalBlock($jsonBytes, 0, $jsonBytes.Length)

$finalBlob = New-Object byte[] ($aes.IV.Length + $ciphertext.Length)
[Buffer]::BlockCopy($aes.IV, 0, $finalBlob, 0, $aes.IV.Length)
[Buffer]::BlockCopy($ciphertext, 0, $finalBlob, $aes.IV.Length, $ciphertext.Length)

$encoded = [Convert]::ToBase64String($finalBlob)
$outDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
[System.IO.File]::WriteAllText($OutputFile, $encoded, [System.Text.Encoding]::ASCII)

if ($encryptor) { $encryptor.Dispose() }
if ($aes) { $aes.Dispose() }
if ($sha256) { $sha256.Dispose() }

exit 0
