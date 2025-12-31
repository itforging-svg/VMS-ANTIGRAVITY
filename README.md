# Enterprise Visitor Management System (VMS)
A robust, secure, and modern Visitor Management System designed for industrial facilities like **Chandan Steel Ltd**. This application handles visitor registration, live photo capture, plant-based access control, and administrative reporting.
## 🚀 Key Features
- **Modern Registration**: Streamlined visitor check-in with live webcam photo capture.
- **Plant-Based Access Control**: Separate admin accounts for different plants (**Seamsless, Forging Division, Main Plant, etc.**) with restricted data visibility.
- **Super Admin Dashboard**: Overview of all visitor logs across all plants.
- **Dynamic Assets Log**: Track visitor assets with custom descriptions.
- **Secure Printing**: Instant generation of visitor passes/slips.
- **CSV Reports**: Export visitor data with clickable photo links, filtered by plant and date.
- **HTTPS & Network Access**: Engineered to work over local networks with full webcam support.
---
## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, PostgreSQL.
- **Utility**: PM2 (Process Management), node-forge (SSL/HTTPS).
---
## 📦 Dependencies
### Backend (`server/`)
- `express`: REST API framework.
- `pg`: PostgreSQL database driver.
- `bcrypt`: Password security.
- `jsonwebtoken`: Secure authentication tokens.
- `multer`: File upload handling (photos).
- `dotenv`: Configuration management.
- `helmet`: Security headers.
- `pm2`: Production deployment.
### Frontend (`client/`)
- `react` & `react-router-dom`: UI and Routing.
- `react-webcam`: Webcam integration.
- `tailwindcss`: Styling.
- `lucide-react`: Icons.
- `date-fns`: Time/Date manipulation (IST focused).
---
## ⚡ Quick Setup Guide
### 1. Prerequisites
- **Node.js**: v18+
- **PostgreSQL**: v14+ (Ensure you have a database created)
- **Git**
### 2. Database Configuration
Create a `.env` file in the `server` directory:
```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/vms_db
JWT_SECRET=your_secret_key
PGUSER=postgres
PGPASSWORD=your_password
PGHOST=localhost
PGPORT=5432
PGDATABASE=vms_db
```
### 3. Installation
Navigate to each folder and install:
```bash
# Setup Server
cd server
npm install
# Setup Client
cd ../client
npm install
```
### 4. Running the Application
To build and deploy for production using PM2:
```bash
cd server
npm run deploy
```
Access the app via: `https://<your-ip>:3000`
---
## 🔐 Credentials
- **Super Admin**: `admin` / `admin123`
- **Plant Admins** (Password: `admin123`):
  - **Seamsless Division**: `admin_seamless`
  - **Forging Division**: `admin_forging`
  - **Main Plant**: `admin_main`
  - **Bright Bar**: `admin_bright`
  - **Flat Bar**: `admin_flat`
  - **Wire Plant**: `admin_wire`
  - **Main Plant 2 ( SMS 2 )**: `admin_main2`
  - **40"Inch Mill**: `admin_40inch`

  docker run -d -p 3000:3000 itforging/vms:latest
---
## 📝 License
Proprietary for **Chandan Steel Ltd**. Developed by Atharv Dhapre ( IT Dept ).
