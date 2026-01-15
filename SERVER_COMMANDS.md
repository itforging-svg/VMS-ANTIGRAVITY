# Application Management Commands

Since `pm2` might not be in your global path, use `npx pm2` or the `npm` scripts.

### 1. Start Application
**Option A (Production with PM2):**
```powershell
npx pm2 start ecosystem.config.js
```
*If `ecosystem.config.js` is missing, use:* `npx pm2 start dist/index.js --name "vms-server"`

**Option B (Development):**
```powershell
npm run dev
```

**Option C (Robust Script - Recommended if issues reflect):**
```powershell
.\Start_Server_Robust.ps1
```

### 2. Stop Application
```powershell
npx pm2 stop all
```
*If running via `npm run dev` or PowerShell script, press `Ctrl + C` in the terminal.*

### 3. Restart Application
```powershell
npx pm2 restart all
```

### 4. Check Status
```powershell
npx pm2 status
```
*Or listing:* `npx pm2 list`

### 5. View Logs
```powershell
npx pm2 logs
```

### 6. Monitor Server
```powershell
npx pm2 monit
```
