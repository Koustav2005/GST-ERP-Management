const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function cleanupSVCEData() {
    const client = await pool.connect();

    try {
        console.log('Starting SVCE company data cleanup...\n');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'cleanup_svce_data.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL
        await client.query(sql);

        console.log('\n✅ Successfully deleted all SVCE company data');
        console.log('You can now create a new company and test the app with fresh data.\n');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        console.error('Stack:', error.stack);
    } finally {
        client.release();
        pool.end();
    }
}

// Confirm before running
console.log('⚠️  WARNING: This will delete ALL data related to SVCE company!');
console.log('This includes:');
console.log('  - Company record');
console.log('  - All users in the company');
console.log('  - All projects');
console.log('  - All sales, inventory, materials');
console.log('  - All material usage reports');
console.log('  - All vendor demands and bids');
console.log('  - All store requests');
console.log('  - Everything else related to SVCE\n');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('Type "YES" to confirm deletion: ', (answer) => {
    if (answer === 'YES') {
        cleanupSVCEData();
    } else {
        console.log('Cleanup cancelled.');
        pool.end();
    }
    readline.close();
});
