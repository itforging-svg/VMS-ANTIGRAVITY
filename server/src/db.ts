import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'vms_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

export class Database {
    async init() {
        try {
            // Set Timezone to IST
            await pool.query("SET TIME ZONE 'Asia/Kolkata'");

            // Create Users Table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    plant VARCHAR(100)
                )
            `);

            // Migration for existing users table
            await pool.query(`
                ALTER TABLE users ADD COLUMN IF NOT EXISTS plant VARCHAR(100)
            `);

            // Create Visitors Table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS visitors (
                    id SERIAL PRIMARY KEY,
                    batch_no VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    gender VARCHAR(50),
                    mobile VARCHAR(20),
                    email VARCHAR(255),
                    address TEXT,
                    visit_date DATE,
                    visit_time VARCHAR(10),
                    duration VARCHAR(50),
                    company VARCHAR(255),
                    host VARCHAR(255),
                    purpose VARCHAR(255),
                    plant VARCHAR(100),
                    assets VARCHAR(255),
                    safety_equipment VARCHAR(255),
                    visitor_card_no VARCHAR(100),
                    aadhar_no VARCHAR(20),
                    is_blacklisted BOOLEAN DEFAULT FALSE,
                    is_deleted BOOLEAN DEFAULT FALSE,
                    photo_path TEXT,
                    status VARCHAR(50) DEFAULT 'PENDING',
                    entry_time TIMESTAMP,
                    exit_time TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Add plant column if it doesn't exist (for migration)
            await pool.query(`
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS plant VARCHAR(100)
            `);

            // Add is_deleted column if it doesn't exist
            await pool.query(`
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
            `);

            // Add new fields for migration
            await pool.query(`
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS safety_equipment VARCHAR(255)
            `);
            await pool.query(`
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS visitor_card_no VARCHAR(100)
            `);
            await pool.query(`
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS aadhar_no VARCHAR(20)
            `);
            await pool.query(`
                ALTER TABLE visitors ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE
            `);

            console.log('Connected to PostgreSQL database');
            console.log('Database tables initialized');
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    async run(sql: string, params: any[] = []): Promise<void> {
        await pool.query(sql, params);
    }

    async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
        const result = await pool.query(sql, params);
        return result.rows[0] as T | undefined;
    }

    async all<T>(sql: string, params: any[] = []): Promise<T[]> {
        const result = await pool.query(sql, params);
        return result.rows as T[];
    }
}

export const db = new Database();
