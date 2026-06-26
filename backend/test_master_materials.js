const axios = require('axios');

const API_URL = 'http://localhost:3000/api/master-materials';

async function testMasterMaterials() {
    console.log('🚀 Starting Master Materials API Test...');

    try {
        // 1. Create a material
        console.log('📝 Testing Create Material...');
        const createRes = await axios.post(API_URL, {
            business_name: 'SVCEE Fabrications',
            material_name: 'Test Steel Beam',
            hsn_code: '7301',
            gst_rate: 18,
            material_rate: 450,
            unit: 'mt'
        });
        const newId = createRes.data.id;
        console.log('✅ Created Material ID:', newId);

        // 2. Get all materials
        console.log('🔍 Testing Get Materials...');
        const getRes = await axios.get(API_URL);
        console.log('✅ Fetched', getRes.data.length, 'materials');

        // 3. Update the material
        console.log('✏️ Testing Update Material...');
        await axios.put(`${API_URL}/${newId}`, {
            business_name: 'SVCEE Fabrications',
            material_name: 'Updated Test Steel Beam',
            hsn_code: '7301',
            gst_rate: 18,
            material_rate: 500,
            unit: 'mt'
        });
        console.log('✅ Updated Material');

        // 4. Delete the material
        console.log('🗑️ Testing Delete Material...');
        await axios.delete(`${API_URL}/${newId}`);
        console.log('✅ Deleted Material');

        console.log('\n✨ All API tests passed successfully!');
    } catch (error) {
        console.error('❌ API Test Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

testMasterMaterials();
