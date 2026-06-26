const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function debugPO() {
    try {
        console.log('--- DATABASE CHECK ---');
        const dbRes = await pool.query("SELECT id, name, po_filename, po_path FROM projects WHERE po_filename IS NOT NULL OR name LIKE '%EN0001%'");
        console.log(JSON.stringify(dbRes.rows, null, 2));

        console.log('\n--- FILE SYSTEM CHECK (uploads/enquiries) ---');
        const enquiriesDir = path.join(__dirname, 'uploads', 'enquiries');
        if (fs.existsSync(enquiriesDir)) {
            const files = fs.readdirSync(enquiriesDir);
            files.forEach(f => {
                if (f.includes('RV.pdf') || f.includes('PO_')) {
                    console.log(`Found file: "${f}"`);
                }
            });
        } else {
            console.log('enquiries directory not found');
        }

        console.log('\n--- FILE SYSTEM CHECK (uploads/pos) ---');
        const posDir = path.join(__dirname, 'uploads', 'pos');
        if (fs.existsSync(posDir)) {
            const files = fs.readdirSync(posDir);
            files.forEach(f => {
                if (f.includes('RV.pdf') || f.includes('PO_')) {
                    console.log(`Found file: "${f}"`);
                }
            });
        } else {
            console.log('pos directory not found');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugPO();
