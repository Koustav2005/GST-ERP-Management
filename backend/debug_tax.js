const pool = require('./config/database');

async function debugTax() {
    try {
        console.log(`Connecting to database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);

        // List all tables
        const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables in DB:', tablesRes.rows.map(r => r.table_name).join(', '));

        // 1. List all projects
        const projRes = await pool.query("SELECT id, name FROM projects");
        console.log(`\nFound ${projRes.rows.length} projects:`);

        for (const project of projRes.rows) {
            console.log(`\n--------------------------------------------------`);
            console.log(`Project: '${project.name}' (ID: ${project.id})`);

            // Check if material_usage_reports exists
            const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'material_usage_reports'
        );
      `);

            if (tableCheck.rows[0].exists) {
                // 2. Get Material Usage Reports
                const usageRes = await pool.query("SELECT * FROM material_usage_reports WHERE project_id = $1", [project.id]);

                let totalGst = 0;
                if (usageRes.rows.length > 0) {
                    console.log(`  Found ${usageRes.rows.length} usage reports`);
                    usageRes.rows.forEach((report, index) => {
                        const materials = typeof report.materials === 'string' ? JSON.parse(report.materials) : report.materials;

                        materials.forEach(m => {
                            const gst = parseFloat(m.gst_amount) || 0;
                            console.log(`    - Report #${report.id} Item: ${m.material_name}, Qty: ${m.quantity_used}, GST: ${gst}`);
                            totalGst += gst;
                        });
                    });
                } else {
                    console.log(`  No usage reports found`);
                }
                console.log(`  Total Calculated GST from Usage: ${totalGst}`);
            } else {
                console.log('  material_usage_reports table does not exist');
            }

            // 3. Get Project Expenses
            // Check if project_expenses exists
            const expTableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'project_expenses'
        );
      `);

            let expGst = 0;
            if (expTableCheck.rows[0].exists) {
                const expRes = await pool.query("SELECT * FROM project_expenses WHERE project_id = $1", [project.id]);
                if (expRes.rows.length > 0) {
                    console.log(`  Found ${expRes.rows.length} manual expenses`);
                    expRes.rows.forEach(e => {
                        const gst = parseFloat(e.gst_amount) || 0;
                        console.log(`    - Expense: ${e.expense_name}, GST: ${gst}`);
                        expGst += gst;
                    });
                }
            } else {
                console.log('  project_expenses table does not exist');
            }

            console.log(`  Total Calculated GST from Expenses: ${expGst}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

debugTax();
