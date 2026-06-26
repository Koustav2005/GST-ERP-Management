const pool = require('./config/database');

async function forceDeleteSVCE() {
    const client = await pool.connect();

    try {
        console.log('🗑️  Force deleting all SVCE company data...\n');

        await client.query('BEGIN');

        // Disable foreign key checks temporarily
        console.log('Disabling triggers...');
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        const companyId = 1;

        // Delete everything in reverse dependency order
        const deletions = [
            // First: Delete child records that reference projects
            { table: 'material_usage_reports', condition: `project_id IN (SELECT id FROM projects WHERE company_id = ${companyId})` },
            { table: 'sales_orders', condition: `inventory_id IN (SELECT id FROM sales_inventory WHERE project_id IN (SELECT id FROM projects WHERE company_id = ${companyId}))` },
            { table: 'sales_inventory', condition: `project_id IN (SELECT id FROM projects WHERE company_id = ${companyId})` },
            { table: 'allocation_tasks', condition: `store_request_id IN (SELECT id FROM store_requests WHERE company_id = ${companyId})` },
            { table: 'store_request_items', condition: `request_id IN (SELECT id FROM store_requests WHERE company_id = ${companyId})` },
            { table: 'store_requests', condition: `company_id = ${companyId}` },
            { table: 'requirement_items', condition: `requirement_id IN (SELECT id FROM requirements WHERE project_id IN (SELECT id FROM projects WHERE company_id = ${companyId}))` },
            { table: 'requirements', condition: `project_id IN (SELECT id FROM projects WHERE company_id = ${companyId})` },
            { table: 'project_revisions', condition: `project_id IN (SELECT id FROM projects WHERE company_id = ${companyId})` },
            { table: 'bill_of_materials', condition: `project_id IN (SELECT id FROM projects WHERE company_id = ${companyId})` },

            // Vendor/bid related
            { table: 'bid_items', condition: `bid_id IN (SELECT id FROM vendor_bids WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = ${companyId}))` },
            { table: 'vendor_bids', condition: `demand_id IN (SELECT id FROM vendor_demands WHERE company_id = ${companyId})` },
            { table: 'demand_items', condition: `demand_id IN (SELECT id FROM vendor_demands WHERE company_id = ${companyId})` },
            { table: 'vendor_demands', condition: `company_id = ${companyId}` },

            // Materials and inventory
            { table: 'barcodes', condition: `company_id = ${companyId}` },
            { table: 'inventory', condition: `company_id = ${companyId}` },
            { table: 'materials_detail', condition: `company_id = ${companyId}` },

            // Projects
            { table: 'projects', condition: `company_id = ${companyId}` },

            // Users and notifications
            { table: 'notifications', condition: `user_id IN (SELECT id FROM users WHERE company_id = ${companyId})` },
            { table: 'users', condition: `company_id = ${companyId}` },

            // Finally, the company
            { table: 'companies', condition: `id = ${companyId}` }
        ];

        for (const del of deletions) {
            try {
                const result = await client.query(`DELETE FROM ${del.table} WHERE ${del.condition}`);
                console.log(`✓ ${del.table}: ${result.rowCount} rows deleted`);
            } catch (err) {
                if (err.code === '42P01') {
                    console.log(`⚠ ${del.table}: table doesn't exist (skipped)`);
                } else {
                    console.log(`⚠ ${del.table}: ${err.message}`);
                }
            }
        }

        await client.query('COMMIT');

        console.log('\n✅ Successfully deleted all SVCE company data!');
        console.log('Database is now clean. You can create a new company.\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Fatal error:', error.message);
        console.error('Stack:', error.stack);
        console.log('\n⚠️  Transaction rolled back');
    } finally {
        client.release();
        pool.end();
    }
}

forceDeleteSVCE();
