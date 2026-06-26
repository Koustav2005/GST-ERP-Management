const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_management',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function setupManagementOnlySchema() {
    const client = await pool.connect();

    try {
        console.log('🚀 Setting up Management-only database schema...\n');

        await client.query('BEGIN');

        // Create companies table
        console.log('📋 Creating companies table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        gst_number VARCHAR(15),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Companies table created\n');

        // Create users table (Management only)
        console.log('📋 Creating users table (Management only)...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role = 'management'),
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
        console.log('✅ Users table created (only allows management role)\n');

        // Create projects table (simplified - no assignment)
        console.log('📋 Creating projects table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        created_by INTEGER NOT NULL REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        sketch_url TEXT,
        hsn_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by)');
        console.log('✅ Projects table created\n');

        // Create bill_of_materials table
        console.log('📋 Creating bill_of_materials table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS bill_of_materials (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        serial_number INTEGER NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        hsn VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, serial_number)
      )
    `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_bom_project_id ON bill_of_materials(project_id)');
        console.log('✅ Bill of materials table created\n');

        // Create notifications table
        console.log('📋 Creating notifications table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)');
        console.log('✅ Notifications table created\n');

        // Create inventory table
        console.log('📋 Creating inventory table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
        unit VARCHAR(50) NOT NULL,
        hsn VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, item_name)
      )
    `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_company_id ON inventory(company_id)');
        console.log('✅ Inventory table created\n');

        // Create orders table (simplified)
        console.log('📋 Creating orders table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        order_type VARCHAR(50) NOT NULL CHECK (order_type IN ('major', 'minor')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'delivered', 'cancelled')),
        created_by INTEGER NOT NULL REFERENCES users(id),
        total_amount DECIMAL(10, 2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await client.query('CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id)');
        console.log('✅ Orders table created\n');

        await client.query('COMMIT');

        console.log('✅ Database schema setup completed successfully!\n');
        console.log('Summary of created tables:');
        console.log('  - companies');
        console.log('  - users (management only)');
        console.log('  - projects (simplified, no assignment)');
        console.log('  - bill_of_materials');
        console.log('  - notifications');
        console.log('  - inventory');
        console.log('  - orders');
        console.log('\nNext steps:');
        console.log('  1. Start the backend server');
        console.log('  2. Create a Management user account via signup');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Setup failed:', error.message);
        console.error('Full error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the setup
setupManagementOnlySchema()
    .then(() => {
        console.log('\n🎉 Setup script completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Setup script failed!');
        process.exit(1);
    });
