# VMS-ANTIGRAVITY: Operating Instructions

This guide explains how to run, manage, and maintain the Visitor Management System.

## 🚀 Production Mode (Live)
The application is currently running in production mode using **PM2**. This ensures it stays online and automatically restarts if it crashes or the system reboots.

### Accessing the App
- **URL**: `https://192.168.0.22:3000` (Network) or `https://localhost:3000` (Local)
- **CORS/SSL**: The app uses relative paths, so it adapts to whatever address you use.

### Management Commands
In the terminal, go to: `c:\Users\Admin\Documents\AntiGravity\server`

- **Check Status**: `npx pm2 status`
- **View Logs**: `npx pm2 logs` (Press Ctrl+C to stop viewing)
- **Restart Application**: `npx pm2 restart vms-server`
- **Stop Application**: `npx pm2 stop vms-server`
- **Start Application**: `npx pm2 start ecosystem.config.js --env production`

> [!IMPORTANT]
> If you make changes to the server code, run `npm run build` in the server folder, then `npx pm2 restart vms-server`.
> If you make changes to the client code, run `npm run build` in the client folder, then `npx pm2 restart vms-server`.

---

## 🛠️ Development Mode (For Coding)
If you want to run the app for development with hot-reloading:

1. **Stop Production**: `npx pm2 stop vms-server`
2. **Start Backend**:
   - Go to `server` folder
   - Run `npm run dev` (Starts on port 3000)
3. **Start Frontend**:
   - Go to `client` folder
   - Run `npm run dev` (Starts on port 5173)

---

## 🔐 SSL Certificates
If you need to change the IP address:
1. Open `server/generate_cert.js` and update the IP.
2. Run `node generate_cert.js` in the `server` folder.
3. Restart the server.

## 🗄️ Database
- **Type**: PostgreSQL
- **Default Database**: `vms_db`
- **User/Password**: `postgres` / `postgres`

## 📂 Project Structure
- `client/`: React Frontend (Vite)
- `server/`: Express Backend (TypeScript)
- `uploads/`: Visitor photos reside here. Keep a backup of this folder!
