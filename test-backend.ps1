[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$body = @"
{"email":"admin@aigw.com","password":"Admin@123"}
"@
$req = [System.Net.WebRequest]::Create("http://localhost:5005/api/auth/login")
$req.Method = "POST"
$req.ContentType = "application/json"
$sr = [System.IO.StreamWriter]::new($req.GetRequestStream())
$sr.Write($body)
$sr.Close()
try {
    $resp = $req.GetResponse()
    $sr2 = [System.IO.StreamReader]::new($resp.GetResponseStream())
    Write-Host $sr2.ReadToEnd()
} catch {
    $err = $_.Exception
    Write-Host "Error: $($err.Message)"
    if ($err.Response) {
        $stream = $err.Response.GetErrorResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
