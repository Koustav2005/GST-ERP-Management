const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function createTables() {
  let client;
  try {
    console.log('📦 Creating store requests tables...\n');
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Check if tables exist
    const checkResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('store_requests', 'store_request_items')
    `);
    
    if (checkResult.rows.length === 2) {
      console.log('✅ Tables already exist!');
      checkResult.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
      return;
    }
    
    console.log(`Found ${checkResult.rows.length} existing tables. Creating missing tables...\n`);
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'database', 'store-requests-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log(`✓ Statement ${i + 1} executed`);
        } catch (err) {
          // Ignore "already exists" errors
          if (err.message.includes('already exists')) {
            console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
          } else {
            throw err;
          }
        }
      }
    }
    
    // Verify tables were created
    const verifyResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('store_requests', 'store_request_items')
    `);
    
    console.log('\n✅ Setup complete!');
    console.log(`   Created ${verifyResult.rows.length} tables:`);
    verifyResult.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
    
  } catch (error) {
    console.error('\n❌ Error creating tables:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createTables();






