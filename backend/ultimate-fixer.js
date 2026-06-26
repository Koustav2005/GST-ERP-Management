const fs = require('fs');
const path = require('path');

const projectsPath = path.join('c:', 'Users', 'Saurabh Kumar', 'OneDrive', 'Desktop', 'GST-SVCEE', 'gst-management-app', 'backend', 'routes', 'projects.js');
const poPath = path.join('c:', 'Users', 'Saurabh Kumar', 'OneDrive', 'Desktop', 'GST-SVCEE', 'gst-management-app', 'backend', 'routes', 'purchase_orders.js');

// 1. Fix purchase_orders.js
try {
    let poContent = fs.readFileSync(poPath, 'utf8');
    const correctPORoute = "// Update PO status\n" +
        "router.put('/:id/status', async (req, res) => {\n" +
        "    try {\n" +
        "        const { id } = req.params;\n" +
        "        const { status } = req.body;\n" +
        "\n" +
        "        if (!status || !['pending', 'confirmed', 'order_placed', 'shipped', 'dispatched', 'delivered', 'cancelled'].includes(status)) {\n" +
        "            return res.status(400).json({ error: 'Valid status is required' });\n" +
        "        }\n" +
        "\n" +
        "        const result = await pool.query(\n" +
        "            'UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',\n" +
        "            [status, id]\n" +
        "        );\n" +
        "\n" +
        "        if (result.rows.length === 0) {\n" +
        "            return res.status(404).json({ error: 'Purchase order not found' });\n" +
        "        }\n" +
        "\n" +
        "        res.json(result.rows[0]);\n" +
        "    } catch (err) {\n" +
        "        console.error('Error updating purchase order status:', err);\n" +
        "        res.status(500).json({ error: 'Server error', details: err.message });\n" +
        "    }\n" +
        "});";

    const poLines = poContent.split('\n');
    let startIdx = poLines.findIndex(line => line.includes('// Update PO status'));
    if (startIdx === -1) startIdx = poLines.findIndex(line => line.includes("router.put('/:id/status'"));

    if (startIdx !== -1) {
        let endIdx = poLines.findIndex((line, i) => i > startIdx && line.includes('module.exports'));
        if (endIdx === -1) endIdx = poLines.length;
        poLines.splice(startIdx, endIdx - startIdx, correctPORoute + '\n');
        fs.writeFileSync(poPath, poLines.join('\n'));
        console.log('Fixed purchase_orders.js');
    }
} catch (e) {
    console.error('Error fixing purchase_orders.js:', e);
}

// 2. Fix projects.js
try {
    let projectsContent = fs.readFileSync(projectsPath, 'utf8');
    const vendorOrdersMarker = "router.get('/major-orders/vendor/:vendorId'";
    const minorOrdersMarker = "router.post('/minor-orders'";

    let contentParts = projectsContent.split(vendorOrdersMarker);
    if (contentParts.length > 1) {
        let afterVendor = contentParts[1];
        const fixedVendorRoutePart = " async (req, res) => {\n" +
            "  try {\n" +
            "    const { vendorId } = req.params;\n" +
            "\n" +
            "    const result = await pool.query(\n" +
            "      'SELECT mo.*, c.name as company_name FROM major_orders mo LEFT JOIN companies c ON mo.company_id = c.id WHERE mo.vendor_id = $1 ORDER BY mo.created_at DESC',\n" +
            "      [vendorId]);\n" +
            "\n" +
            "    res.json({ orders: result.rows });\n" +
            "  } catch (error) {\n" +
            "    console.error('Error fetching vendor orders:', error);\n" +
            "    res.status(500).json({ error: 'Server error' });\n" +
            "  }\n" +
            "});\n" +
            "\n" +
            "// Update order status\n" +
            "router.put('/major-orders/:orderId/status', async (req, res) => {\n" +
            "  try {\n" +
            "    const { orderId } = req.params;\n" +
            "    const { status } = req.body;\n" +
            "\n" +
            "    if (!status || !['pending', 'confirmed', 'order_placed', 'shipped', 'dispatched', 'delivered', 'cancelled'].includes(status)) {\n" +
            "      return res.status(400).json({ error: 'Valid status is required' });\n" +
            "    }\n" +
            "\n" +
            "    const result = await pool.query(\n" +
            "      'UPDATE major_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',\n" +
            "      [status, orderId]);\n" +
            "\n" +
            "    if (result.rows.length === 0) {\n" +
            "      return res.status(404).json({ error: 'Order not found' });\n" +
            "    }\n" +
            "\n" +
            "    res.json({ order: result.rows[0] });\n" +
            "  } catch (error) {\n" +
            "    console.error('Error updating order status:', error);\n" +
            "    res.status(500).json({ error: 'Server error', details: error.message });\n" +
            "  }\n" +
            "});\n";

        let minorOrdersIdx = afterVendor.indexOf(minorOrdersMarker);
        if (minorOrdersIdx !== -1) {
            let restOfFile = afterVendor.substring(minorOrdersIdx);
            let newProjectsContent = contentParts[0] + vendorOrdersMarker + fixedVendorRoutePart + restOfFile;
            const exportsMarker = 'module.exports = router;';
            let exportsIdx = newProjectsContent.lastIndexOf(exportsMarker);
            if (exportsIdx !== -1) {
                let beforeExports = newProjectsContent.substring(0, exportsIdx);
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
                newProjectsContent = beforeExports + '\n' + exportsMarker + '\n';
            }
            fs.writeFileSync(projectsPath, newProjectsContent);
            console.log('Fixed projects.js');
        }
    } else {
        console.log('Could not find vendor orders marker in projects.js');
    }
} catch (e) {
    console.error('Error fixing projects.js:', e);
}
