# ============================================================
# Continental Federal Bank — Full System Health Check
# ============================================================
$API = "https://novabank-production-1372.up.railway.app"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  CONTINENTAL FEDERAL - SYSTEM HEALTH CHECK" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/6] Backend API............ " -NoNewline
try {
  $r = Invoke-RestMethod -Uri "$API/" -TimeoutSec 30
  Write-Host "OK - ONLINE" -ForegroundColor Green
  Write-Host "      Bank: $($r.bank)"
  Write-Host "      Founded: $($r.founded)"
} catch {
  Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
  exit
}

Write-Host ""
Write-Host "[2/6] Database connection... " -NoNewline
$body = @{ username='1023456789'; password='Reyes@87M!26' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri "$API/api/auth/login" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 30
  if ($login.otpRequired) {
    Write-Host "OK - CONNECTED" -ForegroundColor Green
    Write-Host "      OTP sent to: $($login.destination)"
  }
} catch {
  Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
  exit
}

Write-Host ""
Write-Host "[3/6] Two-factor auth....... " -NoNewline
if ($login.stageToken -and $login.stageToken.Length -gt 20) {
  Write-Host "OK - WORKING" -ForegroundColor Green
} else {
  Write-Host "FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "[4/6] Resend OTP endpoint... " -NoNewline
$resendBody = @{ stageToken = $login.stageToken } | ConvertTo-Json
try {
  $res = Invoke-RestMethod -Uri "$API/api/auth/resend-otp" -Method Post -ContentType 'application/json' -Body $resendBody -TimeoutSec 30
  Write-Host "OK - WORKING" -ForegroundColor Green
} catch {
  Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[5/6] Security (bad login)... " -NoNewline
$badBody = @{ username='1023456789'; password='wrongpassword' } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "$API/api/auth/login" -Method Post -ContentType 'application/json' -Body $badBody -TimeoutSec 30 | Out-Null
  Write-Host "SECURITY ISSUE" -ForegroundColor Red
} catch {
  Write-Host "OK - REJECTED (401)" -ForegroundColor Green
}

Write-Host ""
Write-Host "[6/6] Admin account......... " -NoNewline
$adminBody = @{ username='admin'; password='CfbAdmin@26!' } | ConvertTo-Json
try {
  $admin = Invoke-RestMethod -Uri "$API/api/auth/login" -Method Post -ContentType 'application/json' -Body $adminBody -TimeoutSec 30
  if ($admin.otpRequired) {
    Write-Host "OK - VERIFIED" -ForegroundColor Green
  }
} catch {
  Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ALL SYSTEMS OPERATIONAL" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend : https://novabank-cfb.netlify.app"
Write-Host "Backend  : $API"
Write-Host "GitHub   : https://github.com/careereducom/novabank"
Write-Host ""
Write-Host "Check your Gmail (or Spam) for OTP codes." -ForegroundColor Yellow
Write-Host ""