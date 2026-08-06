[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Login first
$body = '{"email":"admin@aigw.com","password":"Admin@123"}'
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

# Decode token payload (middle part)
$parts = $token.Split('.')
$payload = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($parts[1] + "=="))
Write-Host "Token Payload: $payload"

# Test with full debug
$usageReq = [System.Net.WebRequest]::Create("http://localhost:5005/api/usage/summary")
$usageReq.Method = "GET"
$usageReq.ContentType = "application/json"
$usageReq.Headers.Add("Authorization", "Bearer $token")
Write-Host "Request Headers:"
$usageReq.Headers.AllKeys | ForEach-Object { Write-Host "  $_ : $($usageReq.Headers[$_])" }

try {
    $usageResp = $usageReq.GetResponse()
    $sr3 = [System.IO.StreamReader]::new($usageResp.GetResponseStream())
    Write-Host $sr3.ReadToEnd()
} catch {
    $err = $_.Exception
    Write-Host "Error: $($err.Message)"
    Write-Host "Status: $($err.Response.StatusCode)"
    if ($err.Response) {
        $stream = $err.Response.GetErrorResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
