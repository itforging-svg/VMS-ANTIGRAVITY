const express = require('express');
const cors = require('cors');
const db = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { stringify } = require('csv-stringify/sync');

const app = express();
const PORT = 5000;
const SECRET_KEY = "super_secret_key_vms"; // In production, use ENV

app.use(cors());
app.use(express.json());

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Helpers ---
const generateBatchNumber = (visitDate) => {
    return new Promise((resolve, reject) => {
        // visitDate format: YYYY-MM-DD
        const dateStr = visitDate.replace(/-/g, ''); // 20251217
        const prefix = `VMS-${dateStr}`;

        // Count existing visitors for this date to determine sequence
        db.get(
            `SELECT COUNT(*) as count FROM visitors WHERE visit_date = ?`,
            [visitDate],
            (err, row) => {
                if (err) return reject(err);

                const count = row.count + 1;
                const sequence = String(count).padStart(4, '0');
                const batchNumber = `${prefix}-${sequence}`;
                resolve(batchNumber);
            }
        );
    });
};

// --- Routes ---

// 1. Admin Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM admins WHERE username = ?`, [username], (err, admin) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!admin) return res.status(401).json({ error: "Invalid credentials" });

        const validPassword = bcrypt.compareSync(password, admin.password_hash);
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: admin.id, role: admin.role }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token, username: admin.username });
    });
});

// 2. Visitor Registration (Public)
app.post('/api/visitors', async (req, res) => {
    const {
        name, email, mobile, company_name, whom_to_visit,
        visit_date, visit_time, address, gender, purpose,
        items_carried, visit_duration
    } = req.body;

    // Basic Validation
    if (!name || !email || !mobile || !visit_date || !purpose) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // check duplicate: same mobile + same date
        db.get(`SELECT id FROM visitors WHERE mobile = ? AND visit_date = ?`, [mobile, visit_date], async (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) return res.status(400).json({ error: "Visit already registered for this date and mobile number." });

            const batch_number = await generateBatchNumber(visit_date);

            const stmt = db.prepare(`INSERT INTO visitors (
                batch_number, name, email, mobile, company_name, whom_to_visit, 
                visit_date, visit_time, address, gender, purpose, items_carried, visit_duration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            stmt.run([
                batch_number, name, email, mobile, company_name, whom_to_visit,
                visit_date, visit_time, address, gender, purpose, items_carried, visit_duration
            ], function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ message: "Visitor registered successfully", batch_number });
            });
            stmt.finalize();
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Get Visitors (Protected)
app.get('/api/visitors', authenticateToken, (req, res) => {
    // Optional filters: status, date_from, date_to
    const { status, date } = req.query;
    let sql = `SELECT * FROM visitors WHERE 1=1`;
    const params = [];

    if (status && status !== 'ALL') {
        sql += ` AND status = ?`;
        params.push(status);
    }
    if (date) {
        // Exact date match for simplicity in dashboard, or range logic can be added
        sql += ` AND visit_date = ?`;
        params.push(date);
    }

    sql += ` ORDER BY created_at DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Update Visitor Status (Protected)
app.put('/api/visitors/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body; // PENDING, APPROVED, REJECTED, EXITED
    const { id } = req.params;

    if (!['PENDING', 'APPROVED', 'REJECTED', 'VISITED', 'EXITED'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    let sql = `UPDATE visitors SET status = ?, updated_at = CURRENT_TIMESTAMP`;
    const params = [status];

    if (status === 'EXITED') {
        sql += `, exit_time = datetime('now', 'localtime')`;
    }


    sql += ` WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Status updated", changes: this.changes });
    });
});

// 5. Dashboard Stats (Protected)
app.get('/api/stats', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const queries = {
        total_today: `SELECT COUNT(*) as count FROM visitors WHERE visit_date = '${today}'`,
        pending: `SELECT COUNT(*) as count FROM visitors WHERE status = 'PENDING'`,
        approved: `SELECT COUNT(*) as count FROM visitors WHERE status = 'APPROVED'`,
        rejected: `SELECT COUNT(*) as count FROM visitors WHERE status = 'REJECTED'`
    };

    const results = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach(key => {
        db.get(queries[key], (err, row) => {
            if (err) results[key] = 0;
            else results[key] = row.count;

            completed++;
            if (completed === keys.length) {
                res.json(results);
            }
        });
    });
});

// 6. Export Data (Protected)
app.get('/api/export', authenticateToken, (req, res) => {
    const { range } = req.query; // '7days', '15days', '30days', etc.

    let dateFilter = '';
    const today = new Date();
    let pastDate = new Date();

    if (range === 'last_7_days') pastDate.setDate(today.getDate() - 7);
    else if (range === 'last_15_days') pastDate.setDate(today.getDate() - 15);
    else if (range === 'last_1_month') pastDate.setMonth(today.getMonth() - 1);
    else if (range === 'last_3_months') pastDate.setMonth(today.getMonth() - 3);
    else if (range === 'last_6_months') pastDate.setMonth(today.getMonth() - 6);
    else if (range === 'last_1_year') pastDate.setFullYear(today.getFullYear() - 1);
    else pastDate = null; // ALL

    let sql = `SELECT * FROM visitors`;
    const params = [];

    if (pastDate) {
        const pastDateStr = pastDate.toISOString().split('T')[0];
        sql += ` WHERE visit_date >= ?`;
        params.push(pastDateStr);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const csvData = stringify(rows, { header: true });
        res.header('Content-Type', 'text/csv');
        res.attachment('visitors_export.csv');
        res.send(csvData);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
