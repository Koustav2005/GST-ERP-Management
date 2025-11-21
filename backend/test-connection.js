const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  console.log('Host:', process.env.DB_HOST);
  console.log('Port:', process.env.DB_PORT);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', 'postgres');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✓ Successfully connected to PostgreSQL!');
    
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);
    
    await client.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL service is running');
    console.error('2. Username and password in .env file are correct');
    console.error('3. PostgreSQL is listening on port 5432');
  }
}

testConnection();
