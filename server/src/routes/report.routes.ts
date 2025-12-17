import { Router } from 'express';
import { db } from '../db';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/csv', authenticateToken, async (req, res) => {
    try {
        const { from, to } = req.query;

        let query = `
            SELECT batch_no, name, mobile, company, host, purpose, visit_date, visit_time, entry_time, exit_time, status, photo_path 
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

        query += ' ORDER BY id DESC';

        const visitors = await db.all<any>(query, params);

        // Generate CSV
        const headers = ['Batch No', 'Name', 'Mobile', 'Company', 'Host', 'Purpose', 'Visit Date', 'Visit Time', 'Entry Time', 'Exit Time', 'Status', 'Photo Link'];
        const csvRows = [headers.join(',')];

        const baseUrl = `${req.protocol}://${req.get('host')}`;

        visitors.forEach(v => {
            const photoUrl = v.photo_path ? `${baseUrl}${v.photo_path}` : '';
            const row = [
                v.batch_no,
                `"${v.name}"`,
                v.mobile,
                `"${v.company}"`,
                `"${v.host}"`,
                `"${v.purpose}"`,
                v.visit_date,
                v.visit_time,
                v.entry_time || '',
                v.exit_time || '',
                v.status,
                `"${photoUrl}"`
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
