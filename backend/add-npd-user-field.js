const pool = require('./config/database');

async function addNPDUserField() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Adding npd_user_id Field to Projects                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'npd_user_id';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('⚠️  Column npd_user_id already exists. Skipping...\n');
      client.release();
      process.exit(0);
    }

    // Add npd_user_id column
    console.log('Adding npd_user_id column...');
    await client.query(`
      ALTER TABLE projects 
      ADD COLUMN npd_user_id INTEGER REFERENCES users(id);
    `);
    console.log('✅ Column added successfully!\n');

    // Update existing projects: set npd_user_id to assigned_to if role is NPD
    console.log('Updating existing projects...');
    await client.query(`
      UPDATE projects p
      SET npd_user_id = p.assigned_to
      FROM users u
      WHERE p.assigned_to = u.id AND u.role = 'npd';
    `);
    console.log('✅ Existing projects updated!\n');

    // Create index for faster lookups
    console.log('Creating index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_npd_user_id ON projects(npd_user_id);
    `);
    console.log('✅ Index created!\n');

    // Show updated structure
    const structure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position;
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Updated Projects Table Structure:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    structure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });

    client.release();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Migration Complete!                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log('The npd_user_id field tracks which NPD user is responsible');
    console.log('for each project, even after assigning to PM.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

addNPDUserField();
