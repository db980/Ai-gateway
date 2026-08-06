try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5005/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"email":"admin@aigw.com","password":"Admin@123"}' -ErrorAction Stop
    Write-Host $resp.Content
} catch {
    $err = $_.Exception.Response
    Write-Host "Status: $($err.StatusCode)"
    $reader = New-Object System.IO.StreamReader($err.GetResponseStream())
    $reader.BaseStream.Position = 0
    $body = $reader.ReadToEnd()
    Write-Host "Body: $body"
}
