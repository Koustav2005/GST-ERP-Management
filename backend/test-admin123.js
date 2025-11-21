const { Client } = require('pg');

async function testConnection() {
  console.log('Testing connection with password: admin123\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'admin123',
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connection successful!\n');
    
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);
    
    await client.end();
    console.log('\n✅ Password "admin123" works!');
    console.log('\nNow running database setup...\n');
    
    // Run setup
    require('./setup-database.js');
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('1. Password might be incorrect');
    console.error('2. PostgreSQL might not be accepting connections');
    console.error('3. User "postgres" might not exist');
    console.error('\nTry connecting manually:');
    console.error('psql -U postgres -W');
    console.error('(Enter password: admin123)');
  }
}

testConnection();
