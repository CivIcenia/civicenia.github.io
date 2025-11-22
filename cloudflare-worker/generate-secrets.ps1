# PowerShell helper: generate and push Cloudflare Worker secrets for GitHub OAuth
# Usage: Open PowerShell in this folder and run: .\generate-secrets.ps1
# Requirements: wrangler installed and authenticated (wrangler login)

# Check wrangler
if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
  Write-Host "wrangler not found in PATH. Install via `npm i -g wrangler` and run `wrangler login` " -ForegroundColor Red
  exit 1
}

Write-Host "1) Paste your GitHub OAuth Client ID (from GitHub Developer Settings)." -ForegroundColor Cyan
$clientId = Read-Host "GitHub Client ID"
$clientId | wrangler secret put GITHUB_CLIENT_ID

Write-Host "2) Paste your GitHub OAuth Client Secret (input hidden)." -ForegroundColor Cyan
$secure = Read-Host -AsSecureString "GitHub Client Secret (hidden)"
$ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$clientSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
$clientSecret | wrangler secret put GITHUB_CLIENT_SECRET

Write-Host "3) Generating a strong SESSION_SECRET (32 bytes, hex)..." -ForegroundColor Cyan
$bytes = New-Object 'System.Byte[]' 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$sessionSecret = ([System.BitConverter]::ToString($bytes) -replace '-','').ToLower()
Write-Host "Generated SESSION_SECRET (hex): $sessionSecret" -ForegroundColor Yellow
$sessionSecret | wrangler secret put SESSION_SECRET

Write-Host "All secrets written to Cloudflare. Verify with: wrangler secret list" -ForegroundColor Green