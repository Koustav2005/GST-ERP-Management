const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_management',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function addMasterMaterialsTable() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Read and execute the master materials schema
        const schemaPath = path.join(__dirname, 'database', 'master-materials-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await client.query(schema);

        await client.query('COMMIT');
        console.log('✅ Master materials table created successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating master materials table:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addMasterMaterialsTable();
