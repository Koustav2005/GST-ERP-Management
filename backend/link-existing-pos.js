const pool = require('./config/database');

async function linkExistingPOs() {
    try {
        console.log('Linking existing projects to PO files from enquiries...');

        // Find projects that have a PO number but no po_filename/po_path
        const res = await pool.query(`
            SELECT p.id, p.name, p.po_number 
            FROM projects p 
            WHERE (p.po_filename IS NULL OR p.po_path IS NULL)
        `);

        console.log(`Found ${res.rowCount} projects to check.`);

        for (const project of res.rows) {
            // Since we don't have a direct link yet, we try to find the enquiry 
            // that this project was created from. 
            // Most projects were named "Project EN0001" or similar initially.
            // Or we can look for enquiries where the po_number matches? 
            // Wait, po_number in projects is sequential (PO0000000001), 
            // but enquiries don't have po_number, they have po_filename.

            // Let's try to find an enquiry that has a PO uploaded 
            // and see if we can link it by some logic if possible.
            // Actually, the user just auto-created them recently.

            // If the project description has the enquiry number:
            // "Auto-created from Enquiry EN0001. PO uploaded by..."
            const match = project.name.match(/EN(\d+)/);
            let enquiryNumber = null;
            if (match) {
                enquiryNumber = `EN${match[1]}`;
            } else {
                // Check description
                const descResult = await pool.query("SELECT description FROM projects WHERE id = $1", [project.id]);
                const desc = descResult.rows[0].description;
                const descMatch = desc ? desc.match(/Enquiry (EN\d+)/) : null;
                if (descMatch) enquiryNumber = descMatch[1];
            }

            if (enquiryNumber) {
                console.log(`Project ${project.id} seems to belong to Enquiry ${enquiryNumber}`);
                const enqResult = await pool.query(
                    "SELECT po_filename, po_path FROM enquiries WHERE enquiry_number = $1 AND po_filename IS NOT NULL",
                    [enquiryNumber]
                );

                if (enqResult.rows.length > 0) {
                    const { po_filename, po_path } = enqResult.rows[0];
                    await pool.query(
                        "UPDATE projects SET po_filename = $1, po_path = $2 WHERE id = $3",
                        [po_filename, po_path, project.id]
                    );
                    console.log(`✅ Linked PO for project ${project.id}`);
                }
            }
        }

        console.log('Finished linking existing POs.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error linking POs:', error);
        process.exit(1);
    }
}

linkExistingPOs();
