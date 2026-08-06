param(
    [string]$BaseUrl = "http://localhost:5005",
    [string]$Email = "admin@aigw.com",
    [string]$Password = "Admin@123",
    [switch]$DryRun,
    [switch]$UpdateCapabilities
)

$ErrorActionPreference = "Stop"

function Normalize([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return "" }
    return (($s -replace '[-_:\s/.\\]', '').ToLowerInvariant())
}

$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.token)" }

Write-Host "Fetching app models..."
$appModels = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/models" -Headers $headers

Write-Host "Fetching Requesty catalog..."
$reqModels = (Invoke-RestMethod -Method Get -Uri "https://router.requesty.ai/v1/models" -TimeoutSec 90).data
Write-Host "Requesty models: $($reqModels.Count) | App models: $($appModels.Count)"

$byId = @{}
$byLast = @{}
foreach ($m in $reqModels) {
    $idKey = Normalize $m.id
    if (-not $byId.ContainsKey($idKey)) { $byId[$idKey] = $m }
    $lastSeg = ($m.id -split '/' | Select-Object -Last 1)
    $lastKey = Normalize $lastSeg
    if ($lastKey -and -not $byLast.ContainsKey($lastKey)) { $byLast[$lastKey] = $m }
}

function Find-Match([object]$appModel) {
    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($c in @($appModel.name, $appModel.displayName, $appModel.actualModelName)) {
        if (-not [string]::IsNullOrWhiteSpace($c)) {
            $candidates.Add($c)
            $seg = ($c -split '/|:' | Select-Object -Last 1)
            if ($seg -ne $c) { $candidates.Add($seg) }
        }
    }
    foreach ($c in ($candidates | Select-Object -Unique)) {
        $key = Normalize $c
        if ($key -eq "") { continue }
        if ($byId.ContainsKey($key)) { return $byId[$key] }
        if ($byLast.ContainsKey($key)) { return $byLast[$key] }
    }
    return $null
}

$updated = 0
$skipped = 0
$unmatched = @()
foreach ($app in $appModels) {
    $match = Find-Match $app
    if ($null -eq $match) { $unmatched += "$($app.providerName): $($app.name)"; continue }

    $inPer1k = [math]::Round([double]$match.input_price * 1000, 6)
    $outPer1k = [math]::Round([double]$match.output_price * 1000, 6)
    $body = @{
        pricePer1kInput  = $inPer1k
        pricePer1kOutput = $outPer1k
    }
    if ($match.context_window -and $match.context_window -gt 0) { $body.contextWindow = [int]$match.context_window }
    if ($match.max_output_tokens -and $match.max_output_tokens -gt 0) { $body.maxTokens = [int]$match.max_output_tokens }
    if ($UpdateCapabilities) {
        $body.supportsVision = [bool]$match.supports_vision
        $body.supportsFunctionCalling = [bool]$match.supports_tool_calling
    }

    if ($DryRun) {
        Write-Host ("[DRY] {0,-34} -> {1}  in=$($inPer1k) out=$($outPer1k)" -f $app.name, $match.id)
    } else {
        try {
            Invoke-RestMethod -Method Put -Uri "$BaseUrl/api/models/$($app.id)" -Headers $headers -ContentType "application/json" -Body ($body | ConvertTo-Json) | Out-Null
            Write-Host ("OK   {0,-34} -> {1}  in=$($inPer1k) out=$($outPer1k)" -f $app.name, $match.id)
            $updated++
        } catch {
            Write-Host ("FAIL {0,-34} -> {1}  {2}" -f $app.name, $match.id, $_.Exception.Message)
        }
    }
    $skipped++
}

Write-Host ""
Write-Host "Total matched: $skipped | Updated: $updated | Unmatched: $($unmatched.Count)"
if ($unmatched.Count -gt 0) {
    Write-Host "`nUnmatched models:"
    $unmatched | ForEach-Object { Write-Host "  $_" }
}
