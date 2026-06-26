const pool = require('./config/database');

async function testQuery() {
    try {
        const userId = 2; // Raghu
        console.log(`Testing query for assigned_to = ${userId}...`);

        // Exact same query as in the route
        const result = await pool.query(
            `SELECT e.*, u.name as uploaded_by_name
       FROM enquiries e
       LEFT JOIN users u ON e.uploaded_by = u.id
       WHERE e.assigned_to = $1
       ORDER BY e.updated_at DESC`,
            [userId]
        );

        console.log('Query result rows:', result.rows.length);
        console.log('First row:', result.rows[0]);

        await pool.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testQuery();
