﻿﻿﻿﻿﻿param(
  [Parameter(Mandatory = $true)] [string] $GateScriptPath,
  [Parameter(Mandatory = $true)] [string] $OutputJson,
  [Parameter(Mandatory = $true)] [string] $SealedLicenseOutput,
  [Parameter(Mandatory = $true)] [string] $RegFlagFile
)

$ErrorActionPreference = 'Continue'

$stagedScriptPath = $null

try {
  $utf8Bom = New-Object System.Text.UTF8Encoding $true
  $bytes = [System.IO.File]::ReadAllBytes($GateScriptPath)
  $scriptText = [System.Text.Encoding]::UTF8.GetString($bytes)

  $tempDir = [System.IO.Path]::GetTempPath()
  $stagedScriptPath = Join-Path $tempDir ("dawa-gate-staged-" + [Guid]::NewGuid().ToString("N") + ".ps1")
  [System.IO.File]::WriteAllText($stagedScriptPath, $scriptText, $utf8Bom)

  & $stagedScriptPath -OutputJson $OutputJson -SealedLicenseOutput $SealedLicenseOutput -RegFlagFile $RegFlagFile

  $realExit = 0
  if ($global:LASTEXITCODE -ne 0) {
    $realExit = [int]$global:LASTEXITCODE
  }

  try {
    if ($stagedScriptPath -and (Test-Path -LiteralPath $stagedScriptPath)) {
      Remove-Item -LiteralPath $stagedScriptPath -Force -ErrorAction SilentlyContinue
    }
  } catch {}

  $host.SetShouldExit($realExit)
  exit $realExit
} catch {
  $errMsg = $_.Exception.Message

  try {
    if ($stagedScriptPath -and (Test-Path -LiteralPath $stagedScriptPath)) {
      Remove-Item -LiteralPath $stagedScriptPath -Force -ErrorAction SilentlyContinue
    }
  } catch {}

  Write-Output ("[DAWA-GATE-RUNNER-FATAL] " + $errMsg)
  $host.SetShouldExit(9998)
  exit 9998
}
