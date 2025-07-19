import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/toll_db',
});

/**
 * Connects to the PostgreSQL database
 */
export const connectDB = async () => {
  try {
    await pool.connect();
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

/**
 * Provides access to the initialized PostgreSQL connection pool.
 * @returns The PostgreSQL Pool instance.
 */
export const getPool = (): Pool => pool;

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server and closing database connection...');
  await pool.end();
  process.exit(0);
});
