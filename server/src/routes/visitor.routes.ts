import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// GET All Visitors
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, limit } = req.query;
        let query = 'SELECT * FROM visitors';
        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` WHERE status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Filter by plant if user is not a super admin
        if ((req as any).user && (req as any).user.plant) {
            query += (status ? ' AND' : ' WHERE') + ` plant = $${paramIndex}`;
            params.push((req as any).user.plant);
            paramIndex++;
        }

        query += ' ORDER BY id DESC';

        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(Number(limit));
        }

        const visitors = await db.all(query, params);
        // Convert snake_case to camelCase for frontend
        const mapped = visitors.map((v: any) => ({
            id: v.id,
            batchNo: v.batch_no,
            name: v.name,
            gender: v.gender,
            mobile: v.mobile,
            email: v.email,
            address: v.address,
            visitDate: v.visit_date,
            visitTime: v.visit_time,
            duration: v.duration,
            company: v.company,
            host: v.host,
            purpose: v.purpose,
            plant: v.plant,
            assets: v.assets,
            photoPath: v.photo_path,
            status: v.status,
            entryTime: v.entry_time,
            exitTime: v.exit_time,
            createdAt: v.created_at
        }));
        res.json(mapped);
    } catch (error) {
        console.error('Error fetching visitors:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET Visitor by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const visitor = await db.get('SELECT * FROM visitors WHERE id = $1', [req.params.id]);
        if (!visitor) return res.status(404).json({ message: 'Visitor not found' });

        // Convert snake_case to camelCase
        const mapped = {
            id: (visitor as any).id,
            batchNo: (visitor as any).batch_no,
            name: (visitor as any).name,
            gender: (visitor as any).gender,
            mobile: (visitor as any).mobile,
            company: (visitor as any).company,
            host: (visitor as any).host,
            visitDate: (visitor as any).visit_date,
            visitTime: (visitor as any).visit_time,
            plant: (visitor as any).plant,
            assets: (visitor as any).assets,
            photoPath: (visitor as any).photo_path
        };
        res.json(mapped);
    } catch (error) {
        console.error('Error fetching visitor:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// CREATE Visitor
router.post('/', upload.single('photo'), async (req, res) => {
    try {
        const {
            name, gender, mobile, email, address,
            visitDate, visitTime, duration,
            company, host, purpose, plant, assets
        } = req.body;
        // No required field validation - all fields optional

        const photoPath = req.file ? `/uploads/${req.file.filename}` : '';

        // Generate Batch No in format: VMS-DDMMYYYY-0001
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateStr = `${day}${month}${year}`;

        // Get count of visitors registered today to generate sequential number
        const todayStart = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${day}`;
        const todayCount = await db.all(
            `SELECT COUNT(*) as count FROM visitors WHERE visit_date = $1`,
            [todayStart]
        );
        const sequentialNum = String((todayCount[0] as any).count + 1).padStart(4, '0');
        const batchNo = `VMS-${dateStr}-${sequentialNum}`;

        const offset = now.getTimezoneOffset() * 60000;
        const local = new Date(now.getTime() - offset);
        const localTimeStr = local.toISOString().slice(0, 19).replace('T', ' ');

        const sql = `
            INSERT INTO visitors (
                batch_no, name, gender, mobile, email, address,
                visit_date, visit_time, duration, company, host, purpose, plant, assets,
                photo_path, status, entry_time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PENDING', $16)
            RETURNING *
        `;

        const params = [
            batchNo, name, gender, mobile, email || '', address || '',
            visitDate, visitTime, duration, company, host, purpose, plant, assets,
            photoPath, localTimeStr
        ];

        const result = await db.get(sql, params);

        // Map to camelCase
        const mapped = {
            id: (result as any).id,
            batchNo: (result as any).batch_no,
            name: (result as any).name,
            status: (result as any).status
        };

        res.status(201).json(mapped);
    } catch (error) {
        console.error('Error creating visitor:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// UPDATE Status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        // Check if visitor exists and belongs to the admin's plant
        const visitor = await db.get('SELECT * FROM visitors WHERE id = $1', [id]);
        if (!visitor) return res.status(404).json({ message: 'Visitor not found' });

        if ((req as any).user && (req as any).user.plant && (visitor as any).plant !== (req as any).user.plant) {
            return res.status(403).json({ message: 'Access denied: Visitor belongs to a different plant' });
        }

        if (!['APPROVED', 'REJECTED', 'EXITED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        let updates = 'status = $1';
        const params: any[] = [status];
        let paramIndex = 2;

        if (status === 'EXITED') {
            // Generate Local IST Time String for Postgres
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const local = new Date(now.getTime() - offset);
            const localTimeStr = local.toISOString().slice(0, 19).replace('T', ' '); // "YYYY-MM-DD HH:MM:SS"

            updates += `, exit_time = $${paramIndex}`;
            params.push(localTimeStr);
            paramIndex++;
        } else if (status === 'APPROVED') {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const local = new Date(now.getTime() - offset);
            const localTimeStr = local.toISOString().slice(0, 19).replace('T', ' ');

            updates += `, entry_time = $${paramIndex}`;
            params.push(localTimeStr);
            paramIndex++;
        }

        params.push(id);

        await db.run(`UPDATE visitors SET ${updates} WHERE id = $${paramIndex}`, params);
        res.json({ message: `Visitor ${status}` });

    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

export default router;
