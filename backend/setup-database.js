const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  // First connect to postgres database to create our database
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Check if database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME]
    );

    if (dbCheck.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`✓ Database '${process.env.DB_NAME}' created successfully`);
    } else {
      console.log(`✓ Database '${process.env.DB_NAME}' already exists`);
    }

    await client.end();

    // Now connect to the new database and create tables
    const appClient = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await appClient.connect();
    console.log(`Connected to '${process.env.DB_NAME}' database`);

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await appClient.query(schema);
    console.log('✓ Database schema created successfully');

    await appClient.end();
    console.log('\n✅ Database setup completed successfully!');
    console.log('\nYou can now start the server with: npm run dev');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

setupDatabase();
