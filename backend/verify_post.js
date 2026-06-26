const axios = require('axios');

async function verifyPostRoute() {
    try {
        console.log('Testing POST /material-usage...');

        // Mock data based on what the frontend sends
        const payload = {
            project_id: 2,
            project_name: "Bike",
            sent_by: 15, // SPM
            sent_by_name: "Spm",
            accountant_id: 16, // Accountant
            materials: [
                {
                    material_name: "125 CC ENG",
                    quantity_used: 1,
                    unit: "pcs"
                }
            ],
            notes: "Test report from verification script"
        };

        const response = await axios.post('http://localhost:3000/api/projects/material-usage', payload);

        console.log('✅ Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));

        // Check if price was calculated
        const materials = JSON.parse(response.data.report.materials);
        const item = materials[0];
        if (item.unit_price > 0) {
            console.log(`✅ Price calculated correctly: ${item.unit_price}`);
        } else {
            console.log(`❌ Price is still 0`);
        }

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

verifyPostRoute();
