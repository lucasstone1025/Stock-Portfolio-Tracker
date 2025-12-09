import 'dotenv/config';
import pg from 'pg';

const db = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add phone column to users
        await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT FALSE;
    `);
        console.log('Added phone columns to users.');

        // Add alert_method column to alerts
        await db.query(`
      ALTER TABLE alerts 
      ADD COLUMN IF NOT EXISTS alert_method VARCHAR(10) DEFAULT 'email';
    `);
        console.log('Added alert_method column to alerts.');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await db.end();
    }
}

migrate();
