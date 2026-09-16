#Requires -RunAsAdministrator
<#
.SYNOPSIS
  DAWA Optimizer — Full Build + Publish GitHub Release (One-Click Script)

.DESCRIPTION
  1. Kill toàn bộ process DAWA / node đang giữ lock file
  2. Xóa sạch thư mục release / out / .tmp-build cũ (3 method tránh EBUSY)
  3. Set env TEMP/TMP local (tránh lỗi quyền ghi)
  4. Đọc GH_TOKEN từ file .env (nếu có) hoặc dùng env $GH_TOKEN hiện tại
  5. npm install đảm bảo dotenv + deps hiện diện
  6. npm run build:win:publish (compile + đóng gói NSIS + upload GitHub Release)
  7. Tự dọn dẹp thư mục tạm sau khi publish xong
  8. Mở trang GitHub releases để kiểm tra

.NOTES
  - Cần chạy PowerShell với quyền Administrator
  - GitHub Token LẤY TỪ FILE .env (tham khảo .env.example)
  - File .env cần có dòng:  GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
  - (Hoặc nếu không có trong .env, script sẽ dùng $env:GH_TOKEN của session)
  - Token lấy ở https://github.com/settings/tokens (scope `repo` là đủ)
  - Khi nâng version mới: chỉ cần sửa version trong package.json, script tự động dùng tag đúng
#>

param(
  [switch]$SkipCleanup,
  [switch]$SkipInstall,
  [switch]$KeepTemp
)

$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PROJECT_ROOT = $PWD.Path
$SCRIPT_START = Get-Date

# ============================================================
#  🔑  ĐỌC GITHUB TOKEN TỪ FILE .env (hoặc $env:GH_TOKEN fallback)
# ============================================================
function Get-GitHubToken {
  param([string]$ProjectRoot)

  # Ưu tiên 1: đọc từ file .env trong project root
  $envFile = Join-Path $ProjectRoot ".env"
  if (Test-Path $envFile) {
    Write-Host "   [.env] Đang đọc file: $envFile" -ForegroundColor Gray
    foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
      $trim = $line.Trim()
      if ([string]::IsNullOrWhiteSpace($trim)) { continue }
      if ($trim.StartsWith("#")) { continue }
      $eq = $trim.IndexOf("=")
      if ($eq -le 0) { continue }
      $key = $trim.Substring(0, $eq).Trim()
      $val = $trim.Substring($eq + 1).Trim()
      if ($val.StartsWith('"') -and $val.EndsWith('"') -and $val.Length -ge 2) {
        $val = $val.Substring(1, $val.Length - 2)
      }
      if ($key -eq "GH_TOKEN" -or $key -eq "GITHUB_TOKEN") {
        if (-not [string]::IsNullOrWhiteSpace($val)) {
          Write-Host "   ✅ Tìm thấy GH_TOKEN trong file .env" -ForegroundColor Green
          return $val
        }
      }
    }
  } else {
    Write-Host "   [.env] Không tìm thấy file .env (sẽ dùng `$env:GH_TOKEN)" -ForegroundColor DarkGray
  }

  # Ưu tiên 2: dùng biến môi trường session hiện tại
  if (-not [string]::IsNullOrWhiteSpace($env:GH_TOKEN)) {
    Write-Host "   ✅ Sử dụng GH_TOKEN từ `$env:GH_TOKEN (session)" -ForegroundColor Green
    return $env:GH_TOKEN
  }
  if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    Write-Host "   ✅ Sử dụng GITHUB_TOKEN từ `$env:GITHUB_TOKEN (session)" -ForegroundColor Green
    return $env:GITHUB_TOKEN
  }

  return $null
}

function Write-Banner([string]$text, [string]$color = "Magenta") {
  $bar = "═" * [Math]::Min($text.Length + 6, 62)
  Write-Host ""
  Write-Host "╔$bar╗" -ForegroundColor $color
  Write-Host "║  $text  ║" -ForegroundColor $color
  Write-Host "╚$bar╝" -ForegroundColor $color
  Write-Host ""
}

function Write-Step([int]$idx, [int]$total, [string]$text, [string]$color = "Cyan") {
  Write-Host "[$idx/$total] $text" -ForegroundColor $color
}

function Remove-Forced([string]$path) {
  if (-not (Test-Path $path)) { return $true }
  try {
    Remove-Item -Recurse -Force $path -ErrorAction Stop
    return $true
  }
  catch {
    try {
      $empty = Join-Path $env:TEMP "dawa-empty-$(Get-Random -Maximum 999999)"
      New-Item -ItemType Directory -Force -Path $empty | Out-Null
      robocopy $empty $path /MIR /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
      Remove-Item -Recurse -Force $empty -ErrorAction SilentlyContinue
      Remove-Item -Recurse -Force $path -ErrorAction Stop
      return $true
    }
    catch {
      try {
        taskkill /F /IM explorer.exe /T 2>$null | Out-Null
        Start-Sleep -Seconds 2
        Remove-Item -Recurse -Force $path -ErrorAction Stop
        Start-Process explorer.exe | Out-Null
        return $true
      }
      catch {
        Start-Process explorer.exe -ErrorAction SilentlyContinue | Out-Null
        Write-Host "   ❌ Still locked: $path" -ForegroundColor Red
        return $false
      }
    }
  }
}

# ============================================================
#   START
# ============================================================
Write-Banner "🚀 DAWA OPTIMIZER — BUILD + PUBLISH GITHUB RELEASE" "Magenta"

# Verify PS version
Write-Host " PowerShell version: $($PSVersionTable.PSVersion)"
Write-Host " Execution policy : $(Get-ExecutionPolicy -Scope Process)"
Write-Host " Running as admin : $([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"
Write-Host ""

# Verify token — load từ .env ƯU TIÊN 1, nếu không có thì dùng $env:GH_TOKEN
Write-Host "[0/6] Đọc GitHub Token (ưu tiên file .env)" -ForegroundColor DarkCyan
$TOKEN_RESULT = Get-GitHubToken -ProjectRoot $PROJECT_ROOT
if ([string]::IsNullOrWhiteSpace($TOKEN_RESULT)) {
  Write-Host ""
  Write-Host "[!] KHÔNG TÌM THẤY GITHUB TOKEN!" -ForegroundColor Red
  Write-Host "   Cách 1 (khuyến nghị): Thêm dòng sau vào file '.env' ở project root:"
  Write-Host "            GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx"
  Write-Host "   Cách 2             : Set biến môi trường trong PS session này:"
  Write-Host "            `$env:GH_TOKEN = `"ghp_xxxxxxxxxxxxxxxxxxxx`""
  Write-Host "   → Lấy token: https://github.com/settings/tokens  (cần scope: repo)"
  Write-Host ""
  throw "GH_TOKEN not found in .env or env session"
}
[string]$GLOBAL:GITHUB_TOKEN = $TOKEN_RESULT
# Không log giá trị token ra (bảo mật) — chỉ hiển thị prefix/suffix để verify đúng token
$masked = if ($GLOBAL:GITHUB_TOKEN.Length -gt 10) {
  $GLOBAL:GITHUB_TOKEN.Substring(0, 6) + "..." + $GLOBAL:GITHUB_TOKEN.Substring($GLOBAL:GITHUB_TOKEN.Length - 4)
} else { "***" }
Write-Host "   Token đã nạp  : $masked"
Write-Host ""

# Read version
try {
  $pkg = Get-Content (Join-Path $PROJECT_ROOT "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $APP_VERSION = $pkg.version
  $PRODUCT_NAME = $pkg.name
}
catch {
  throw "Không đọc được package.json: $($_.Exception.Message)"
}

Write-Host " Product : $PRODUCT_NAME"
Write-Host " Version : $APP_VERSION"
Write-Host " Tag     : v$APP_VERSION"
Write-Host ""

# ============================================================
#  [1/6] PROCESS CLEANUP
# ============================================================
if (-not $SkipCleanup) {
  Write-Step 1 6 "Kill toàn bộ process liên quan (Dawa-Optimizer / node / electron)"
  $procs = @("Dawa-Optimizer", "Dawa Optimizer", "electron", "node", "npm")
  foreach ($name in $procs) {
    $matched = Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object {
      if ($name -eq "node" -or $name -eq "npm") {
        try { $_.Path -like "*RDUC*" -or $_.Path -like "*appdesktop*" } catch { $false }
      }
      else { $true }
    }
    if ($matched) {
      Write-Host "   • Killing $($matched.Count) process(es) [$name]" -ForegroundColor Gray
      $matched | Stop-Process -Force -ErrorAction SilentlyContinue
    }
  }

  try { taskkill /F /IM "Dawa-Optimizer.exe" /T 2>$null | Out-Null } catch { }
  Start-Sleep -Seconds 4

  Write-Host "   ✅ Process cleanup xong`n" -ForegroundColor Green
}
else {
  Write-Step 1 6 "Bỏ qua cleanup process (--SkipCleanup)" "DarkGray"
}

# ============================================================
#  [2/6] REMOVE OLD BUILD ARTIFACTS
# ============================================================
if (-not $SkipCleanup) {
  Write-Step 2 6 "Xóa các thư mục build cũ: release / out / .tmp-build"
  $artifacts = @("release", "out", ".tmp-build")
  foreach ($f in $artifacts) {
    $p = Join-Path $PROJECT_ROOT $f
    if (Test-Path $p) {
      $ok = Remove-Forced $p
      if ($ok) { Write-Host "   ✅ Removed: $f" -ForegroundColor Green }
    }
    else {
      Write-Host "   ↪ (not exist): $f" -ForegroundColor DarkGray
    }
  }
  Write-Host ""
}
else {
  Write-Step 2 6 "Bỏ qua cleanup artifacts (--SkipCleanup)" "DarkGray"
}

# ============================================================
#  [3/6] ENVIRONMENT SETUP
# ============================================================
Write-Step 3 6 "Set biến môi trường + tạo thư mục TEMP cục bộ"
$TEMP_DIR = Join-Path $PROJECT_ROOT ".tmp-build"
New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null

$env:TEMP = $TEMP_DIR
$env:TMP  = $TEMP_DIR
$env:GH_TOKEN = $GLOBAL:GITHUB_TOKEN

Write-Host "   TEMP     = $env:TEMP"
Write-Host "   TMP      = $env:TMP"
Write-Host "   GH_TOKEN = $(if ([string]::IsNullOrEmpty($env:GH_TOKEN)) { '❌ TRỐNG' } else { '✅ ĐÃ SET' })"
Write-Host ""

if ([string]::IsNullOrEmpty($env:GH_TOKEN)) { throw "GH_TOKEN rỗng!" }

# ============================================================
#  [4/6] NPM INSTALL
# ============================================================
if (-not $SkipInstall) {
  Write-Step 4 6 "npm install --no-audit --no-fund"
  npm install --no-audit --no-fund --loglevel=error
  if ($LASTEXITCODE -ne 0) { throw "[❌] npm install failed — exit code $LASTEXITCODE" }
  Write-Host "   ✅ npm install OK`n" -ForegroundColor Green
}
else {
  Write-Step 4 6 "Bỏ qua npm install (--SkipInstall)" "DarkGray"
}

# ============================================================
#  [5/6] BUILD + PUBLISH
# ============================================================
Write-Step 5 6 "BUILD + PUBLISH (npm run build:win:publish)" "Magenta"
Write-Host "   • compile main / preload / renderer"
Write-Host "   • electron-builder đóng gói NSIS installer"
Write-Host "   • tạo Dawa-Optimizer-Setup-$APP_VERSION.exe + .blockmap + latest.yml"
Write-Host "   • upload 3 file lên GitHub Releases tag v$APP_VERSION"
Write-Host "   • ⏳ Thời gian ước tính: 5-15 phút tùy tốc độ CPU + mạng"
Write-Host ""

$BUILD_START = Get-Date
npm run build:win:publish
$BUILD_END = Get-Date
$BUILD_DURATION = ($BUILD_END - $BUILD_START).ToString("hh\:mm\:ss")

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "[❌❌❌] BUILD/PUBLISH FAILED — exit code $LASTEXITCODE" -ForegroundColor Red
  Write-Host "   Thời gian chạy: $BUILD_DURATION"
  Write-Host ""
  Write-Host "   Các nguyên nhân thường gặp:"
  Write-Host "    1. EBUSY — vẫn còn process giữ file → chạy lại script"
  Write-Host "    2. GH_TOKEN sai / hết hạn / thiếu scope 'repo' → tạo token mới"
  Write-Host "    3. GitHub Repo owner/repo sai (karal202/RDUC trong electron-builder.yml)"
  Write-Host "    4. Mất mạng giữa chừng → chạy lại lệnh publish"
  Write-Host "    5. Đã tồn tại tag v$APP_VERSION trên GitHub → xóa release/tag cũ đi hoặc nâng version trong package.json"
  throw "build:win:publish FAILED"
}

Write-Host ""
Write-Host "   ✅ Build + Publish thành công (thời gian: $BUILD_DURATION)" -ForegroundColor Green
Write-Host ""

# ============================================================
#  [6/6] AUTO CLEANUP TEMP FILES
# ============================================================
Write-Step 6 6 "Dọn dẹp thư mục tạm sau khi publish xong"
$clean = @()
if (-not $KeepTemp) {
  $clean += @(".tmp-build", "out")
}
# "release" giữ lại mặc định (để test local bản setup vừa build)
# Bỏ comment dòng dưới nếu muốn xóa luôn release sau khi publish xong:
# $clean += "release"

foreach ($f in $clean) {
  $p = Join-Path $PROJECT_ROOT $f
  if (Test-Path $p) {
    $ok = Remove-Forced $p
    if ($ok) { Write-Host "   ✅ Đã xóa: $f" -ForegroundColor Green }
    else     { Write-Host "   ⚠ Không xóa được: $f" -ForegroundColor Yellow }
  }
}
Write-Host ""

# ============================================================
#   FINAL SUMMARY
# ============================================================
$RELEASE_URL = "https://github.com/karal202/RDUC/releases/tag/v$APP_VERSION"
$TOTAL_DURATION = ((Get-Date) - $SCRIPT_START).ToString("hh\:mm\:ss")

Write-Banner "✅ PUBLISH HOÀN TẤT!" "Green"
Write-Host "   Product         : $PRODUCT_NAME"
Write-Host "   Version         : $APP_VERSION"
Write-Host "   GitHub tag      : v$APP_VERSION"
Write-Host "   Tổng thời gian  : $TOTAL_DURATION"
Write-Host ""
Write-Host "   🔗 Release URL  : $RELEASE_URL"
Write-Host ""
Write-Host "   ‼️  TRÊN GITHUB RELEASE PHAI CÓ ĐỦ 3 FILE SAU MỚI LÀ OK:      " -ForegroundColor Yellow
Write-Host "      • Dawa-Optimizer-Setup-$APP_VERSION.exe              (200-500MB)"
Write-Host "      • Dawa-Optimizer-Setup-$APP_VERSION.exe.blockmap     (nhỏ)"
Write-Host "      • latest.yml                                          (chứa SHA512 hash)"
Write-Host ""
Write-Host "   📝 File log user app: %APPDATA%\dawa-optimizer\logs\dawa-launch.log"
Write-Host ""

try { Start-Process $RELEASE_URL } catch { Write-Host "   (Mở thủ công: $RELEASE_URL)" }
