param(
  [string]$Ga4PropertyId,
  [string]$Ga4ServiceAccount,
  [string]$ClarityToken,
  [string]$ClarityProjectId,
  [string]$Output,
  [string]$DataDir,
  [string]$StartDate = '7daysAgo',
  [string]$EndDate = 'today',
  [switch]$Help
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Get-DefaultSecrets {
  $secretPath = Join-Path $env:USERPROFILE '.codex-secrets\marketing-report-secrets.json'
  if (-not (Test-Path $secretPath)) { return $null }
  return Get-Content -Raw -LiteralPath $secretPath | ConvertFrom-Json
}

function Get-Value {
  param(
    [string]$Explicit,
    [string]$EnvName,
    [object]$Secrets,
    [string]$SecretProperty
  )

  if ($Explicit) { return $Explicit }
  $envValue = [Environment]::GetEnvironmentVariable($EnvName)
  if ($envValue) { return $envValue }
  if ($Secrets -and $Secrets.PSObject.Properties.Name -contains $SecretProperty) {
    return [string]$Secrets.$SecretProperty
  }
  return $null
}

function Show-Help {
  @(
    'Usage:',
    '  powershell -ExecutionPolicy Bypass -File .\scripts\weekly-marketing-report.ps1 [options]',
    '',
    'Options:',
    '  -Ga4PropertyId <id>       Google Analytics 4 property ID',
    '  -Ga4ServiceAccount <path> Google credential JSON path',
    '  -ClarityToken <token>     Microsoft Clarity Data Export token',
    '  -ClarityProjectId <id>    Optional Clarity project id',
    '  -Output <path>            Markdown output path',
    '  -DataDir <path>           Raw JSON output directory',
    '  -StartDate <date>         GA4 start date (default: 7daysAgo)',
    '  -EndDate <date>           GA4 end date (default: today)',
    '  -Help                     Show this help',
    '',
    'Fallbacks:',
    '  $env:MCC_GA4_PROPERTY_ID',
    '  $env:GOOGLE_APPLICATION_CREDENTIALS',
  '  User ADC file created by `gcloud auth application-default login`',
    '  $env:MCC_CLARITY_TOKEN',
    '  $env:MCC_CLARITY_PROJECT_ID',
    '  C:\Users\ko0v0\.codex-secrets\marketing-report-secrets.json'
  ) | ForEach-Object { Write-Output $_ }
}

if (-not ('JwtRsaSigner' -as [type])) {
  Add-Type -Language CSharp -TypeDefinition @"
using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

public static class JwtRsaSigner
{
    public static string Sign(string pem, string clientEmail, string scope, string keyId)
    {
        string header = string.IsNullOrEmpty(keyId)
            ? "{\"alg\":\"RS256\",\"typ\":\"JWT\"}"
            : "{\"alg\":\"RS256\",\"typ\":\"JWT\",\"kid\":\"" + EscapeJson(keyId) + "\"}";

        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        string payload = "{\"iss\":\"" + EscapeJson(clientEmail) + "\",\"scope\":\"" + EscapeJson(scope) + "\",\"aud\":\"https://oauth2.googleapis.com/token\",\"iat\":" + now.ToString(CultureInfo.InvariantCulture) + ",\"exp\":" + (now + 3600).ToString(CultureInfo.InvariantCulture) + "}";
        string signingInput = Base64UrlEncode(Encoding.UTF8.GetBytes(header)) + "." + Base64UrlEncode(Encoding.UTF8.GetBytes(payload));

        RSAParameters parameters = ParsePrivateKey(pem);
        using (RSACryptoServiceProvider rsa = new RSACryptoServiceProvider())
        {
            rsa.ImportParameters(parameters);
            byte[] hash;
            using (SHA256 sha = SHA256.Create())
            {
                hash = sha.ComputeHash(Encoding.ASCII.GetBytes(signingInput));
            }

            RSAPKCS1SignatureFormatter formatter = new RSAPKCS1SignatureFormatter(rsa);
            formatter.SetHashAlgorithm("SHA256");
            byte[] signature = formatter.CreateSignature(hash);
            return signingInput + "." + Base64UrlEncode(signature);
        }
    }

    private static string EscapeJson(string value)
    {
        return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    private static string Base64UrlEncode(byte[] value)
    {
        return Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static RSAParameters ParsePrivateKey(string pem)
    {
        string clean = pem
            .Replace("-----BEGIN PRIVATE KEY-----", string.Empty)
            .Replace("-----END PRIVATE KEY-----", string.Empty)
            .Replace("-----BEGIN RSA PRIVATE KEY-----", string.Empty)
            .Replace("-----END RSA PRIVATE KEY-----", string.Empty)
            .Replace("\r", string.Empty)
            .Replace("\n", string.Empty)
            .Trim();

        byte[] der = Convert.FromBase64String(clean);
        DerReader outer = new DerReader(der);
        DerReader sequence = outer.ReadSequence();
        sequence.ReadInteger();
        sequence.SkipElement();
        byte[] pkcs1 = sequence.ReadOctetString();
        return ParsePkcs1(pkcs1);
    }

    private static RSAParameters ParsePkcs1(byte[] pkcs1)
    {
        DerReader reader = new DerReader(pkcs1);
        DerReader sequence = reader.ReadSequence();
        sequence.ReadInteger();

        RSAParameters p = new RSAParameters();
        p.Modulus = TrimLeadingZero(sequence.ReadInteger());
        p.Exponent = TrimLeadingZero(sequence.ReadInteger());
        p.D = TrimLeadingZero(sequence.ReadInteger());
        p.P = TrimLeadingZero(sequence.ReadInteger());
        p.Q = TrimLeadingZero(sequence.ReadInteger());
        p.DP = TrimLeadingZero(sequence.ReadInteger());
        p.DQ = TrimLeadingZero(sequence.ReadInteger());
        p.InverseQ = TrimLeadingZero(sequence.ReadInteger());
        return p;
    }

    private static byte[] TrimLeadingZero(byte[] value)
    {
        int index = 0;
        while (index < value.Length - 1 && value[index] == 0x00)
        {
            index++;
        }

        if (index == 0)
        {
            return value;
        }

        byte[] result = new byte[value.Length - index];
        Buffer.BlockCopy(value, index, result, 0, result.Length);
        return result;
    }

    private sealed class DerReader
    {
        private readonly byte[] data;
        private int position;

        public DerReader(byte[] data)
        {
            this.data = data;
            this.position = 0;
        }

        public DerReader ReadSequence()
        {
            return new DerReader(ReadElement(0x30));
        }

        public byte[] ReadInteger()
        {
            return ReadElement(0x02);
        }

        public byte[] ReadOctetString()
        {
            return ReadElement(0x04);
        }

        public void SkipElement()
        {
            ReadTag();
            int length = ReadLength();
            EnsureAvailable(length);
            position += length;
        }

        private byte[] ReadElement(byte expectedTag)
        {
            byte tag = ReadTag();
            if (tag != expectedTag)
            {
                throw new CryptographicException("Unexpected DER tag");
            }

            int length = ReadLength();
            return ReadBytes(length);
        }

        private byte ReadTag()
        {
            EnsureAvailable(1);
            return data[position++];
        }

        private int ReadLength()
        {
            EnsureAvailable(1);
            int first = data[position++];
            if ((first & 0x80) == 0)
            {
                return first;
            }

            int byteCount = first & 0x7F;
            if (byteCount <= 0 || byteCount > 4)
            {
                throw new CryptographicException("Invalid DER length");
            }

            EnsureAvailable(byteCount);
            int length = 0;
            for (int i = 0; i < byteCount; i++)
            {
                length = (length << 8) | data[position++];
            }

            return length;
        }

        private byte[] ReadBytes(int count)
        {
            EnsureAvailable(count);
            byte[] result = new byte[count];
            Buffer.BlockCopy(data, position, result, 0, count);
            position += count;
            return result;
        }

        private void EnsureAvailable(int count)
        {
            if (position + count > data.Length)
            {
                throw new CryptographicException("Unexpected end of DER data");
            }
        }
    }
}
"@
}

function Invoke-JsonApi {
  param(
    [string]$Uri,
    [string]$Method,
    [hashtable]$Headers,
    [object]$Body
  )

  try {
    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 20 -Compress
      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ContentType 'application/json' -Body $json
    }

    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
  }
  catch {
    $detail = $null
    if ($_.Exception.Response) {
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object IO.StreamReader($stream)
          $detail = $reader.ReadToEnd()
        }
      }
      catch {
        $detail = $null
      }
    }

    if ($detail) {
      throw ("Request failed [{0} {1}]: {2}; Body: {3}" -f $Method, $Uri, $_.Exception.Message, $detail)
    }

    throw ("Request failed [{0} {1}]: {2}" -f $Method, $Uri, $_.Exception.Message)
  }
}

function Build-MarkdownTable {
  param(
    [string[]]$Headers,
    [object[][]]$Rows
  )

  if (-not $Rows -or $Rows.Count -eq 0) {
    $Rows = @(@('No data'))
  }

  $widths = for ($i = 0; $i -lt $Headers.Count; $i++) {
    $max = $Headers[$i].Length
    foreach ($row in $Rows) {
      $cell = if ($i -lt $row.Count) { [string]$row[$i] } else { '' }
      if ($cell.Length -gt $max) { $max = $cell.Length }
    }
    $max
  }

  function Render-Row {
    param([object[]]$Cells)
    $cells = for ($i = 0; $i -lt $Headers.Count; $i++) {
      $value = if ($i -lt $Cells.Count) { [string]$Cells[$i] } else { '' }
      $value.PadRight($widths[$i])
    }
    '| ' + ($cells -join ' | ') + ' |'
  }

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add((Render-Row $Headers))
  $lines.Add('| ' + (($widths | ForEach-Object { '-' * $_ }) -join ' | ') + ' |')
  foreach ($row in $Rows) {
    $lines.Add((Render-Row @($row)))
  }
  return $lines -join "`n"
}

function Get-ScalarProperties {
  param([object]$Item)
  $properties = @()
  if (-not $Item) { return $properties }
  foreach ($prop in $Item.PSObject.Properties) {
    if ($null -eq $prop.Value) { continue }
    if ($prop.Value -is [string] -or $prop.Value -is [ValueType]) {
      $properties += $prop.Name
    }
  }
  return $properties
}

function Format-ObjectRows {
  param(
    [object[]]$Items,
    [int]$Limit = 5
  )

  $selected = @($Items | Select-Object -First $Limit)
  $headers = @()
  foreach ($item in $selected) {
    foreach ($name in (Get-ScalarProperties $item)) {
      if ($headers -notcontains $name) { $headers += $name }
    }
  }

  if ($headers.Count -eq 0) {
    return @{ Headers = @('Value'); Rows = @(@('No scalar fields found')) }
  }

  $rows = @()
  foreach ($item in $selected) {
    $row = @()
    foreach ($header in $headers) {
      $property = $item.PSObject.Properties[$header]
      $value = if ($property) { $property.Value } else { $null }
      if ($null -eq $value) {
        $row += ''
      }
      elseif ($value -is [string] -or $value -is [ValueType]) {
        $row += [string]$value
      }
      else {
        $row += ($value | ConvertTo-Json -Compress -Depth 4)
      }
    }
    $rows += ,$row
  }

  return @{ Headers = $headers; Rows = $rows }
}

function Get-ClarityMetricSections {
  param(
    [object]$Response,
    [int]$Limit = 3
  )

  $sections = New-Object System.Collections.Generic.List[object]
  if (-not $Response) { return $sections }

  $metrics = @()
  if ($Response -is [System.Array]) {
    $metrics = @($Response)
  }
  elseif ($Response.PSObject.Properties.Name -contains 'metricName') {
    $metrics = @($Response)
  }

  foreach ($metric in ($metrics | Select-Object -First $Limit)) {
    $name = if ($metric.metricName) { [string]$metric.metricName } else { 'Clarity metric' }
    $info = @()
    if ($metric.PSObject.Properties.Name -contains 'information' -and $metric.information) {
      $info = @($metric.information)
    }
    $sections.Add([pscustomobject]@{
      Name = $name
      Rows = $info
    })
  }

  return $sections
}

function Write-Section {
  param(
    [System.Collections.Generic.List[string]]$Lines,
    [string]$Title,
    [string]$Body
  )

  $Lines.Add("## $Title")
  $Lines.Add('')
  foreach ($line in $Body -split "`n") {
    $Lines.Add($line)
  }
  $Lines.Add('')
}


function Get-GoogleAccessToken {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CredentialPath
  )

  $credential = Get-Content -Raw -LiteralPath $CredentialPath | ConvertFrom-Json
  if ($credential.type -eq 'service_account' -or ($credential.PSObject.Properties.Name -contains 'private_key' -and $credential.PSObject.Properties.Name -contains 'client_email')) {
    if (-not $credential.client_email -or -not $credential.private_key) {
      throw 'Service account JSON must contain client_email and private_key'
    }

    $jwt = [JwtRsaSigner]::Sign(
      $credential.private_key,
      $credential.client_email,
      'https://www.googleapis.com/auth/analytics.readonly',
      $credential.private_key_id
    )

    $tokenResponse = Invoke-JsonApi -Uri 'https://oauth2.googleapis.com/token' -Method 'Post' -Headers @{} -Body @{
      grant_type = 'urn:ietf:params:oauth:grant-type:jwt-bearer'
      assertion = $jwt
    }

    if (-not $tokenResponse.access_token) {
      throw 'Failed to obtain GA4 access token from service account'
    }

    return [pscustomobject]@{
      AccessToken = $tokenResponse.access_token
      Mode = 'service_account'
      CredentialEmail = $credential.client_email
    }
  }

  if ($credential.type -eq 'authorized_user' -or $credential.PSObject.Properties.Name -contains 'refresh_token') {
    if (-not $credential.refresh_token) {
      throw 'Authorized user credentials must contain refresh_token'
    }

    $clientId = $credential.client_id
    $clientSecret = $credential.client_secret
    if (-not $clientId -or -not $clientSecret) {
      throw 'Authorized user credentials must contain client_id and client_secret'
    }

    $tokenResponse = Invoke-JsonApi -Uri 'https://oauth2.googleapis.com/token' -Method 'Post' -Headers @{} -Body @{
      client_id = $clientId
      client_secret = $clientSecret
      refresh_token = $credential.refresh_token
      grant_type = 'refresh_token'
    }

    if (-not $tokenResponse.access_token) {
      throw 'Failed to obtain GA4 access token from user credentials'
    }

    return [pscustomobject]@{
      AccessToken = $tokenResponse.access_token
      Mode = 'authorized_user'
      CredentialEmail = $credential.client_id
    }
  }

  throw 'Unsupported Google credential file. Expected service_account or authorized_user JSON.'
}

if ($Help) {
  Show-Help
  return
}

$secrets = Get-DefaultSecrets
$ga4PropertyId = Get-Value -Explicit $Ga4PropertyId -EnvName 'MCC_GA4_PROPERTY_ID' -Secrets $secrets -SecretProperty 'ga4PropertyId'
$ga4ServiceAccount = Get-Value -Explicit $Ga4ServiceAccount -EnvName 'GOOGLE_APPLICATION_CREDENTIALS' -Secrets $secrets -SecretProperty 'ga4ServiceAccount'
$clarityToken = Get-Value -Explicit $ClarityToken -EnvName 'MCC_CLARITY_TOKEN' -Secrets $secrets -SecretProperty 'clarityToken'
$clarityProjectId = Get-Value -Explicit $ClarityProjectId -EnvName 'MCC_CLARITY_PROJECT_ID' -Secrets $secrets -SecretProperty 'clarityProjectId'

$missing = New-Object System.Collections.Generic.List[string]
if (-not $ga4PropertyId) { $missing.Add('GA4 property id') }
if (-not $ga4ServiceAccount) { $missing.Add('GA4 credential JSON path') }
elseif (-not (Test-Path $ga4ServiceAccount)) { $missing.Add("Missing GA4 credential file: $ga4ServiceAccount") }
if (-not $clarityToken) { $missing.Add('Clarity token') }
if (-not $clarityProjectId) { $missing.Add('Clarity project id') }

if ($missing.Count -gt 0) {
  throw ('Missing prerequisites: ' + ($missing -join '; '))
}

$issues = New-Object System.Collections.Generic.List[string]
$gaSummary = $null
$gaChannels = $null
$gaPages = $null
$gaEvents = $null
$gaInquiryActions = $null
$clarityResults = @{}

$outputPath = if ($Output) { [IO.Path]::GetFullPath((Join-Path $root $Output)) } else { Join-Path $root ('reports\marketing\weekly-report-{0}.md' -f (Get-Date -Format 'yyyy-MM-dd')) }
$latestPath = Join-Path $root 'reports\marketing\latest.md'
$dataDirPath = if ($DataDir) { [IO.Path]::GetFullPath((Join-Path $root $DataDir)) } else { Join-Path $root 'reports\marketing-data' }
$reportDate = Get-Date -Format 'yyyy-MM-dd'
$rawDir = Join-Path $dataDirPath $reportDate
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $latestPath) | Out-Null
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null

try {
  $gaAuth = Get-GoogleAccessToken -CredentialPath $ga4ServiceAccount
  $gaHeaders = @{ Authorization = "Bearer $($gaAuth.AccessToken)" }
  $gaDateRange = @{ startDate = $StartDate; endDate = $EndDate }
  $gaBase = "https://analyticsdata.googleapis.com/v1beta/properties/${ga4PropertyId}:runReport"

  $gaSummary = Invoke-JsonApi -Uri $gaBase -Method 'Post' -Headers $gaHeaders -Body @{
    dateRanges = @($gaDateRange)
    metrics = @(
      @{ name = 'activeUsers' },
      @{ name = 'sessions' },
      @{ name = 'totalUsers' },
      @{ name = 'screenPageViews' },
      @{ name = 'eventCount' }
    )
  }

  $gaChannels = Invoke-JsonApi -Uri $gaBase -Method 'Post' -Headers $gaHeaders -Body @{
    dateRanges = @($gaDateRange)
    dimensions = @(@{ name = 'sessionDefaultChannelGroup' })
    metrics = @(@{ name = 'sessions' }, @{ name = 'activeUsers' }, @{ name = 'screenPageViews' })
    orderBys = @(@{ metric = @{ metricName = 'sessions' }; desc = $true })
    limit = 10
  }

  $gaPages = Invoke-JsonApi -Uri $gaBase -Method 'Post' -Headers $gaHeaders -Body @{
    dateRanges = @($gaDateRange)
    dimensions = @(@{ name = 'pagePathPlusQueryString' })
    metrics = @(@{ name = 'screenPageViews' }, @{ name = 'activeUsers' }, @{ name = 'sessions' })
    orderBys = @(@{ metric = @{ metricName = 'screenPageViews' }; desc = $true })
    limit = 10
  }

  $trackedEvents = @(
    'phone_click', 'goo_net_click', 'cta_click', 'article_card_click',
    'recruit_link_click', 'recruit_form_submit_start', 'recruit_form_submit_success',
    'recruit_form_submit_error', 'scroll_depth', 'recruit_entry_view',
    'sales_section_view', 'column_section_view', 'used_car_stock_view',
    'phone_prompt_open', 'phone_dial'
  )

  $gaEvents = Invoke-JsonApi -Uri $gaBase -Method 'Post' -Headers $gaHeaders -Body @{
    dateRanges = @($gaDateRange)
    dimensions = @(@{ name = 'eventName' })
    metrics = @(@{ name = 'eventCount' })
    dimensionFilter = @{ filter = @{ fieldName = 'eventName'; inListFilter = @{ values = $trackedEvents } } }
    orderBys = @(@{ metric = @{ metricName = 'eventCount' }; desc = $true })
    limit = 50
  }

  $inquiryEvents = @(
    'phone_prompt_open', 'phone_dial', 'phone_click', 'goo_net_click',
    'recruit_form_submit_start', 'recruit_form_submit_success', 'recruit_form_submit_error'
  )
  $gaInquiryActions = Invoke-JsonApi -Uri $gaBase -Method 'Post' -Headers $gaHeaders -Body @{
    dateRanges = @($gaDateRange)
    dimensions = @(@{ name = 'eventName' }, @{ name = 'pagePathPlusQueryString' })
    metrics = @(@{ name = 'eventCount' })
    dimensionFilter = @{ filter = @{ fieldName = 'eventName'; inListFilter = @{ values = $inquiryEvents } } }
    orderBys = @(@{ metric = @{ metricName = 'eventCount' }; desc = $true })
    limit = 50
  }

  if ($gaAuth.Mode -eq 'authorized_user') {
    $issues.Add('GA4 is using authorized_user credentials from the local credential file.')
  }
}
catch {
  $issues.Add(("GA4: {0}" -f $_.Exception.Message))
}

try {
  $clarityBase = 'https://www.clarity.ms/export-data/api/v1/project-live-insights'
  $clarityRequests = @(
    @{ Name = 'clarity-channel'; Dimension1 = 'Channel' },
    @{ Name = 'clarity-url'; Dimension1 = 'URL' },
    @{ Name = 'clarity-device'; Dimension1 = 'Device' }
  )
  $clarityResults = @{}
  foreach ($request in $clarityRequests) {
    $uriBuilder = [System.UriBuilder]::new($clarityBase)
    $uriBuilder.Query = ('numOfDays=3&dimension1={0}' -f [uri]::EscapeDataString($request.Dimension1))
    $clarityResults[$request.Name] = Invoke-JsonApi -Uri $uriBuilder.Uri.AbsoluteUri -Method 'Get' -Headers @{ Authorization = "Bearer $clarityToken" }
  }
}
catch {
  $issues.Add(("Clarity: {0}" -f $_.Exception.Message))
}

@{
  gaSummary = $gaSummary
  gaChannels = $gaChannels
  gaPages = $gaPages
  gaEvents = $gaEvents
  gaInquiryActions = $gaInquiryActions
  clarity = $clarityResults
} | ConvertTo-Json -Depth 30 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $rawDir 'report-data.json')

$summaryRows = @()
if ($gaSummary.rows -and $gaSummary.rows.Count -gt 0) {
  $summaryRow = $gaSummary.rows[0]
  $summaryRows = @(
    @('Active users', $summaryRow.metricValues[0].value),
    @('Sessions', $summaryRow.metricValues[1].value),
    @('Total users', $summaryRow.metricValues[2].value),
    @('Page views', $summaryRow.metricValues[3].value),
    @('Event count', $summaryRow.metricValues[4].value)
  )
}

$channelRows = @()
if ($gaChannels -and $gaChannels.rows) {
  $channelRows = @($gaChannels.rows | ForEach-Object { ,@($_.dimensionValues[0].value, $_.metricValues[0].value, $_.metricValues[1].value, $_.metricValues[2].value) })
}

$pageRows = @()
if ($gaPages -and $gaPages.rows) {
  $pageRows = @($gaPages.rows | ForEach-Object { ,@($_.dimensionValues[0].value, $_.metricValues[0].value, $_.metricValues[1].value, $_.metricValues[2].value) })
}

$eventRows = @()
if ($gaEvents -and $gaEvents.rows) {
  $eventRows = @($gaEvents.rows | ForEach-Object { ,@($_.dimensionValues[0].value, $_.metricValues[0].value) })
}

$inquiryActionRows = @()
if ($gaInquiryActions -and $gaInquiryActions.rows) {
  $inquiryActionRows = @($gaInquiryActions.rows | ForEach-Object { ,@($_.dimensionValues[0].value, $_.dimensionValues[1].value, $_.metricValues[0].value) })
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# Weekly Marketing Report')
$lines.Add('')
$lines.Add(('Generated: {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')))
$lines.Add(('GA4 property: {0}' -f $ga4PropertyId))
$lines.Add(('Clarity project: {0}' -f $clarityProjectId))
$lines.Add(('GA4 window: {0} to {1}' -f $StartDate, $EndDate))
$lines.Add('Clarity window: last 72 hours')
$lines.Add('')

Write-Section -Lines $lines -Title 'Overview' -Body (Build-MarkdownTable -Headers @('Metric', 'Value') -Rows $summaryRows)
Write-Section -Lines $lines -Title 'Channel mix' -Body (Build-MarkdownTable -Headers @('Channel', 'Sessions', 'Active users', 'Page views') -Rows $channelRows)
Write-Section -Lines $lines -Title 'Top pages' -Body (Build-MarkdownTable -Headers @('Page', 'Page views', 'Active users', 'Sessions') -Rows $pageRows)
Write-Section -Lines $lines -Title 'Tracked events' -Body (Build-MarkdownTable -Headers @('Event', 'Count') -Rows $eventRows)
Write-Section -Lines $lines -Title 'Inquiry actions by page' -Body (Build-MarkdownTable -Headers @('Action', 'Page', 'Count') -Rows $inquiryActionRows)

foreach ($entry in @('clarity-channel', 'clarity-url', 'clarity-device')) {
  $response = $clarityResults[$entry]
  $prettyName = switch ($entry) {
    'clarity-channel' { 'Clarity Channel' }
    'clarity-url' { 'Clarity URL' }
    'clarity-device' { 'Clarity Device' }
  }
  $lines.Add("## $prettyName")
  $lines.Add('')
  $lines.Add(('Request: numOfDays=3, dimension1={0}' -f ($prettyName -replace '^Clarity ', '')))
  $lines.Add('')
  $metricSections = Get-ClarityMetricSections -Response $response -Limit 3
  if ($metricSections.Count -eq 0) {
    $lines.Add('No Clarity rows were returned.')
    $lines.Add('')
    continue
  }

  foreach ($metric in $metricSections) {
    $lines.Add(("### {0}" -f $metric.Name))
    $lines.Add('')
    $formatted = Format-ObjectRows -Items $metric.Rows -Limit 5
    $lines.Add((Build-MarkdownTable -Headers $formatted.Headers -Rows $formatted.Rows))
    $lines.Add('')
  }
}

$lines.Add('## Notes')
$lines.Add('')
$lines.Add('- Clarity Data Export only returns the last 24/48/72 hours. Weekly automation therefore captures a rolling snapshot, not a full seven-day Clarity history.')
$lines.Add('- Raw JSON is saved under reports/marketing-data for troubleshooting and trend reconstruction.')
if ($issues.Count -gt 0) {
  $lines.Add('- Issues:')
  foreach ($issue in $issues) {
    $lines.Add(('  - ' + $issue))
  }
}
$lines.Add('')

$report = $lines -join "`n"
Set-Content -Encoding UTF8 -LiteralPath $outputPath -Value $report
Set-Content -Encoding UTF8 -LiteralPath $latestPath -Value $report

Write-Output "Report written to $outputPath"
Write-Output "Latest report written to $latestPath"
Write-Output "Raw data written to $rawDir"

