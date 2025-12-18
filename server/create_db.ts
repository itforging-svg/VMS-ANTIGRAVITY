import { Client } from 'pg';

async function createDatabase() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'postgres',
    });

    try {
        await client.connect();
        await client.query('CREATE DATABASE vms_db');
        console.log('Database vms_db created successfully');
    } catch (err: any) {
        if (err.code === '42P04') {
            console.log('Database vms_db already exists');
        } else {
            console.error('Error creating database:', err);
        }
    } finally {
        await client.end();
    }
}

createDatabase();
