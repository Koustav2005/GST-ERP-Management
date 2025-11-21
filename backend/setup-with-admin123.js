const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Setting up GST Management Database                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const config = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin123',
  };

  // First connect to postgres database
  const client = new Client({
    ...config,
    database: 'postgres',
  });

  try {
    console.log('Step 1: Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Check if database exists
    console.log('Step 2: Checking if database exists...');
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'gst_management'"
    );

    if (dbCheck.rows.length === 0) {
      console.log('Creating database "gst_management"...');
      await client.query('CREATE DATABASE gst_management');
      console.log('✅ Database created!\n');
    } else {
      console.log('✅ Database already exists\n');
    }

    await client.end();

    // Connect to the new database
    console.log('Step 3: Connecting to gst_management database...');
    const appClient = new Client({
      ...config,
      database: 'gst_management',
    });

    await appClient.connect();
    console.log('✅ Connected to gst_management\n');

    // Create tables
    console.log('Step 4: Creating tables...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await appClient.query(schema);
    console.log('✅ Tables created successfully!\n');

    // Verify table creation
    const tableCheck = await appClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Created tables:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    await appClient.end();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Setup Completed Successfully!                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log('Next steps:');
    console.log('1. Start the backend server:');
    console.log('   npm run dev\n');
    console.log('2. Start the frontend (in new terminal):');
    console.log('   cd ..');
    console.log('   npx expo start\n');

  } catch (error) {
    console.error('\n❌ Setup failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 PostgreSQL is not accepting connections.');
      console.error('Please check:');
      console.error('1. PostgreSQL service is running');
      console.error('2. PostgreSQL is listening on port 5432');
    } else if (error.message.includes('password')) {
      console.error('\n🔑 Password authentication failed.');
      console.error('Please verify password is: admin123');
    } else {
      console.error('\nFull error:', error);
    }
    
    process.exit(1);
  }
}

setupDatabase();
