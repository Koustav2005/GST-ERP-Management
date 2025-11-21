const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('=== Attempting setup without password ===\n');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    // No password
  });

  try {
    await client.connect();
    console.log('✓ Connected without password!\n');

    const dbName = 'gst_management';

    // Check if database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Creating database '${dbName}'...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log('✓ Database created\n');
    } else {
      console.log(`✓ Database '${dbName}' already exists\n`);
    }

    await client.end();

    // Connect to new database
    const appClient = new Client({
      host: 'localhost',
      port: 5432,
      database: dbName,
      user: 'postgres',
    });

    await appClient.connect();
    console.log('Creating tables...');

    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await appClient.query(schema);
    
    console.log('✓ Tables created\n');
    await appClient.end();

    // Update .env file
    const envContent = `PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${dbName}
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=gst_management_secret_key_2024_secure_token
`;

    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log('✓ .env file updated (no password)\n');

    console.log('✅ Setup completed successfully!');
    console.log('\nYou can now start the server with: npm run dev');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nYour PostgreSQL requires a password.');
    console.error('Please run: node interactive-setup.js');
  }
}

setupDatabase();
