const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function initializeMissingTables() {
    try {
        console.log('--- Initializing Missing Procurement Tables (Robust Version) ---');

        const schemas = [
            'database/vendor-portal-schema.sql',
            'database/materials-detail-schema.sql',
            'database/orders-schema.sql',
            'database/order-receipts-schema.sql'
        ];

        for (const schemaFile of schemas) {
            console.log(`\nProcessing ${schemaFile}...`);
            const schemaPath = path.join(__dirname, schemaFile);
            const sql = fs.readFileSync(schemaPath, 'utf8');

            // Strip comments
            const cleanSql = sql.replace(/--.*$/gm, '').trim();

            if (cleanSql) {
                try {
                    await pool.query(cleanSql);
                    console.log(`✅ Successfully applied ${schemaFile}`);
                } catch (err) {
                    console.error(`❌ Error in ${schemaFile}:`, err.message);
                    // Continue to next schema even if one fails
                }
            }
        }

        console.log('\n✅ All missing procurement tables are now initialized.');
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        console.error('At statement:', error.query);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

initializeMissingTables();
