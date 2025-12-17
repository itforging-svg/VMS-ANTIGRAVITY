import https from 'https';
import fs from 'fs';
import app from './app';
import { db } from './db';
import { seedAdmin } from './routes/auth.routes';
import path from 'path';

const PORT = parseInt(process.env.PORT || '3000');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Certificate paths
const CERT_DIR = path.join(__dirname, '../.cert');
const keyPath = path.join(CERT_DIR, 'key.pem');
const certPath = path.join(CERT_DIR, 'cert.pem');

(async () => {
    try {
        await db.init();
        await seedAdmin(); // Seed admin after DB init

        let server;

        // Try to use HTTPS if certificates exist
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            try {
                const options = {
                    key: fs.readFileSync(keyPath),
                    cert: fs.readFileSync(certPath)
                };
                server = https.createServer(options, app);
                console.log('✅ HTTPS enabled');
            } catch (err) {
                console.error('⚠️ Error reading certs, falling back to HTTP', err);
                server = require('http').createServer(app);
            }
        } else {
            console.log('⚠️ Certificates not found, falling back to HTTP');
            server = require('http').createServer(app);
        }

        server.listen(PORT, '0.0.0.0', () => {
            const os = require('os');
            const networkInterfaces = os.networkInterfaces();
            let localIP = 'localhost';

            // Find local IP
            Object.keys(networkInterfaces).forEach(interfaceName => {
                networkInterfaces[interfaceName].forEach((iface: any) => {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        localIP = iface.address;
                    }
                });
            });

            const protocol = server instanceof https.Server ? 'https' : 'http';
            console.log(`Server running on:`);
            console.log(`  - Local:   ${protocol}://localhost:${PORT}`);
            console.log(`  - Network: ${protocol}://${localIP}:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
})();
