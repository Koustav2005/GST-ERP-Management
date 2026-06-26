const pool = require('./config/database');

async function verifyMatching() {
    try {
        const companyId = 2;
        const testItems = ["125 CC ENG", "Side mirror", "Wheel"];

        console.log('Verifying Price Matching Logic...');

        for (const item of testItems) {
            console.log(`\nTesting Item: "${item}"`);

            const res = await pool.query(`
        SELECT item_name, unit_price 
        FROM materials_detail 
        WHERE company_id = $1 
        AND LOWER(REPLACE(item_name, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
      `, [companyId, item]);

            if (res.rows.length > 0) {
                console.log(`✅ MATCH FOUND: "${res.rows[0].item_name}" - Price: ${res.rows[0].unit_price}`);
            } else {
                console.log(`❌ NO MATCH`);
            }
        }

    } catch (error) {
        console.error(error);
    } finally {
        pool.end();
    }
}

verifyMatching();
