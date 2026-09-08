$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $ScriptDir ".env"

function Get-EnvVar($content, $name) {
  foreach ($line in $content) {
    $l = $line.Trim()
    if ($l -eq "" -or $l.StartsWith("#")) { continue }
    if ($l.StartsWith("$name=")) {
      return $l.Substring($name.Length + 1).Trim('"', "'")
    }
  }
  return $null
}

if (Test-Path $EnvFile) {
  $Lines = Get-Content $EnvFile
  $ghTokenFromEnv = Get-EnvVar $Lines "GH_TOKEN"
  if ($ghTokenFromEnv -and $ghTokenFromEnv -ne "") {
    $env:GH_TOKEN = $ghTokenFromEnv
    Write-Host "[OK] Loaded GH_TOKEN from .env" -ForegroundColor Green
  }
}

if (-not $env:GH_TOKEN -or $env:GH_TOKEN -eq "") {
  Write-Host "[ERROR] GH_TOKEN not found." -ForegroundColor Red
  Write-Host " -> Go to: GitHub -> Settings -> Developer settings -> Personal access tokens -> Tokens (classic)"
  Write-Host " -> Generate new token (classic) with scope 'repo'"
  Write-Host " -> Option 1: Paste into $EnvFile as:"
  Write-Host "      GH_TOKEN=ghp_your_token_here"
  Write-Host " -> Option 2: Run this command before publish:"
  Write-Host "      `$env:GH_TOKEN = `"ghp_your_token_here`""
  exit 1
}

Write-Host "[1/2] Building and publishing to GitHub Releases..." -ForegroundColor Cyan
Set-Location $ScriptDir
npm run build:win:publish

if ($LASTEXITCODE -ne 0) {
  Write-Host "[FAIL] Build/publish exited with code $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[DONE] Upload finished. Check GitHub -> Releases -> v$(node -p `"require('./package.json').version`") for latest.yml, .blockmap and .exe files." -ForegroundColor Green
