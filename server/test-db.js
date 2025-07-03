import { pool } from './src/config/database.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    
    // Check if tickets table exists
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('\nAvailable tables:');
    console.table(tables.rows);
    
    // Check if there are any tickets
    try {
      const tickets = await pool.query('SELECT * FROM tickets LIMIT 5');
      console.log('\nSample tickets:', tickets.rows);
    } catch (err) {
      console.error('Error querying tickets table:', err.message);
    }
    
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

testConnection();
