const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'vms.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Create Visitors Table
        db.run(`CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_number TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            mobile TEXT NOT NULL,
            company_name TEXT NOT NULL,
            whom_to_visit TEXT NOT NULL,
            visit_date TEXT NOT NULL,
            visit_time TEXT NOT NULL,
            address TEXT,
            gender TEXT,
            purpose TEXT,
            items_carried TEXT,
            visit_duration TEXT,
            exit_time DATETIME,
            status TEXT DEFAULT 'PENDING',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Admins Table
        db.run(`CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'ADMIN',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed Admins
        const admins = [
            { user: 'admin', pass: 'admin123' },
            { user: 'forging', pass: 'Forging@2026' }
        ];

        admins.forEach(creds => {
            db.get(`SELECT id FROM admins WHERE username = ?`, [creds.user], (err, row) => {
                if (err) return console.error(err.message);
                if (!row) {
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(creds.pass, salt);
                    db.run(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`, [creds.user, hash], (err) => {
                        if (err) console.error("Error creating admin:", err);
                        else console.log(`Admin account created: ${creds.user}`);
                    });
                }
            });
        });
    });
}

module.exports = db;
