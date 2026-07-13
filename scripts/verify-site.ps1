$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$verificationFile = 'google45bdb2885daf7421.html'
$htmlFiles = Get-ChildItem $root -Recurse -Filter *.html | Where-Object {
  $_.FullName -notmatch '\\design-mock\\' -and $_.Name -ne $verificationFile
}
$errors = New-Object System.Collections.Generic.List[string]

foreach ($file in $htmlFiles) {
  $html = [IO.File]::ReadAllText($file.FullName)
  $relative = $file.FullName.Substring($root.Length + 1)
  $isNoIndex = $html -match '<meta\s+name=["'']robots["''][^>]+noindex'

  $h1Count = ([regex]::Matches($html, '<h1\b', 'IgnoreCase')).Count
  if ($h1Count -ne 1) { $errors.Add("${relative}: h1 count is $h1Count") }
  if ($html -notmatch '<title>[^<]+</title>') { $errors.Add("${relative}: title is missing") }

  if (-not $isNoIndex) {
    if ($html -notmatch '<meta\s+name=["'']description["'']') { $errors.Add("${relative}: description is missing") }
    if ($html -notmatch '<link\s+rel=["'']canonical["'']') { $errors.Add("${relative}: canonical is missing") }
  }

  $htmlWithoutComments = [regex]::Replace($html, '<!--[\s\S]*?-->', '')
  foreach ($image in [regex]::Matches($htmlWithoutComments, '<img\b[^>]*>', 'IgnoreCase')) {
    if ($image.Value -notmatch '\balt=["''][^"'']*["'']') { $errors.Add("${relative}: image alt is missing") }
  }

  foreach ($match in [regex]::Matches($html, 'href=["'']([^"'']+)["'']', 'IgnoreCase')) {
    $href = $match.Groups[1].Value
    if ($href -match '^(https?:|tel:|mailto:|javascript:|#|data:)' -or $href.Contains('${')) { continue }

    $path = ($href -split '[?#]')[0]
    if ([string]::IsNullOrWhiteSpace($path)) { continue }

    if ($path.StartsWith('/')) {
      $target = Join-Path $root $path.TrimStart('/')
    } else {
      $target = [IO.Path]::GetFullPath((Join-Path $file.DirectoryName $path))
    }

    if ($path.EndsWith('/')) {
      $target = Join-Path $target 'index.html'
    } elseif (-not [IO.Path]::GetExtension($target) -and (Test-Path ($target + '.html'))) {
      $target = $target + '.html'
    }

    if (-not (Test-Path $target)) { $errors.Add("${relative}: broken link $href") }
  }
}

$publicTextFiles = Get-ChildItem $root -Recurse -Include *.html,*.js -ErrorAction SilentlyContinue | Where-Object {
  $_.FullName -notmatch '\\design-mock\\' -and $_.FullName -notmatch '\\node_modules\\'
}
$awkwardPattern = '短い結論|AI・検索向け|検索向け要約|町の整備工場|整備まで見|Clarityやアクセス状況|アクセス状況を見ながら'
foreach ($file in $publicTextFiles) {
  $text = [IO.File]::ReadAllText($file.FullName)
  if ($text -match $awkwardPattern) {
    $relative = $file.FullName.Substring($root.Length + 1)
    $errors.Add("${relative}: internal or awkward wording remains")
  }
}

try { $null = [xml][IO.File]::ReadAllText((Join-Path $root 'sitemap.xml')) }
catch { $errors.Add("sitemap.xml: invalid XML ($($_.Exception.Message))") }

if ($errors.Count) {
  $errors | Sort-Object -Unique | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Output "Site verification passed for $($htmlFiles.Count) HTML pages."
