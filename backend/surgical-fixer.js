const fs = require('fs');
const path = require('path');

const projectsPath = path.join('c:', 'Users', 'Saurabh Kumar', 'OneDrive', 'Desktop', 'GST-SVCEE', 'gst-management-app', 'backend', 'routes', 'projects.js');

try {
    let content = fs.readFileSync(projectsPath, 'utf8');

    // The problematic part using a regex to handle whitespace
    const regex = /`,\s*\[vendorId\]\);\s*const\s+{\s*items,\s*company_id,\s*created_by\s*}\s*=\s*req\.body;/;

    const replacement = "`,\n      [vendorId]);\n\n    res.json({ orders: result.rows });\n  } catch (error) {\n    console.error('Error fetching vendor orders:', error);\n    res.status(500).json({ error: 'Server error' });\n  }\n});\n\n// Update order status\nrouter.put('/major-orders/:orderId/status', async (req, res) => {\n  try {\n    const { orderId } = req.params;\n    const { status } = req.body;\n\n    if (!status || !['pending', 'confirmed', 'order_placed', 'shipped', 'dispatched', 'delivered', 'cancelled'].includes(status)) {\n      return res.status(400).json({ error: 'Valid status is required' });\n    }\n\n    const result = await pool.query(\n      'UPDATE major_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',\n      [status, orderId]);\n\n    if (result.rows.length === 0) {\n      return res.status(404).json({ error: 'Order not found' });\n    }\n\n    res.json({ order: result.rows[0] });\n  } catch (error) {\n    console.error('Error updating order status:', error);\n    res.status(500).json({ error: 'Server error', details: error.message });\n  }\n});\n\n// Create minor order\nrouter.post('/minor-orders', async (req, res) => {\n  const client = await pool.connect();\n  try {\n    const { items, company_id, created_by } = req.body;";

    if (regex.test(content)) {
        content = content.replace(regex, replacement);

        // Fix the brace at the end of the file
        const exportsMarker = 'module.exports = router;';
        let exportsIdx = content.lastIndexOf(exportsMarker);
        if (exportsIdx !== -1) {
            let beforeExports = content.substring(0, exportsIdx);

            // Re-count braces after normalization
            let openBraces = (beforeExports.match(/{/g) || []).length;
            let closeBraces = (beforeExports.match(/}/g) || []).length;
            console.log('Brace count - Open: ' + openBraces + ', Close: ' + closeBraces);

            if (openBraces > closeBraces) {
                for (let i = 0; i < (openBraces - closeBraces); i++) {
                    beforeExports += '});\n';
                }
            } else if (openBraces < closeBraces) {
                while (openBraces < closeBraces && beforeExports.trim().endsWith('});')) {
                    beforeExports = beforeExports.trim().substring(0, beforeExports.trim().lastIndexOf('});'));
                    closeBraces--;
                }
            }
            content = beforeExports + '\n' + exportsMarker + '\n';
        }

        fs.writeFileSync(projectsPath, content);
        console.log('Surgically fixed projects.js with regex');
    } else {
        console.log('Regex match failed for projects.js');
    }
} catch (e) {
    console.error('Error in surgical-fixer:', e);
}
