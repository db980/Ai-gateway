param(
    [string]$BaseUrl = "http://localhost:5005",
    [string]$Email = "admin@aigw.com",
    [string]$Password = "Admin@123",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.token)" }

# --- Ensure provider exists -------------------------------------------------
$providers = (Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/providers" -Headers $headers).data
$prov = $providers | Where-Object { $_.name -eq "Requesty" } | Select-Object -First 1
if ($null -eq $prov) {
    Write-Host "Creating provider 'Requesty'..."
    $provBody = @{
        name = "Requesty"
        type = "Requesty"
        baseUrl = "https://router.requesty.ai/v1"
        chatEndpointPath = "chat/completions"
        authType = "Bearer"
        isActive = $true
        priority = 1
    } | ConvertTo-Json
    $prov = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/providers" -Headers $headers -ContentType "application/json" -Body $provBody
    Write-Host "Created Requesty provider: $($prov.id)"
} else {
    Write-Host "Provider 'Requesty' already exists: $($prov.id)"
}
$providerId = $prov.id

# --- Load Requesty catalog --------------------------------------------------
Write-Host "Fetching Requesty catalog..."
$reqModels = (Invoke-RestMethod -Method Get -Uri "https://router.requesty.ai/v1/models" -TimeoutSec 90).data
Write-Host "Requesty models: $($reqModels.Count)"

# Existing model names + provider ids for idempotency
$existing = (Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/models" -Headers $headers)
$existingNames = @{}
foreach ($m in $existing) { $existingNames[[string]$m.name.ToLowerInvariant()] = $m.id }

# --- Import models ----------------------------------------------------------
$added = 0
$skipped = 0
$failed = @()
foreach ($m in $reqModels) {
    $name = $m.id
    if ($existingNames.ContainsKey($name.ToLowerInvariant())) { $skipped++; continue }

    $isFree = ([double]$m.input_price -eq 0) -and ([double]$m.output_price -eq 0)
    $ctx = if ($m.context_window -and $m.context_window -gt 0) { [int]$m.context_window } else { $null }
    $maxOut = if ($m.max_output_tokens -and $m.max_output_tokens -gt 0) { [int]$m.max_output_tokens } else { $null }
    $body = @{
        name = $name
        displayName = ($name -split '/' | Select-Object -Last 1)
        actualModelName = $name
        providerId = $providerId
        contextWindow = $ctx
        maxTokens = $maxOut
        supportsStreaming = $true
        supportsVision = [bool]$m.supports_vision
        supportsFunctionCalling = [bool]$m.supports_tool_calling
        isFree = $isFree
        pricePer1kInput = [math]::Round([double]$m.input_price * 1000, 6)
        pricePer1kOutput = [math]::Round([double]$m.output_price * 1000, 6)
    } | ConvertTo-Json

    if ($DryRun) {
        Write-Host "[DRY] $name ($ctx ctx, in=$(($body | ConvertFrom-Json).pricePer1kInput) out=$(($body | ConvertFrom-Json).pricePer1kOutput))"
    } else {
        try {
            Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/models" -Headers $headers -ContentType "application/json" -Body $body | Out-Null
            $added++
        } catch {
            $failed += "$name ($($_.Exception.Message))"
        }
    }
}

Write-Host ""
Write-Host "Added: $added | Skipped (already present): $skipped | Failed: $($failed.Count)"
if ($failed.Count -gt 0) { $failed | ForEach-Object { Write-Host "  FAIL $_" } }