param(
    [Parameter(Mandatory = $true)][string]$InputFile,
    [Parameter(Mandatory = $true)][string]$OutputFile,
    [string]$OverrideHardwareId = ""
)

$ErrorActionPreference = "Stop"

function Get-HardwareId {
    try {
        $bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue
        $sys = Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
        $cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
        $raw = (@(
            ($sys.UUID || ""),
            ($bios.SerialNumber || ""),
            ($cpu.Manufacturer || ""),
            ($cpu.Name || ""),
            ($os.SerialNumber || ""),
            ($env:COMPUTERNAME || "")
        ) -join "-")
        if ([string]::IsNullOrWhiteSpace($raw)) { $raw = "fallback_hwid" }
        $sha = [System.Security.Cryptography.SHA256]::Create()
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
        return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace("-", "").ToLowerInvariant()
    }
    catch {
        $raw = (@($env:COMPUTERNAME, [System.Environment]::Is64BitOperatingSystem, [System.Environment]::OSVersion.VersionString, [System.Environment]::GetEnvironmentVariable("PROCESSOR_IDENTIFIER")) -join "-")
        $sha = [System.Security.Cryptography.SHA256]::Create()
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
        return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace("-", "").ToLowerInvariant()
    }
}

$PEPPER = "D4W4_OP71M1Z3R_K3RN3L_V4UL7_2026_SEAL"
$hwid = if (-not [string]::IsNullOrWhiteSpace($OverrideHardwareId)) { $OverrideHardwareId } else { Get-HardwareId }

$keyMaterial = [System.Text.Encoding]::UTF8.GetBytes(($hwid + $PEPPER))
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$key = $sha256.ComputeHash($keyMaterial)

$jsonBytes = [System.IO.File]::ReadAllBytes($InputFile)

$aesGcm = New-Object System.Security.Cryptography.AesGcm($key, 16)
$nonce = New-Object byte[] 12
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($nonce)
$tag = New-Object byte[] 16
$ciphertext = New-Object byte[] $jsonBytes.Length

$aesGcm.Encrypt($nonce, $jsonBytes, $ciphertext, $tag, $null)

$finalBlob = New-Object byte[] ($nonce.Length + $tag.Length + $ciphertext.Length)
[Buffer]::BlockCopy($nonce, 0, $finalBlob, 0, $nonce.Length)
[Buffer]::BlockCopy($tag, 0, $finalBlob, $nonce.Length, $tag.Length)
[Buffer]::BlockCopy($ciphertext, 0, $finalBlob, $nonce.Length + $tag.Length, $ciphertext.Length)

$encoded = [Convert]::ToBase64String($finalBlob)
$outDir = Split-Path -Parent $OutputFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
[System.IO.File]::WriteAllText($OutputFile, $encoded, [System.Text.Encoding]::ASCII)

if ($rng) { $rng.Dispose() }
if ($aesGcm) { $aesGcm.Dispose() }
if ($sha256) { $sha256.Dispose() }

exit 0
