const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function fixPOData() {
    try {
        console.log('Fixing PO filenames and paths in database...');

        // 1. Fix Enquiries
        const enquiries = await pool.query("SELECT id, enquiry_number, po_filename, po_path FROM enquiries WHERE po_filename IS NOT NULL");
        for (const enq of enquiries.rows) {
            if (!enq.po_filename.startsWith('PO_')) {
                const newFilename = `PO_${enq.enquiry_number}_${enq.po_filename}`;
                console.log(`Fixing enquiry ${enq.enquiry_number}: ${enq.po_filename} -> ${newFilename}`);

                await pool.query(
                    "UPDATE enquiries SET po_filename = $1 WHERE id = $2",
                    [newFilename, enq.id]
                );
            }
        }

        // 2. Fix Projects
        const projects = await pool.query("SELECT id, po_filename, po_path, name FROM projects WHERE po_filename IS NOT NULL");
        for (const proj of projects.rows) {
            // Find the enquiry number from description or name
            const descResult = await pool.query("SELECT description FROM projects WHERE id = $1", [proj.id]);
            const desc = descResult.rows[0].description;
            const enqMatch = desc ? desc.match(/Enquiry (EN\d+)/) : null;

            if (enqMatch) {
                const enqNum = enqMatch[1];
                if (!proj.po_filename.startsWith('PO_')) {
                    const newFilename = `PO_${enqNum}_${proj.po_filename}`;
                    console.log(`Fixing project ${proj.id} (${proj.name}): ${proj.po_filename} -> ${newFilename}`);

                    await pool.query(
                        "UPDATE projects SET po_filename = $1 WHERE id = $2",
                        [newFilename, proj.id]
                    );
                }
            }
        }

        console.log('✅ Finished fixing PO data');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing PO data:', error);
        process.exit(1);
    }
}

fixPOData();
