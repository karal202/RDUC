Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

param(
  [string]$LogFile = ""
)

# ============================================================
# Gate Logger — append timestamped lines to shared installer log
# ============================================================
function Write-GateLog([string]$Level, [string]$Message) {
  if ([string]::IsNullOrWhiteSpace($script:GateLogPath)) { return }
  try {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$stamp] [LICENSE-GATE] [$Level] $Message"
    Add-Content -Path $script:GateLogPath -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
  } catch {}
}

# Resolve final log path early (user passes -LogFile via NSIS or fallback to APPDATA)
$script:GateLogPath = $LogFile
if ([string]::IsNullOrWhiteSpace($script:GateLogPath)) {
  $fallbackDir = Join-Path $env:APPDATA "dawa-optimizer\logs"
  New-Item -ItemType Directory -Path $fallbackDir -Force -ErrorAction SilentlyContinue | Out-Null
  $script:GateLogPath = Join-Path $fallbackDir "dawa-installer.log"
}
try {
  $null = New-Item -ItemType Directory -Path (Split-Path $script:GateLogPath -Parent) -Force -ErrorAction SilentlyContinue
  "`r`n============================================================" | Add-Content -Path $script:GateLogPath -Encoding UTF8 -ErrorAction SilentlyContinue
  "[BOOT] license-gate.ps1 started (pid=$PID, user=$env:USERNAME, PSVersion=$($PSVersionTable.PSVersion))" | Add-Content -Path $script:GateLogPath -Encoding UTF8 -ErrorAction SilentlyContinue
  Write-GateLog "INFO" "Log target = $script:GateLogPath"
} catch {}

function Show-LicenseGate {
  Write-GateLog "INFO" "Rendering WinForms license-gate dialog 480x270"

  $form = New-Object System.Windows.Forms.Form
  $form.Text = "DAWA Optimizer Setup — Kích Hoạt Bản Quyền"
  $form.Size = New-Object System.Drawing.Size(480, 270)
  $form.StartPosition = "CenterScreen"
  $form.FormBorderStyle = "FixedDialog"
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.TopMost = $true
  $form.BackColor = [System.Drawing.Color]::FromArgb(20, 21, 26)
  $form.ForeColor = [System.Drawing.Color]::White

  $lblTitle = New-Object System.Windows.Forms.Label
  $lblTitle.Text = "XÁC THỰC BẢN QUYỀN DAWA OPTIMIZER"
  $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
  $lblTitle.ForeColor = [System.Drawing.Color]::FromArgb(0, 194, 255)
  $lblTitle.Location = New-Object System.Drawing.Point(24, 16)
  $lblTitle.Size = New-Object System.Drawing.Size(420, 24)
  $form.Controls.Add($lblTitle)

  $lblDesc = New-Object System.Windows.Forms.Label
  $lblDesc.Text = "Nhập mã key (12 ký tự, ví dụ: XXXX-XXXX-XXXX) để bắt đầu cài đặt:"
  $lblDesc.Font = New-Object System.Drawing.Font("Segoe UI", 9)
  $lblDesc.ForeColor = [System.Drawing.Color]::FromArgb(180, 185, 195)
  $lblDesc.Location = New-Object System.Drawing.Point(24, 44)
  $lblDesc.Size = New-Object System.Drawing.Size(420, 20)
  $form.Controls.Add($lblDesc)

  $txtKey = New-Object System.Windows.Forms.TextBox
  $txtKey.Font = New-Object System.Drawing.Font("Consolas", 13, [System.Drawing.FontStyle]::Bold)
  $txtKey.Location = New-Object System.Drawing.Point(24, 72)
  $txtKey.Size = New-Object System.Drawing.Size(416, 30)
  $txtKey.TextAlign = "Center"
  $txtKey.BackColor = [System.Drawing.Color]::FromArgb(30, 32, 40)
  $txtKey.ForeColor = [System.Drawing.Color]::FromArgb(0, 255, 180)
  $txtKey.BorderStyle = "FixedSingle"
  $txtKey.CharacterCasing = "Upper"
  $txtKey.MaxLength = 24
  $form.Controls.Add($txtKey)

  $lblStatus = New-Object System.Windows.Forms.Label
  $lblStatus.Text = ""
  $lblStatus.Font = New-Object System.Drawing.Font("Segoe UI", 8.5)
  $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 80, 80)
  $lblStatus.Location = New-Object System.Drawing.Point(24, 110)
  $lblStatus.Size = New-Object System.Drawing.Size(416, 38)
  $form.Controls.Add($lblStatus)

  $btnOk = New-Object System.Windows.Forms.Button
  $btnOk.Text = "Tiếp Tục Cài Đặt"
  $btnOk.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
  $btnOk.Size = New-Object System.Drawing.Size(200, 38)
  $btnOk.Location = New-Object System.Drawing.Point(24, 160)
  $btnOk.BackColor = [System.Drawing.Color]::FromArgb(0, 140, 225)
  $btnOk.ForeColor = [System.Drawing.Color]::White
  $btnOk.FlatStyle = "Flat"
  $btnOk.FlatAppearance.BorderSize = 0
  $btnOk.Cursor = [System.Windows.Forms.Cursors]::Hand
  $form.Controls.Add($btnOk)

  $btnCancel = New-Object System.Windows.Forms.Button
  $btnCancel.Text = "Hủy Bỏ"
  $btnCancel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
  $btnCancel.Size = New-Object System.Drawing.Size(200, 38)
  $btnCancel.Location = New-Object System.Drawing.Point(240, 160)
  $btnCancel.BackColor = [System.Drawing.Color]::FromArgb(45, 48, 56)
  $btnCancel.ForeColor = [System.Drawing.Color]::FromArgb(180, 185, 195)
  $btnCancel.FlatStyle = "Flat"
  $btnCancel.FlatAppearance.BorderSize = 0
  $btnCancel.Cursor = [System.Windows.Forms.Cursors]::Hand
  $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($btnCancel)
  $form.CancelButton = $btnCancel

  $script:finalResult = "CANCEL"
  $script:validatedKey = ""

  $btnCancel.Add_Click({
      Write-GateLog "WARN" "User clicked Cancel — gate abort."
      $script:finalResult = "CANCEL"
      $form.Close()
  })

  $btnOk.Add_Click({
      $raw = $txtKey.Text.Trim().ToUpper()
      Write-GateLog "INFO" ("User submit key. Input length=" + $raw.Length)
      if ([string]::IsNullOrWhiteSpace($raw)) {
          Write-GateLog "WARN" "Empty key — prompt."
          $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 90, 90)
          $lblStatus.Text = "Vui lòng nhập mã key bản quyền."
          $txtKey.Focus()
          return
      }

      # Normalize key: uppercase alphanumeric, chunk by 4
      $clean = ($raw -replace '[^A-Z0-9]', '')
      if ($clean.Length -lt 8 -or $clean.Length -gt 24) {
          Write-GateLog "WARN" ("Key too short/long — clean length=" + $clean.Length)
          $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 90, 90)
          $lblStatus.Text = "Định dạng key không đúng (12 ký tự, ví dụ: XXXX-XXXX-XXXX)."
          $txtKey.Focus()
          return
      }

      # Auto format chunks if user entered without hyphens
      $chunks = [regex]::Matches($clean, '.{1,4}') | ForEach-Object { $_.Value }
      $formattedKey = ($chunks -join '-')
      Write-GateLog "INFO" ("Formatted key: " + ($formattedKey.Substring(0,[Math]::Min(6,$formattedKey.Length))) + "**** (len=" + $formattedKey.Length + ")")

      # Update input display with formatted key
      $txtKey.Text = $formattedKey

      # Disable UI during check
      $btnOk.Enabled = $false
      $btnCancel.Enabled = $false
      $txtKey.Enabled = $false
      $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 194, 255)
      $lblStatus.Text = "Đang kết nối máy chủ xác thực key..."
      $form.Refresh()
      Write-GateLog "INFO" "Calling backend validate at https://rduc.onrender.com/api/license/validate (timeout=15s)"

      # Collect lightweight HWID
      try {
        $uuid = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue | Select-Object -ExpandProperty UUID) -replace '[^A-Z0-9-]',''
        $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ProcessorId) -replace '[^A-Z0-9]',''
        $serial = (Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -ExpandProperty SerialNumber) -replace '[^A-Z0-9]',''
        $machine = $env:COMPUTERNAME
        $hwid = ($uuid + '_' + $cpu + '_' + $serial + '_' + $machine).Trim('_')
      } catch {
        $hwid = "UNKNOWN-HWID"
      }
      if ([string]::IsNullOrWhiteSpace($hwid)) { $hwid = "UNKNOWN-HWID" }
      Write-GateLog "INFO" ("HWID computed: " + $hwid.Length + " chars, machine=" + $machine)

      try {
        $osInfo = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue | ForEach-Object { $_.Caption + ' ' + $_.Version })
      } catch { $osInfo = "unknown-os" }

      $body = @{
          key_code = $formattedKey
          hardware_id = $hwid
          device_hash = $hwid
          device_name = $machine
          os_info = $osInfo
      } | ConvertTo-Json -Compress

      try {
          [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
          Write-GateLog "INFO" "POST → sending request..."
          $resp = Invoke-RestMethod -Uri 'https://rduc.onrender.com/api/license/validate' -Method POST -Body $body -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 15
          Write-GateLog "INFO" ("HTTP 200 OK. response.success=" + $resp.success + " response.valid=" + $resp.valid)
          if ($resp.message) { Write-GateLog "INFO" ("Backend message: " + $resp.message) }

          if ($resp.success -and $resp.valid) {
              Write-GateLog "SUCCESS" "Key validated by backend. Saving to HKCU registry..."
              $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(0, 255, 150)
              $lblStatus.Text = "Key hợp lệ! Đang chuẩn bị cài đặt..."
              $form.Refresh()
              Start-Sleep -Milliseconds 600

              # Save key to registry
              try {
                  $regPath = "HKCU:\Software\DAWA Optimizer"
                  if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
                  Set-ItemProperty -Path $regPath -Name "LicenseKey" -Value $formattedKey -Force | Out-Null
                  Set-ItemProperty -Path $regPath -Name "ValidatedByInstaller" -Value 1 -Type DWord -Force | Out-Null
                  Write-GateLog "SUCCESS" ("Registry saved → " + $regPath + "\LicenseKey + ValidatedByInstaller=1")
              } catch {
                  Write-GateLog "ERROR" ("Registry save FAILED: " + $_.Exception.Message)
              }

              $script:finalResult = "OK"
              $script:validatedKey = $formattedKey
              Write-GateLog "SUCCESS" "Gate PASSED — closing form, return OK|<masked>"
              $form.Close()
              return
          } else {
              $msg = $resp.message
              if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "Key không hợp lệ hoặc đã hết hạn." }
              Write-GateLog "WARN" ("Backend rejected key: " + $msg)
              $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 90, 90)
              $lblStatus.Text = $msg
          }
      } catch {
          $err = $_.Exception.Message
          Write-GateLog "ERROR" ("HTTP exception: " + $err)
          $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 90, 90)
          if ($err -match "400" -or $err -match "BadRequest") {
              $lblStatus.Text = "Key không hợp lệ hoặc thiết bị không đúng."
          } elseif ($err -match "403") {
              $lblStatus.Text = "Thiết bị hoặc key này đã bị khóa."
          } elseif ($err -match "timeout" -or $err -match "Unable to connect") {
              $lblStatus.Text = "Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại."
          } else {
              $lblStatus.Text = "Lỗi kết nối: " + $err
          }
      }

      # Re-enable UI for retry
      Write-GateLog "WARN" "Gate step FAILED — re-enabling UI for retry."
      $btnOk.Enabled = $true
      $btnCancel.Enabled = $true
      $txtKey.Enabled = $true
      $txtKey.Focus()
      $txtKey.SelectAll()
  })

  Write-GateLog "INFO" "Showing dialog as modal (TopMost=true, CenterScreen)."
  $null = $form.ShowDialog()
  Write-GateLog "INFO" ("Dialog closed. finalResult=" + $script:finalResult + ". validatedKey empty?=" + [string]::IsNullOrWhiteSpace($script:validatedKey))

  $resultFile = Join-Path $PSScriptRoot "gate-result.txt"
  if ($script:finalResult -eq "OK") {
      try { Set-Content -Path $resultFile -Value ("OK|" + $script:validatedKey) -Encoding ASCII -Force } catch { Write-GateLog "ERROR" ("Failed to write gate-result.txt to $resultFile : " + $_.Exception.Message) }
      Write-GateLog "INFO" ("Wrote OK result → $resultFile")
      Write-Output ("OK|" + $script:validatedKey)
  } else {
      try { Set-Content -Path $resultFile -Value "CANCEL" -Encoding ASCII -Force } catch { Write-GateLog "ERROR" ("Failed to write CANCEL to $resultFile : " + $_.Exception.Message) }
      Write-GateLog "WARN" ("Wrote CANCEL result → $resultFile")
      Write-Output "CANCEL"
  }
}

Write-GateLog "INFO" "Entering Show-LicenseGate main call."
try {
  Show-LicenseGate
  Write-GateLog "INFO" "Show-LicenseGate returned normally."
} catch {
  Write-GateLog "FATAL" ("Show-LicenseGate unhandled exception: " + $_.Exception.Message + " stack=" + $_.ScriptStackTrace)
  # Also try to write CANCEL so NSIS gate doesn't hang
  $resultFile = Join-Path $PSScriptRoot "gate-result.txt"
  try { Set-Content -Path $resultFile -Value "CANCEL" -Encoding ASCII -Force -ErrorAction SilentlyContinue } catch {}
  throw
}

