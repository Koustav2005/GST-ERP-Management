const pool = require('./config/database');

async function debugMaterialUsage() {
    try {
        console.log('=== DEBUGGING MATERIAL USAGE REPORTS ===\n');

        // Get all material usage reports
        const reports = await pool.query(`
      SELECT id, project_id, project_name, materials, created_at 
      FROM material_usage_reports 
      ORDER BY project_id, created_at DESC
    `);

        console.log(`Total reports in DB: ${reports.rows.length}\n`);

        let currentProjectId = null;
        let projectTotal = 0;

        for (const report of reports.rows) {
            if (currentProjectId !== report.project_id) {
                if (currentProjectId !== null) {
                    console.log(`  >>> PROJECT TOTAL GST: ₹${projectTotal.toFixed(2)}\n`);
                }
                currentProjectId = report.project_id;
                projectTotal = 0;
                console.log(`\n--- PROJECT: ${report.project_name} (ID: ${report.project_id}) ---`);
            }

            const materials = typeof report.materials === 'string'
                ? JSON.parse(report.materials)
                : report.materials;

            let reportGst = 0;
            console.log(`\nReport #${report.id} (Created: ${new Date(report.created_at).toLocaleString()}):`);

            materials.forEach(m => {
                const gst = parseFloat(m.gst_amount) || 0;
                reportGst += gst;
                console.log(`  - ${m.material_name}: Qty=${m.quantity_used}, GST=₹${gst.toFixed(2)}`);
            });

            console.log(`  Report GST Total: ₹${reportGst.toFixed(2)}`);
            projectTotal += reportGst;
        }

        if (currentProjectId !== null) {
            console.log(`  >>> PROJECT TOTAL GST: ₹${projectTotal.toFixed(2)}\n`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

debugMaterialUsage();
