const pool = require('./config/database');

async function deleteAllSVCEData() {
    const client = await pool.connect();

    try {
        console.log('🗑️  Deleting all SVCE company data...\n');

        await client.query('BEGIN');

        const queries = [
            { name: 'Material usage reports', sql: 'DELETE FROM material_usage_reports WHERE project_id IN (SELECT id FROM projects WHERE company_id = 1)' },
            { name: 'Sales orders', sql: 'DELETE FROM sales_orders WHERE inventory_id IN (SELECT id FROM sales_inventory WHERE project_id IN (SELECT id FROM projects WHERE company_id = 1))' },
            { name: 'Sales inventory', sql: 'DELETE FROM sales_inventory WHERE project_id IN (SELECT id FROM projects WHERE company_id = 1)' },
            { name: 'Barcodes', sql: 'DELETE FROM barcodes WHERE company_id = 1' },
            { name: 'Inventory', sql: 'DELETE FROM inventory WHERE company_id = 1' },
            { name: 'Materials detail', sql: 'DELETE FROM materials_detail WHERE company_id = 1' },
            { name: 'Bid items', sql: 'DELETE FROM bid_items WHERE bid_id IN (SELECT id FROM vendor_bids WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = 1))' },
            { name: 'Vendor bids', sql: 'DELETE FROM vendor_bids WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = 1)' },
            { name: 'Demand items', sql: 'DELETE FROM demand_items WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = 1)' },
            { name: 'Vendor demands', sql: 'DELETE FROM vendor_demands WHERE company_id = 1' },
            { name: 'Requirement items', sql: 'DELETE FROM requirement_items WHERE requirement_id IN (SELECT id FROM requirements WHERE project_id IN (SELECT id FROM projects WHERE company_id = 1))' },
            { name: 'Requirements', sql: 'DELETE FROM requirements WHERE project_id IN (SELECT id FROM projects WHERE company_id = 1)' },
            { name: 'Project revisions', sql: 'DELETE FROM project_revisions WHERE project_id IN (SELECT id FROM projects WHERE company_id = 1)' },
            { name: 'Bill of materials', sql: 'DELETE FROM bill_of_materials WHERE project_id IN (SELECT id FROM projects WHERE company_id = 1)' },
            { name: 'Projects', sql: 'DELETE FROM projects WHERE company_id = 1' },
            { name: 'Notifications', sql: 'DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE company_id = 1)' },
            { name: 'Users', sql: 'DELETE FROM users WHERE company_id = 1' },
            { name: 'Company', sql: 'DELETE FROM companies WHERE id = 1' }
        ];

        for (const query of queries) {
            try {
                const result = await client.query(query.sql);
                console.log(`✓ ${query.name}: ${result.rowCount} rows deleted`);
            } catch (err) {
                console.log(`⚠ ${query.name}: ${err.message} (skipped)`);
            }
        }

        await client.query('COMMIT');

        console.log('\n✅ Successfully deleted all SVCE company data!');
        console.log('You can now create a new company and test the app.\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error:', error.message);
        console.log('⚠️  Rolled back - no changes made');
    } finally {
        client.release();
        pool.end();
    }
}

deleteAllSVCEData();
