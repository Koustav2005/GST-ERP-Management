const axios = require('axios');

async function test() {
    try {
        const baseUrl = 'http://localhost:3000/api';

        // 1. Login as management to get token
        console.log('Logging in as management...');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email: 'saurabh102@gmail.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Logged in successfully.');

        // 2. Send enquiry 1 to NPD user 2
        console.log('Sending enquiry 1 to NPD user 2...');
        const sendRes = await axios.post(`${baseUrl}/enquiries/1/send-to-npd`,
            { npd_user_id: 2 },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Send response:', sendRes.data);

        // 3. Check database
        console.log('Enquiring database state...');
        // (I'll just trust the 200 response for now or check via my other debug script)
    } catch (e) {
        if (e.response) {
            console.error('Error Response:', e.response.status, e.response.data);
        } else {
            console.error('Error:', e.message);
        }
    }
}

test();
