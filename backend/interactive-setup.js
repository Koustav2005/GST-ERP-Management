const readline = require('readline');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function interactiveSetup() {
  console.log('=== PostgreSQL Database Setup ===\n');
  
  const host = await question('Enter PostgreSQL host (default: localhost): ') || 'localhost';
  const port = await question('Enter PostgreSQL port (default: 5432): ') || '5432';
  const user = await question('Enter PostgreSQL username (default: postgres): ') || 'postgres';
  const password = await question('Enter PostgreSQL password: ');
  const dbName = await question('Enter database name (default: gst_management): ') || 'gst_management';

  console.log('\nTesting connection...');

  const client = new Client({
    host,
    port,
    database: 'postgres',
    user,
    password,
  });

  try {
    await client.connect();
    console.log('✓ Connection successful!\n');

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

    // Connect to new database and create tables
    const appClient = new Client({
      host,
      port,
      database: dbName,
      user,
      password,
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
DB_HOST=${host}
DB_PORT=${port}
DB_NAME=${dbName}
DB_USER=${user}
DB_PASSWORD=${password}
JWT_SECRET=gst_management_secret_key_2024_secure_token
`;

    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log('✓ .env file updated\n');

    console.log('✅ Setup completed successfully!');
    console.log('\nYou can now start the server with: npm run dev');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPlease check your PostgreSQL credentials and try again.');
  } finally {
    rl.close();
  }
}

interactiveSetup();
