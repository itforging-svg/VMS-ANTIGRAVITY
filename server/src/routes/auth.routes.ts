import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();
const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkeyshouldbechanged';

// Interface for User
interface User {
    id: number;
    username: string;
    password: string;
}

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }

    try {
        const user = await db.get<User>('SELECT * FROM users WHERE username = $1', [username]);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, plant: (user as any).plant }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ token, username: user.username, plant: (user as any).plant });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;

// Seed Admin - exported separately
export async function seedAdmin() {
    const plants = [
        { name: 'Forging', user: 'admin_forging' },
        { name: 'NSTP', user: 'admin_nstp' },
        { name: 'SMS', user: 'admin_sms' },
        { name: 'Bright-Bar', user: 'admin_bright' }
    ];

    try {
        // Super Admin
        const admin = await db.get('SELECT * FROM users WHERE username = $1', ['admin']);
        if (!admin) {
            const hash = await bcrypt.hash('admin123', 10);
            await db.run('INSERT INTO users (username, password, plant) VALUES ($1, $2, $3)', ['admin', hash, null]);
            console.log('Super admin created: admin / admin123');
        }

        // Plant Admins
        for (const p of plants) {
            const user = await db.get('SELECT * FROM users WHERE username = $1', [p.user]);
            if (!user) {
                const hash = await bcrypt.hash('admin123', 10);
                await db.run('INSERT INTO users (username, password, plant) VALUES ($1, $2, $3)', [p.user, hash, p.name]);
                console.log(`Plant admin created: ${p.user} / admin123 (${p.name})`);
            }
        }
    } catch (e) {
        console.error('Failed to seed admins:', e);
    }
}
