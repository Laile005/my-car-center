param([int]$Days = 28, [string]$OutputDirectory = 'reports/marketing-archive-status')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
. (Join-Path $repo 'scripts/weekly-marketing-report.ps1') -Help | Out-Null
$config = Get-DefaultSecrets
$credential = Join-Path $env:USERPROFILE 'Codex/.codex-secrets/yamamoto-mycar-ga4.json'
$google = Get-GoogleAccessToken -CredentialPath $credential -Scope 'https://www.googleapis.com/auth/analytics.readonly'
$gaHeaders = @{ Authorization = "Bearer $($google.AccessToken)" }
$search = Get-GoogleAccessToken -CredentialPath $credential -Scope 'https://www.googleapis.com/auth/webmasters.readonly'
$scHeaders = @{ Authorization = "Bearer $($search.AccessToken)" }
$today = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, [TimeZoneInfo]::FindSystemTimeZoneById('Tokyo Standard Time')).Date
$currentEnd = $today.AddDays(-1)
$currentStart = $currentEnd.AddDays(1 - $Days)
$previousEnd = $currentStart.AddDays(-1)
$previousStart = $previousEnd.AddDays(1 - $Days)
$aiPattern = '^(openai|chatgpt|perplexity|claude|gemini|copilot|poe|([a-z0-9-]+\.)*(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|poe\.com)) / .*$'
$events = @('phone_click','phone_prompt_open','phone_dial','directions_click','goo_net_click','used_car_consultation_click','used_car_consultation_view','used_car_stock_view','new_car_consultation_click','new_car_consultation_view','indeed_apply_click','recruit_form_submit_success','llm_referral_visit')
$result = @{ observedAt = [DateTime]::UtcNow.ToString('o'); ga4 = @{}; searchConsole = @{}; issues = @(); clarity = @{ status = 'Not requested: preserve export quota; use timestamped saved snapshots.' } }
$gaUrl = "https://analyticsdata.googleapis.com/v1beta/properties/$($config.ga4PropertyId):runReport"
$scSite = if ($config.searchConsoleSiteUrl) { $config.searchConsoleSiteUrl } else { 'sc-domain:yamamoto-mycar.com' }
$scUrl = 'https://searchconsole.googleapis.com/webmasters/v3/sites/' + [uri]::EscapeDataString($scSite) + '/searchAnalytics/query'
$windows = @(@{ name = 'current'; start = $currentStart; end = $currentEnd }, @{ name = 'previous'; start = $previousStart; end = $previousEnd })
foreach ($window in $windows) {
  $range = @{ startDate = $window.start.ToString('yyyy-MM-dd'); endDate = $window.end.ToString('yyyy-MM-dd') }
  $data = @{ range = $range }
  $requests = @(
    @{ name = 'summary'; dimensions = @(); metrics = @('activeUsers','totalUsers','sessions','screenPageViews','engagedSessions','eventCount') },
    @{ name = 'pages'; dimensions = @('pagePath'); metrics = @('screenPageViews','activeUsers','sessions','engagedSessions','userEngagementDuration') },
    @{ name = 'landings'; dimensions = @('landingPage','sessionSourceMedium'); metrics = @('sessions','activeUsers','screenPageViews') },
    @{ name = 'actions'; dimensions = @('eventName','pagePath','sessionSourceMedium'); metrics = @('eventCount','totalUsers','sessions'); filter = @{ filter = @{ fieldName = 'eventName'; inListFilter = @{ values = $events } } } },
    @{ name = 'ai'; dimensions = @('date','sessionSourceMedium','landingPage'); metrics = @('sessions','activeUsers','screenPageViews'); filter = @{ filter = @{ fieldName = 'sessionSourceMedium'; stringFilter = @{ matchType = 'FULL_REGEXP'; value = $aiPattern; caseSensitive = $false } } } },
    @{ name = 'purchase'; dimensions = @('eventName','newVsReturning','sessionSourceMedium','pagePath'); metrics = @('eventCount','totalUsers','sessions'); filter = @{ filter = @{ fieldName = 'eventName'; inListFilter = @{ values = @('goo_net_click','used_car_consultation_click','used_car_consultation_view','new_car_consultation_click','new_car_consultation_view') } } } }
  )
  foreach ($request in $requests) {
    try {
      $body = @{ dateRanges = @($range); dimensions = @($request.dimensions | ForEach-Object { @{ name = $_ } }); metrics = @($request.metrics | ForEach-Object { @{ name = $_ } }); limit = 10000; orderBys = @(@{ metric = @{ metricName = $request.metrics[0] }; desc = $true }) }
      if ($request.filter) { $body.dimensionFilter = $request.filter }
      $data[$request.name] = Invoke-JsonApi -Uri $gaUrl -Method Post -Headers $gaHeaders -Body $body
    } catch { $result.issues += "GA4 $($window.name) $($request.name): $($_.Exception.Message)" }
  }
  $result.ga4[$window.name] = $data
  $scRange = @{ startDate = $window.start.AddDays(-2).ToString('yyyy-MM-dd'); endDate = $window.end.AddDays(-2).ToString('yyyy-MM-dd'); type = 'web'; dataState = 'final'; rowLimit = 25000 }
  $data = @{ range = $scRange; property = $scSite }
  foreach ($request in @(@{ name='summary'; dims=@() }, @{ name='queries'; dims=@('query') }, @{ name='pages'; dims=@('page') }, @{ name='queryPages'; dims=@('query','page') })) {
    try { $data[$request.name] = Invoke-JsonApi -Uri $scUrl -Method Post -Headers $scHeaders -Body ($scRange + @{ dimensions = $request.dims }) }
    catch { $result.issues += "Search Console $($window.name) $($request.name): $($_.Exception.Message)" }
  }
  $result.searchConsole[$window.name] = $data
}
try {
  $key = Get-Content -Raw (Join-Path $env:USERPROFILE 'Codex/.codex-secrets/crawler-report.json') | ConvertFrom-Json
  $result.crawlers = Invoke-JsonApi -Uri 'https://yamamoto-mycar.com/.netlify/functions/crawler-report?days=56' -Method Get -Headers @{ Authorization = "Bearer $($key.token)" }
} catch { $result.issues += "Crawler report: $($_.Exception.Message)" }
$directory = [IO.Path]::GetFullPath((Join-Path $repo $OutputDirectory))
if (-not $directory.StartsWith($repo + [IO.Path]::DirectorySeparatorChar)) { throw 'Output must remain in the repository workspace' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$result | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath (Join-Path $directory 'current-status.json') -Encoding UTF8
Write-Output "Status saved. GA4: $($currentStart.ToString('yyyy-MM-dd')) to $($currentEnd.ToString('yyyy-MM-dd')); issues: $($result.issues.Count). Clarity API was not called."
if ($result.issues.Count) { $result.issues | ForEach-Object { Write-Warning $_ } }
