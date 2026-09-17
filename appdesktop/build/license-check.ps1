param(
  [Parameter(Mandatory = $true)][string]$LicenseKey,
  [Parameter(Mandatory = $true)][string]$BackendUrl,
  [Parameter(Mandatory = $true)][string]$OutputFile,
  [Parameter(Mandatory = $true)][string]$ValidFlagFile
)

$ErrorActionPreference = 'Stop'

function Get-HardwareHash {
  try {
    $sys = Get-CimInstance Win32_ComputerSystemProduct -ErrorAction Stop
    $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
    $cpu = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $hostname = [System.Net.Dns]::GetHostName()
    $raw = "$($sys.UUID)-$($bios.SerialNumber)-$($cpu.Manufacturer)-$($cpu.Name)-$($os.SerialNumber)-$hostname"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    $sha = New-Object System.Security.Cryptography.SHA256Managed
    return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLower()
  } catch {
    $hostname = [System.Net.Dns]::GetHostName()
    $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    $platform = [System.Environment]::OSVersion.Platform.ToString()
    $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name
    $raw = "$hostname-$arch-$platform-$cpu"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
    $sha = New-Object System.Security.Cryptography.SHA256Managed
    return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLower()
  }
}

$hwid = Get-HardwareHash
$osInfo = "$([System.Environment]::OSVersion.VersionString) ($([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture))"
$hostname = [System.Net.Dns]::GetHostName()

$body = @{
  key_code    = $LicenseKey
  device_hash = $hwid
  hardware_id = $hwid
  hwid        = $hwid
  device_name = $hostname
  os_info     = $osInfo
} | ConvertTo-Json -Depth 4

try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $resp = Invoke-RestMethod -Uri $BackendUrl -Method Post -Body $body `
    -ContentType 'application/json; charset=utf-8' -TimeoutSec 25
  $result = @{
    success      = [bool]$resp.success
    valid        = [bool]$resp.valid
    message      = [string]$resp.message
    isOffline    = $false
    keyCode      = [string]$LicenseKey
    deviceHash   = [string]$hwid
    accessToken  = [string]$resp.accessToken
    refreshToken = [string]$resp.refreshToken
    expiresAt    = [string]$resp.expiresAt
    activatedAt  = [string]$resp.activatedAt
    signature    = [string]$resp.signature
  }
} catch {
  $msg = $_.Exception.Message
  $offline = ($_.Exception -is [System.Net.WebException] -and
    ($_.Exception.Response -eq $null -or $_.Exception.Response.StatusCode -ge 500))
  if (-not $offline) {
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $raw = $reader.ReadToEnd()
      $reader.Dispose()
      $parsed = $raw | ConvertFrom-Json
      $msg = [string]$parsed.message
    } catch { /* ignore */ }
  }
  $result = @{
    success   = $false
    valid     = $false
    message   = if ($offline) { 'Cannot connect to license server. Check your network connection.' } else { $msg }
    isOffline = [bool]$offline
  }
}

$result | ConvertTo-Json -Depth 6 -Compress | Out-File -FilePath $OutputFile -Encoding utf8
$flagVal = if ($result.valid) { '1' } else { '0' }
[System.IO.File]::WriteAllText($ValidFlagFile, $flagVal, [System.Text.Encoding]::ASCII)
exit 0
