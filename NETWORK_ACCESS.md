## Network Access Configuration

To access the VMS from other devices on your network, use these URLs:

**Frontend (Client)**:
- Local: http://localhost:5173
- **Network: http://192.168.0.131:5173**

**Backend (Server)**:
- Local: http://localhost:3000
- **Network: http://192.168.0.131:3000**

### Access from Mobile/Tablet

1. **Connect to the same WiFi network** as your server (192.168.0.131)
2. Open browser on mobile device
3. Navigate to: **http://192.168.0.131:5173**

### Important Notes

- The IP address `192.168.0.131` is your current machine's local network IP
- Other devices must be on the **same WiFi/LAN** network
- If your IP changes (e.g., after router restart), check the console output for the new IP
- For webcam access over network, browsers require **HTTPS**. The current setup uses HTTP which works on the same machine only.

### Webcam Note

⚠️ **Webcam will only work on the host machine (localhost) with HTTP.**

For network webcam access, you would need:
1. HTTPS certificate (self-signed or Let's Encrypt)
2. Configure Vite with HTTPS
3. Update browser permissions

For now, use the application on the host machine for photo capture, or set up HTTPS for full network functionality.
