const pool = require('./config/database');

async function tableExists(client, tableName) {
    const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    );
  `, [tableName]);
    return result.rows[0].exists;
}

async function cleanupSVCEData() {
    const client = await pool.connect();

    try {
        console.log('Starting SVCE company data cleanup...\n');

        await client.query('BEGIN');

        // Find SVCE company ID
        const companyResult = await client.query("SELECT id, name FROM companies WHERE name ILIKE '%SVCE%' LIMIT 1");

        if (companyResult.rows.length === 0) {
            console.log('❌ SVCE company not found in database');
            await client.query('ROLLBACK');
            return;
        }

        const svceCompanyId = companyResult.rows[0].id;
        const companyName = companyResult.rows[0].name;

        console.log(`Found company: "${companyName}" (ID: ${svceCompanyId})`);
        console.log('Deleting all related data...\n');

        // Delete in order to respect foreign key constraints

        if (await tableExists(client, 'material_usage_reports')) {
            console.log('1. Deleting material usage reports...');
            await client.query('DELETE FROM material_usage_reports WHERE project_id IN (SELECT id FROM projects WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'project_expenses')) {
            console.log('2. Deleting project expenses...');
            await client.query('DELETE FROM project_expenses WHERE project_id IN (SELECT id FROM projects WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'sales_orders')) {
            console.log('3. Deleting sales orders...');
            await client.query('DELETE FROM sales_orders WHERE inventory_id IN (SELECT id FROM sales_inventory WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'sales_inventory')) {
            console.log('4. Deleting sales inventory...');
            await client.query('DELETE FROM sales_inventory WHERE company_id = $1', [svceCompanyId]);
        }

        if (await tableExists(client, 'allocation_tasks')) {
            console.log('5. Deleting allocation tasks...');
            await client.query('DELETE FROM allocation_tasks WHERE store_request_id IN (SELECT id FROM store_requests WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'store_request_items')) {
            console.log('6. Deleting store request items...');
            await client.query('DELETE FROM store_request_items WHERE request_id IN (SELECT id FROM store_requests WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'store_requests')) {
            console.log('7. Deleting store requests...');
            await client.query('DELETE FROM store_requests WHERE company_id = $1', [svceCompanyId]);
        }

        if (await tableExists(client, 'barcodes')) {
            console.log('8. Deleting barcodes...');
            await client.query('DELETE FROM barcodes WHERE company_id = $1', [svceCompanyId]);
        }

        if (await tableExists(client, 'inventory')) {
            console.log('9. Deleting inventory...');
            await client.query('DELETE FROM inventory WHERE company_id = $1', [svceCompanyId]);
        }

        if (await tableExists(client, 'materials_detail')) {
            console.log('10. Deleting materials detail...');
            await client.query('DELETE FROM materials_detail WHERE company_id = $1', [svceCompanyId]);
        }

        if (await tableExists(client, 'bid_items') && await tableExists(client, 'vendor_bids') && await tableExists(client, 'vendor_demands')) {
            console.log('11. Deleting bid items...');
            await client.query('DELETE FROM bid_items WHERE bid_id IN (SELECT id FROM vendor_bids WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = $1))', [svceCompanyId]);
        }

        if (await tableExists(client, 'vendor_bids') && await tableExists(client, 'vendor_demands')) {
            console.log('12. Deleting vendor bids...');
            await client.query('DELETE FROM vendor_bids WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'demand_items')) {
            console.log('13. Deleting demand items...');
            await client.query('DELETE FROM demand_items WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'vendor_demands')) {
            console.log('14. Deleting vendor demands...');
            await client.query('DELETE FROM vendor_demands WHERE company_id = $1', [svceCompanyId]);
        }

        if (await tableExists(client, 'requirement_items')) {
            console.log('15. Deleting requirement items...');
            await client.query('DELETE FROM requirement_items WHERE requirement_id IN (SELECT id FROM requirements WHERE project_id IN (SELECT id FROM projects WHERE company_id = $1))', [svceCompanyId]);
        }

        if (await tableExists(client, 'requirements')) {
            console.log('16. Deleting requirements...');
            await client.query('DELETE FROM requirements WHERE project_id IN (SELECT id FROM projects WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'project_revisions')) {
            console.log('17. Deleting project revisions...');
            await client.query('DELETE FROM project_revisions WHERE project_id IN (SELECT id FROM projects WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'bill_of_materials')) {
            console.log('18. Deleting bill of materials...');
            await client.query('DELETE FROM bill_of_materials WHERE project_id IN (SELECT id FROM projects WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'projects')) {
            console.log('19. Deleting projects...');
            await client.query('DELETE FROM projects WHERE company_id = $1', [svceCompanyId]);
        }

        if (await tableExists(client, 'notifications')) {
            console.log('20. Deleting notifications...');
            await client.query('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE company_id = $1)', [svceCompanyId]);
        }

        if (await tableExists(client, 'users')) {
            console.log('21. Deleting users...');
            await client.query('DELETE FROM users WHERE company_id = $1', [svceCompanyId]);
        }

        if (await tableExists(client, 'companies')) {
            console.log('22. Deleting company...');
            await client.query('DELETE FROM companies WHERE id = $1', [svceCompanyId]);
        }

        await client.query('COMMIT');

        console.log('\n✅ Successfully deleted all SVCE company data!');
        console.log('You can now create a new company and test the app with fresh data.\n');

        // Show remaining counts
        const companiesCount = await pool.query('SELECT COUNT(*) FROM companies');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const projectsCount = await pool.query('SELECT COUNT(*) FROM projects');

        console.log('Database status:');
        console.log(`  - Companies remaining: ${companiesCount.rows[0].count}`);
        console.log(`  - Users remaining: ${usersCount.rows[0].count}`);
        console.log(`  - Projects remaining: ${projectsCount.rows[0].count}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error during cleanup:', error.message);
        console.error('Stack:', error.stack);
        console.log('\n⚠️  Rolled back all changes - database is unchanged');
    } finally {
        client.release();
        pool.end();
    }
}

cleanupSVCEData();
