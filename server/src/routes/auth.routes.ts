import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();

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

        const secret = process.env.JWT_SECRET;
        if (!secret) return res.status(500).json({ message: 'Server misconfiguration: JWT secret missing' });

        const token = jwt.sign({ id: user.id, username: user.username, plant: (user as any).plant }, secret, { expiresIn: '12h' });
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
        { name: 'Seamsless Division', user: 'admin_seamless' },
        { name: 'Forging Division', user: 'admin_forging' },
        { name: 'Main Plant', user: 'admin_main' },
        { name: 'Bright Bar', user: 'admin_bright' },
        { name: 'Flat Bar', user: 'admin_flat' },
        { name: 'Wire Plant', user: 'admin_wire' },
        { name: 'Main Plant 2 ( SMS 2 )', user: 'admin_main2' },
        { name: '40"Inch Mill', user: 'admin_40inch' }
    ];

    try {
        // Super Admin
        const admin = await db.get('SELECT * FROM users WHERE username = $1', ['cslsuperadmin']);
        if (!admin) {
            const hash = await bcrypt.hash('cslsuperadmin', 10);
            await db.run('INSERT INTO users (username, password, plant) VALUES ($1, $2, $3)', ['cslsuperadmin', hash, null]);
            console.log('Super admin created: cslsuperadmin / cslsuperadmin');
        }

        // --- NEW LOGIC: Clean up old/unused admins ---
        // Get all users who are NOT 'admin' and NOT in our new list
        const validUsers = ['cslsuperadmin', ...plants.map(p => p.user)];
        // Create parameter placeholders like $1, $2, $3...
        const placeholders = validUsers.map((_, i) => `$${i + 1}`).join(', ');

        await db.run(`DELETE FROM users WHERE username NOT IN (${placeholders})`, validUsers);
        console.log('Cleaned up old/invalid admin accounts.');

        // Plant Admins
        for (const p of plants) {
            const user = await db.get('SELECT * FROM users WHERE username = $1', [p.user]);
            if (!user) {
                const hash = await bcrypt.hash('admin123', 10);
                await db.run('INSERT INTO users (username, password, plant) VALUES ($1, $2, $3)', [p.user, hash, p.name]);
                console.log(`Plant admin created: ${p.user} / admin123 (${p.name})`);
            } else {
                // Determine if we need to update the plant name? 
                // Mostly just ensuring the user exists. Ideally we might want to update the plant field if it changed (e.g. old admin_forging was 'Forging', now 'Forging Division')
                if ((user as any).plant !== p.name) {
                    await db.run('UPDATE users SET plant = $1 WHERE username = $2', [p.name, p.user]);
                    console.log(`Updated plant for ${p.user} to ${p.name}`);
                }
            }
        }
    } catch (e) {
        console.error('Failed to seed admins:', e);
    }
}
