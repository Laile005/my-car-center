$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$errors = New-Object System.Collections.Generic.List[string]
$verificationFile = 'google45bdb2885daf7421.html'
$htmlFiles = @(rg --files -g '*.html')
$pageFiles = @($htmlFiles | Where-Object { $_ -ne $verificationFile })

foreach ($file in $pageFiles) {
  $html = [IO.File]::ReadAllText((Join-Path $root $file))
  $tagCount = ([regex]::Matches($html, '<script src="/analytics-head\.js"></script>')).Count
  if ($tagCount -ne 1) { $errors.Add("${file}: analytics bootstrap count is $tagCount") }

  $bootstrapIndex = $html.IndexOf('<script src="/analytics-head.js"></script>', [StringComparison]::Ordinal)
  $siteScript = [regex]::Match($html, '<script[^>]+src=["''][^"'']*script\.js["'']', 'IgnoreCase')
  if ($siteScript.Success -and $bootstrapIndex -gt $siteScript.Index) {
    $errors.Add("${file}: analytics bootstrap is not before script.js")
  }

  $jsonLdBlocks = [regex]::Matches($html, '<script[^>]+type=["'']application/ld\+json["''][^>]*>([\s\S]*?)</script>', 'IgnoreCase')
  foreach ($block in $jsonLdBlocks) {
    try { $null = $block.Groups[1].Value | ConvertFrom-Json }
    catch { $errors.Add("${file}: invalid JSON-LD ($($_.Exception.Message))") }
  }
}

$verification = [IO.File]::ReadAllText((Join-Path $root $verificationFile))
if (-not $verification.Contains('google-site-verification:')) {
  $errors.Add("${verificationFile}: Search Console verification content is missing")
}

$recruit = [IO.File]::ReadAllText((Join-Path $root 'recruit.html'))
if (-not [regex]::IsMatch($recruit, '<form\b(?=[^>]*class=["''][^"'']*\brg-form\b)(?=[^>]*data-clarity-mask=["'']true["''])[^>]*>', 'IgnoreCase')) {
  $errors.Add('recruit.html: recruit form is not explicitly masked for Clarity')
}
if (-not [regex]::IsMatch($recruit, '<p\b(?=[^>]*id=["'']entry-result["''])(?=[^>]*data-clarity-mask=["'']true["''])[^>]*>', 'IgnoreCase')) {
  $errors.Add('recruit.html: recruit result is not explicitly masked for Clarity')
}

$runtimeFiles = @(rg --files -g '*.html' -g '*.js' -g '*.toml' | Where-Object {
  $_ -notlike 'docs/*' -and $_ -notlike 'scripts/*'
})
$runtime = ($runtimeFiles | ForEach-Object { [IO.File]::ReadAllText((Join-Path $root $_)) }) -join "`n"
$gaIds = @([regex]::Matches($runtime, '\bG-[A-Z0-9]{10}\b') | ForEach-Object { $_.Value })
$clarityIds = @([regex]::Matches($runtime, '\bclarityId:\s*["'']([a-z0-9]+)["'']') | ForEach-Object { $_.Groups[1].Value })
if ($gaIds.Count -ne 1 -or $gaIds[0] -ne 'G-65GV6BS65C') { $errors.Add("runtime GA4 ID mismatch/count: $($gaIds -join ',')") }
if ($clarityIds.Count -ne 1 -or $clarityIds[0] -ne 'xh8bpqs76a') { $errors.Add("runtime Clarity ID mismatch/count: $($clarityIds -join ',')") }
if (([regex]::Matches($runtime, 'gtag\(["'']config["'']')).Count -ne 1) { $errors.Add('gtag config must occur exactly once') }
if (([regex]::Matches($runtime, 'googletagmanager\.com/gtag/js')).Count -ne 1) { $errors.Add('GA4 loader must occur exactly once') }
if (([regex]::Matches($runtime, 'clarity\.ms/tag/')).Count -ne 1) { $errors.Add('Clarity loader must occur exactly once') }
if (Test-Path (Join-Path $root 'analytics-config.js')) { $errors.Add('retired analytics-config.js still exists') }

$events = @('phone_click','goo_net_click','cta_click','article_card_click','recruit_link_click','recruit_form_submit_start','recruit_form_submit_success','recruit_form_submit_error','scroll_depth','recruit_entry_view','sales_section_view','column_section_view','used_car_stock_view')
foreach ($eventName in $events) {
  if (-not $runtime.Contains("'$eventName'")) { $errors.Add("event missing: $eventName") }
}

try { $null = [xml][IO.File]::ReadAllText((Join-Path $root 'sitemap.xml')) }
catch { $errors.Add("sitemap.xml is invalid XML ($($_.Exception.Message))") }

if ($errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Error $_ }
  exit 1
}
Write-Output "Analytics verification passed for $($pageFiles.Count) HTML pages."