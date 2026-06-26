const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_svcee',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function cleanupQRCodes() {
    const client = await pool.connect();
    try {
        console.log('🧹 Starting cleanup of allocation QR codes...');

        // Fetch all allocation tasks
        const res = await client.query('SELECT id, qr_number, worker_id, allocation_qr_code FROM allocation_tasks');
        console.log(`📦 Found ${res.rows.length} tasks to check.`);

        let updatedCount = 0;

        for (const task of res.rows) {
            let needsUpdate = false;
            let qrData;

            try {
                qrData = JSON.parse(task.allocation_qr_code);
            } catch (e) {
                console.warn(`⚠️ Invalid JSON for task ${task.id}, skipping.`);
                continue;
            }

            // Check if it has 'items' or 'store_request_id' (old format)
            if (qrData.items || qrData.store_request_id) {
                needsUpdate = true;
            }

            if (needsUpdate) {
                // Create minimal payload
                const minimalData = JSON.stringify({
                    type: 'allocation_task',
                    qr_number: task.qr_number,
                    id: task.id,
                    worker_id: task.worker_id
                });

                await client.query('UPDATE allocation_tasks SET allocation_qr_code = $1 WHERE id = $2', [minimalData, task.id]);
                updatedCount++;
                console.log(`✅ Updated task ${task.id} with minimal QR data.`);
            }
        }

        console.log(`🎉 Cleanup complete! Updated ${updatedCount} tasks.`);

    } catch (err) {
        console.error('❌ Error during cleanup:', err);
    } finally {
        client.release();
        pool.end();
    }
}

cleanupQRCodes();
