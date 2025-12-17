$certDir = "src\..\.cert"
if (!(Test-Path -Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

$certPath = Join-Path $certDir "cert.pem"
$keyPath = Join-Path $certDir "key.pem"

# Delete existing certs if they exist
if (Test-Path $certPath) { Remove-Item $certPath }
if (Test-Path $keyPath) { Remove-Item $keyPath }

# Generate new self-signed certificate
$cert = New-SelfSignedCertificate `
    -DnsName "localhost", "192.168.0.131" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -KeyLength 2048 `
    -NotAfter (Get-Date).AddYears(1)

# Export Certificate (Public Key) in PEM format
$certContent = "-----BEGIN CERTIFICATE-----`r`n" + `
    [Convert]::ToBase64String($cert.RawData, "InsertLineBreaks") + `
    "`r`n-----END CERTIFICATE-----"
$certContent | Set-Content -Path $certPath

# Export Private Key (This is tricky in PS without OpenSSL over pipe, checking if we can use a simpler approach or if we need to guide user to install OpenSSL)
# Since Node.js needs a PEM key, and standard PS export-pfx prevents easy extraction without OpenSSL.
# Fallback: We will use a Node.js script to generate the certs since the 'selfsigned' package had issues with Node version.
# Actually, let's try a different approach. We can use the 'forge' library in a temporary node script, it serves purely JS implementation.

Write-Host "Creating temp cert generator..."
