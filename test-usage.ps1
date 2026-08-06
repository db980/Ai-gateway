[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6ImQ4YzZmZjJmLTM5ZmItNDc5Mi04Zjk3LWUzYjFmZGNlMTM5ZiIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6ImFkbWluQGFpZ3cuY29tIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiU3VwZXJBZG1pbiIsInVzZXJuYW1lIjoiU3VwZXJBZG1pbiIsImV4cCI6MTc4NTQwNDU1NX0.LE_kmnalhy3FcuHcGaCzSqJe7hsF95NCKW7BOzupD1k"

$req = [System.Net.WebRequest]::Create("http://localhost:5005/api/usage/summary")
$req.Method = "GET"
$req.Headers.Add("Authorization", "Bearer $token")
try {
    $resp = $req.GetResponse()
    $sr = [System.IO.StreamReader]::new($resp.GetResponseStream())
    Write-Host $sr.ReadToEnd()
} catch {
    $err = $_.Exception
    Write-Host "Error: $($err.Message)"
}
