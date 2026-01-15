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

// GET Search Visitor by Mobile or Aadhar (Public for Kiosk)
router.get('/search', async (req, res) => {
    try {
        const { mobile, aadhar } = req.query;
        if (!mobile && !aadhar) return res.status(400).json({ message: 'Mobile or Aadhar number required' });

        let visitor;
        if (mobile) {
            visitor = await db.get(
                'SELECT * FROM visitors WHERE mobile = $1 AND (is_deleted IS FALSE OR is_deleted IS NULL) ORDER BY id DESC LIMIT 1',
                [mobile]
            );
        } else if (aadhar) {
            visitor = await db.get(
                'SELECT * FROM visitors WHERE aadhar_no = $1 AND (is_deleted IS FALSE OR is_deleted IS NULL) ORDER BY id DESC LIMIT 1',
                [aadhar]
            );
        }

        if (!visitor) return res.status(404).json({ message: 'Visitor not found' });

        // Check if blacklisted
        if ((visitor as any).is_blacklisted) {
            return res.status(403).json({ message: 'This visitor is blacklisted and cannot register.', blacklisted: true });
        }

        // Return only auto-fillable fields including photo
        res.json({
            name: (visitor as any).name,
            gender: (visitor as any).gender,
            email: (visitor as any).email,
            address: (visitor as any).address,
            company: (visitor as any).company,
            mobile: (visitor as any).mobile,
            aadharNo: (visitor as any).aadhar_no,
            photoPath: (visitor as any).photo_path // Include photo path
        });
    } catch (error) {
        console.error('Error searching visitor:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET All Visitors
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, limit, search } = req.query;
        let query = 'SELECT * FROM visitors WHERE (is_deleted IS FALSE OR is_deleted IS NULL)';
        const params: any[] = [];
        let paramIndex = 1;

        if (search) {
            // Global Search Mode
            // Remove 'WHERE' from search part since we already have WHERE clause for is_deleted
            query += ` AND (name LIKE $${paramIndex} OR mobile LIKE $${paramIndex} OR email LIKE $${paramIndex} OR company LIKE $${paramIndex} OR aadhar_no LIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        } else {
            // Default Daily View Mode
            const { visitDate } = req.query;
            if (visitDate) {
                query += ` AND visit_date = $${paramIndex}`;
                params.push(visitDate);
                paramIndex++;
            }
        }

        if (status) {
            // Append status filter
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Filter by plant if user is not a super admin
        if ((req as any).user && (req as any).user.plant) {
            query += ` AND plant = $${paramIndex}`;
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
            safetyEquipment: v.safety_equipment,
            visitorCardNo: v.visitor_card_no,
            aadharNo: v.aadhar_no,
            isBlacklisted: v.is_blacklisted,
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
        const visitor = await db.get('SELECT * FROM visitors WHERE id = $1 AND (is_deleted IS FALSE OR is_deleted IS NULL)', [req.params.id]);
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
            safetyEquipment: (visitor as any).safety_equipment,
            visitorCardNo: (visitor as any).visitor_card_no,
            aadharNo: (visitor as any).aadhar_no,
            isBlacklisted: (visitor as any).is_blacklisted,
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
            company, host, purpose, plant, assets,
            safetyEquipment, visitorCardNo, aadharNo
        } = req.body;

        // Check if blacklisted by mobile or aadhar
        const blacklisted = await db.get(
            'SELECT * FROM visitors WHERE (mobile = $1 OR (aadhar_no = $2 AND aadhar_no IS NOT NULL AND aadhar_no != \'\')) AND is_blacklisted = TRUE AND (is_deleted IS FALSE OR is_deleted IS NULL) LIMIT 1',
            [mobile, aadharNo]
        );

        if (blacklisted) {
            return res.status(403).json({ message: 'Your registration is rejected as you are blacklisted.' });
        }

        const photoPath = req.file ? `/uploads/${req.file.filename}` : '';

        // Robust Batch No Generation with retry logic for concurrency
        let result;
        let retries = 0;
        const maxRetries = 5;

        while (retries < maxRetries) {
            // Generate Batch No in format: VMS-DDMMYYYY-0001
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const dateStr = `${day}${month}${year}`;

            // Get last batch number for today to generate sequential number
            const batchPrefix = `VMS-${dateStr}`;
            const lastVisitor = await db.get(
                `SELECT batch_no FROM visitors WHERE batch_no LIKE $1 ORDER BY id DESC LIMIT 1`,
                [`${batchPrefix}-%`]
            );

            let sequentialNum = '0001';
            if (lastVisitor && (lastVisitor as any).batch_no) {
                const lastBatchNo = (lastVisitor as any).batch_no;
                const parts = lastBatchNo.split('-');
                const lastSeq = parseInt(parts[parts.length - 1]);

                if (!isNaN(lastSeq)) {
                    sequentialNum = String(lastSeq + 1).padStart(4, '0');
                }
            }

            const batchNo = `${batchPrefix}-${sequentialNum}`;

            const offset = now.getTimezoneOffset() * 60000;
            const local = new Date(now.getTime() - offset);
            const localTimeStr = local.toISOString().slice(0, 19).replace('T', ' ');

            const sql = `
                INSERT INTO visitors (
                    batch_no, name, gender, mobile, email, address,
                    visit_date, visit_time, duration, company, host, purpose, plant, assets,
                    safety_equipment, visitor_card_no, aadhar_no,
                    photo_path, status, entry_time
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'PENDING', $19)
                RETURNING *
            `;

            const params = [
                batchNo, name, gender, mobile, email || '', address || '',
                visitDate, visitTime, duration, company, host, purpose, plant, assets,
                safetyEquipment || '', visitorCardNo || '', aadharNo || '',
                photoPath, localTimeStr
            ];

            try {
                result = await db.get(sql, params);
                break; // Success!
            } catch (error: any) {
                // If it's a unique constraint violation on batch_no, retry
                if (error.code === '23505' && error.detail && error.detail.includes('batch_no')) {
                    console.warn(`Batch collision detected for ${batchNo}. Retrying... (${retries + 1}/${maxRetries})`);
                    retries++;
                    if (retries === maxRetries) throw error;
                    // Short delay to allow other transaction to complete
                    await new Promise(resolve => setTimeout(resolve, 50 * retries));
                } else {
                    throw error; // Other error, don't retry
                }
            }
        }

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
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        res.status(500).json({ message: 'Internal Server Error', error: String(error) });
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

// BLACKLIST Visitor (Super Admin Only)
router.patch('/:id/blacklist', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { isBlacklisted } = req.body;

        // Only super admin can blacklist (plant is null for super admin)
        if ((req as any).user && (req as any).user.plant) {
            return res.status(403).json({ message: 'Access denied: Only Super Admin can blacklist/unblacklist' });
        }

        await db.run('UPDATE visitors SET is_blacklisted = $1 WHERE id = $2', [isBlacklisted, id]);
        res.json({ message: isBlacklisted ? 'Visitor blacklisted' : 'Visitor unblacklisted' });
    } catch (error) {
        console.error('Error blacklisting visitor:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// UPDATE Visitor Details
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, company, host, purpose, assets,
            safetyEquipment, visitorCardNo, mobile, aadharNo
        } = req.body;

        // Check if visitor exists and belongs to the admin's plant
        const visitor = await db.get('SELECT * FROM visitors WHERE id = $1', [id]);
        if (!visitor) return res.status(404).json({ message: 'Visitor not found' });

        if ((req as any).user && (req as any).user.plant && (visitor as any).plant !== (req as any).user.plant) {
            return res.status(403).json({ message: 'Access denied: Visitor belongs to a different plant' });
        }

        const sql = `
            UPDATE visitors 
            SET name = $1, company = $2, host = $3, purpose = $4, 
                assets = $5, safety_equipment = $6, visitor_card_no = $7, mobile = $8, aadhar_no = $9
            WHERE id = $10
        `;

        await db.run(sql, [
            name, company, host, purpose, assets,
            safetyEquipment, visitorCardNo, mobile, aadharNo, id
        ]);

        res.json({ message: 'Visitor details updated successfully' });

    } catch (error) {
        console.error('Error updating visitor:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// DELETE Visitor (Soft Delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Note: Logic allows anyone with access to call this, but typically UI restricts to admins.
        // Requirement was: "if anyone delete... even if admin / superadmin... only hidden"
        // So we just soft delete regardless of who calls it (as long as authenticated)

        // Only super admin (plant is null) can delete - keeping this check as per original code for now, 
        // but just changing the action to soft delete. 
        // User asked: "if anyone delete... the given entry will be only hidden"
        // The original code restricted DELETE to Super Admin. I will keep that restriction unless asked otherwise,
        // but ensure the action is SOFT delete.

        if ((req as any).user && (req as any).user.plant) {
            return res.status(403).json({ message: 'Access denied: Only Super Admin can delete records' });
        }

        await db.run('UPDATE visitors SET is_deleted = TRUE WHERE id = $1', [id]);

        res.json({ message: 'Visitor deleted successfully' });
    } catch (error) {
        console.error('Error deleting visitor:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

export default router;
