import { Router } from 'express';
import { db } from '../db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();


const csvSafe = (value: unknown) => {
    const stringValue = String(value ?? '');
    if (/^[=+\-@]/.test(stringValue)) {
        return `'${stringValue}`;
    }
    return stringValue;
};


router.get('/csv', authenticateToken, async (req, res) => {
    try {
        const { from, to } = req.query;

        let query = `
            SELECT batch_no, name, mobile, company, host, purpose, plant, assets, visit_date, visit_time, entry_time, exit_time, status, photo_path 
            FROM visitors
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (from) {
            query += ` AND visit_date >= $${paramIndex}`;
            params.push(from);
            paramIndex++;
        }
        if (to) {
            query += ` AND visit_date <= $${paramIndex}`;
            params.push(to);
            paramIndex++;
        }

        // Filter by plant
        if ((req as any).user && (req as any).user.plant) {
            query += ` AND plant = $${paramIndex}`;
            params.push((req as any).user.plant);
            paramIndex++;
        }

        query += ' ORDER BY id DESC';

        const visitors = await db.all<any>(query, params);

        // Generate CSV
        const headers = ['Batch No', 'Name', 'Mobile', 'Company', 'Host', 'Purpose', 'Plant', 'Assets', 'Visit Date', 'Visit Time', 'Entry Time', 'Exit Time', 'Status', 'Photo Link'];
        const csvRows = [headers.join(',')];

        const baseUrl = `${req.protocol}://${req.get('host')}`;

        visitors.forEach(v => {
            const photoUrl = v.photo_path ? `${baseUrl}${v.photo_path}` : '';
            const row = [
                csvSafe(v.batch_no),
                `"${csvSafe(v.name)}"`,
                csvSafe(v.mobile),
                `"${csvSafe(v.company)}"`,
                `"${csvSafe(v.host)}"`,
                `"${csvSafe(v.purpose)}"`,
                `"${csvSafe(v.plant || '')}"`,
                `"${csvSafe(v.assets || '')}"`,
                csvSafe(v.visit_date),
                csvSafe(v.visit_time),
                csvSafe(v.entry_time || ''),
                csvSafe(v.exit_time || ''),
                csvSafe(v.status),
                `"${csvSafe(photoUrl)}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="visitor_report.csv"');
        res.send(csvString);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
});

export default router;
