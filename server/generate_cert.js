const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '.cert');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

console.log('Generating 2048-bit key-pair...');
const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [
    { name: 'commonName', value: '192.168.0.22' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'Virginia' },
    { name: 'localityName', value: 'Blacksburg' },
    { name: 'organizationName', value: 'VMS' },
    { shortName: 'OU', value: 'IT' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Add SAN (Subject Alternative Name)
cert.setExtensions([
    {
        name: 'subjectAltName',
        altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '192.168.0.22' },
            { type: 7, ip: '127.0.0.1' }
        ]
    }
]);

// Self-sign
cert.sign(keys.privateKey);

const pem = {
    private: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert)
};

fs.writeFileSync(path.join(certDir, 'key.pem'), pem.private);
fs.writeFileSync(path.join(certDir, 'cert.pem'), pem.cert);

console.log('✅ Certificates generated in .cert/ directory');
console.log('   - key.pem');
console.log('   - cert.pem');
