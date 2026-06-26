const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');


// Get all master vendors
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { company_id } = req.user;
        const result = await pool.query(
            'SELECT * FROM master_vendors WHERE company_id = $1 ORDER BY name ASC',
            [company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching master vendors:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new master vendor(s)
router.post('/', authenticateToken, async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const { company_id } = req.user;

    if (items.length === 0) {
        return res.status(400).json({ error: 'No vendors provided' });
    }

    // Validate items
    for (const item of items) {
        if (!item.name) {
            return res.status(400).json({ error: 'Vendor name is required for all entries' });
        }
    }

    try {
        const results = [];
        for (const item of items) {
            const { 
                name, email, phone_number, address,
                vendor_type, gst_number, pan_number, 
                opening_balance, credit_period, currency,
                state, country, pincode,
                bank_name, account_number, ifsc_code,
                branch_name, account_holder_name, upi_id
            } = item;
            
            const result = await pool.query(
                `INSERT INTO master_vendors 
                (name, email, phone_number, address, vendor_type, gst_number, pan_number, 
                opening_balance, credit_period, currency, state, country, pincode, 
                bank_name, account_number, ifsc_code, branch_name, account_holder_name, upi_id, company_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) 
                RETURNING *`,
                [
                    name, email, phone_number, address,
                    vendor_type, gst_number, pan_number,
                    opening_balance ? parseFloat(opening_balance) : 0, credit_period, currency || 'INR',
                    state, country, pincode,
                    bank_name, account_number, ifsc_code,
                    branch_name, account_holder_name, upi_id,
                    company_id
                ]
            );
            results.push(result.rows[0]);
        }

        res.status(201).json(Array.isArray(req.body) ? results : results[0]);
    } catch (err) {
        console.error('Error adding master vendor(s):', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update a master vendor
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { 
        name, email, phone_number, address,
        vendor_type, gst_number, pan_number, 
        opening_balance, credit_period, currency,
        state, country, pincode,
        bank_name, account_number, ifsc_code,
        branch_name, account_holder_name, upi_id
    } = req.body;
    const { company_id } = req.user;

    if (!name) {
        return res.status(400).json({ error: 'Vendor name is required' });
    }

    try {
        const result = await pool.query(
            `UPDATE master_vendors 
            SET name = $1, email = $2, phone_number = $3, address = $4, 
                vendor_type = $5, gst_number = $6, pan_number = $7, 
                opening_balance = $8, credit_period = $9, currency = $10, 
                state = $11, country = $12, pincode = $13, 
                bank_name = $14, account_number = $15, ifsc_code = $16, 
                branch_name = $17, account_holder_name = $18, upi_id = $19,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $20 AND company_id = $21
            RETURNING *`,
            [
                name, email, phone_number, address,
                vendor_type, gst_number, pan_number,
                opening_balance ? parseFloat(opening_balance) : 0, credit_period, currency || 'INR',
                state, country, pincode,
                bank_name, account_number, ifsc_code,
                branch_name, account_holder_name, upi_id,
                id, company_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating master vendor:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a master vendor
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { company_id } = req.user;
    try {
        const result = await pool.query(
            'DELETE FROM master_vendors WHERE id = $1 AND company_id = $2 RETURNING *',
            [id, company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json({ message: 'Vendor deleted successfully' });
    } catch (err) {
        console.error('Error deleting master vendor:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
