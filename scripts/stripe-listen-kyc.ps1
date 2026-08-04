$stripe = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\stripe.exe"
if (-not (Test-Path $stripe)) {
  $stripe = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe"
}
& $stripe listen --forward-to http://localhost:5001/api/kyc/webhook
