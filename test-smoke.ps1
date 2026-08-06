[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Continue'
function Test-Endpoint {
    param($Method, $Path, $Token, $Body = $null)
    $uri = "http://localhost:5005/api$Path"
    try {
        $params = @{ Uri = $uri; Method = $Method; TimeoutSec = 20 }
        if ($Token) { $params.Headers = @{ Authorization = "Bearer $Token" } }
        if ($Body) { $params.ContentType = 'application/json'; $params.Body = ($Body | ConvertTo-Json -Depth 6 -Compress) }
        $resp = Invoke-RestMethod @params
        [pscustomobject]@{ Path = $Path; Status = 'OK'; Detail = '' }
    } catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'ERR' }
        $detail = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
        [pscustomobject]@{ Path = $Path; Status = $status; Detail = $detail.Substring(0, [Math]::Min(120, $detail.Length)) }
    }
}

$admin = (Invoke-RestMethod -Uri 'http://localhost:5005/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"admin@aigw.com","password":"Admin@123"}').token
$demo = (Invoke-RestMethod -Uri 'http://localhost:5005/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"demo@aigw.com","password":"Admin@123"}').token
Write-Host "=== AUTH ==="
"admin_login_ok=$([bool]$admin) demo_login_ok=$([bool]$demo)"

$results = @()
$results += Test-Endpoint GET '/auth/profile' $admin
$results += Test-Endpoint GET '/usage/summary' $demo
$results += Test-Endpoint GET '/usage/charts?days=7' $demo
$results += Test-Endpoint GET '/usage/records?page=1&pageSize=10' $demo
$results += Test-Endpoint GET '/models' $admin
$results += Test-Endpoint GET '/providers' $admin
$results += Test-Endpoint GET '/providertypes' $admin
$results += Test-Endpoint GET '/apikeys' $demo
$results += Test-Endpoint GET '/billing/plans' $demo
$results += Test-Endpoint GET '/billing/summary' $demo
$results += Test-Endpoint GET '/billing/invoices' $demo
$results += Test-Endpoint GET '/analytics/overview' $admin
$results += Test-Endpoint GET '/admin/users' $admin
$results += Test-Endpoint GET '/settings' $admin
$results += Test-Endpoint GET '/logs?page=1&pageSize=5' $admin
$results += Test-Endpoint GET '/prompttemplates' $demo
$results += Test-Endpoint POST '/chat' $admin @{ model = 'gpt-4o'; messages = @(@{ role = 'user'; content = 'ping' }); max_tokens = 5 }
$results += Test-Endpoint POST '/billing/cancel' $demo

Write-Host "=== ENDPOINTS ==="
$results | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
