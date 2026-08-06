[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Login first
$body = @"
{"email":"admin@aigw.com","password":"Admin@123"}
"@
$loginReq = [System.Net.WebRequest]::Create("http://localhost:5005/api/auth/login")
$loginReq.Method = "POST"
$loginReq.ContentType = "application/json"
$sr = [System.IO.StreamWriter]::new($loginReq.GetRequestStream())
$sr.Write($body)
$sr.Close()
$loginResp = $loginReq.GetResponse()
$sr2 = [System.IO.StreamReader]::new($loginResp.GetResponseStream())
$loginResult = $sr2.ReadToEnd() | ConvertFrom-Json
$token = $loginResult.token
Write-Host "Token obtained: $($token.Substring(0, 50))..."

# Test usage/summary
$usageReq = [System.Net.WebRequest]::Create("http://localhost:5005/api/usage/summary")
$usageReq.Method = "GET"
$usageReq.Headers.Add("Authorization", "Bearer $token")
try {
    $usageResp = $usageReq.GetResponse()
    $sr3 = [System.IO.StreamReader]::new($usageResp.GetResponseStream())
    Write-Host "Usage Summary Response:"
    Write-Host $sr3.ReadToEnd()
} catch {
    $err = $_.Exception
    Write-Host "Error: $($err.Message)"
}
