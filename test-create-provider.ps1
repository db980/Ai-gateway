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

# Create Provider
$providerBody = '{"name":"Test Provider","baseUrl":"https://api.test.com/v1","apiKey":"test-key","isActive":true}'
$providerReq = [System.Net.WebRequest]::Create("http://localhost:5005/api/providers")
$providerReq.Method = "POST"
$providerReq.ContentType = "application/json"
$providerReq.Headers.Add("Authorization", "Bearer $token")
$sr3 = [System.IO.StreamWriter]::new($providerReq.GetRequestStream())
$sr3.Write($providerBody)
$sr3.Close()
try {
    $providerResp = $providerReq.GetResponse()
    $sr4 = [System.IO.StreamReader]::new($providerResp.GetResponseStream())
    Write-Host "Success:"
    Write-Host $sr4.ReadToEnd()
} catch {
    $err = $_.Exception
    Write-Host "Error: $($err.Message)"
    if ($err.Response) {
        $stream = $err.Response.GetErrorResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        Write-Host "Response:"
        Write-Host $reader.ReadToEnd()
    }
}
