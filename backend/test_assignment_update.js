const pool = require('./config/database');

async function test() {
    try {
        const enquiryId = 1;
        const npdUserId = 2; // Raghu (NPD)

        console.log(`Updating enquiry ${enquiryId} to be assigned to user ${npdUserId}...`);

        const result = await pool.query(
            `UPDATE enquiries 
       SET status = 'sent_to_npd', 
           assigned_to = $1,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING *`,
            [npdUserId, enquiryId]
        );

        console.log('Update result:', result.rows[0]);

        await pool.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
