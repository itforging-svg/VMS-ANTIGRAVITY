## Network Access Configuration

To access the VMS from other devices on your network, use these URLs:

**Frontend (Client)**:
- Local: https://localhost:5173
- **Network: https://192.168.0.22:5173**

**Backend (Server)**:
- Local: https://localhost:3000
- **Network: https://192.168.0.22:3000**

### Access from Mobile/Tablet/Scan Devices

1. **Connect to the same WiFi network** as your server (192.168.0.22)
2. Open browser on device
3. Navigate to: **https://192.168.0.22:5173**
4. ⚠️ **Note**: Since we use self-signed certificates, the browser will show a security warning. Click **"Advanced"** and then **"Proceed to 192.168.0.22"**.

### Important Notes

- The IP address `192.168.0.22` is your current machine's local network IP.
- Other devices must be on the **same WiFi/LAN** network.
- HTTPS is **enabled**, which allows for full webcam functionality (photo capture) across the local network.

### Webcam Support

✅ **Webcam is fully supported over the network thanks to HTTPS.**

When prompted by the browser, allow the application to access the camera. If the camera doesn't start, ensure you are using the `https://` protocol in the URL.
