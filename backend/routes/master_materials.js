const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');


// Get all master materials, optionally filtered by business name
router.get('/', authenticateToken, async (req, res) => {
    const { business_name } = req.query;
    const { company_id } = req.user;
    try {
        let query = 'SELECT * FROM master_materials WHERE company_id = $1';
        let params = [company_id];

        if (business_name) {
            query += ' AND business_name = $2';
            params.push(business_name);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching master materials:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new master material(s)
router.post('/', authenticateToken, async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const { company_id } = req.user;

    if (items.length === 0) {
        return res.status(400).json({ error: 'No items provided' });
    }

    // Validate items
    for (const item of items) {
        if (!item.business_name || !item.material_name || !item.unit) {
            return res.status(400).json({ error: 'Please provide business_name, material_name, and unit for all items' });
        }
    }

    try {
        const results = [];
        for (const item of items) {
            const { business_name, material_name, hsn_code, gst_rate, material_rate, unit } = item;
            const result = await pool.query(
                `INSERT INTO master_materials 
                (business_name, material_name, hsn_code, gst_rate, material_rate, unit, company_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) 
                RETURNING *`,
                [business_name, material_name, hsn_code, gst_rate || 0, material_rate || 0, unit, company_id]
            );
            results.push(result.rows[0]);
        }

        res.status(201).json(Array.isArray(req.body) ? results : results[0]);
    } catch (err) {
        console.error('Error adding master material(s):', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update a master material
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { business_name, material_name, hsn_code, gst_rate, material_rate, unit } = req.body;
    const { company_id } = req.user;

    try {
        const result = await pool.query(
            `UPDATE master_materials 
            SET business_name = $1, material_name = $2, hsn_code = $3, gst_rate = $4, material_rate = $5, unit = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7 AND company_id = $8
            RETURNING *`,
            [business_name, material_name, hsn_code, gst_rate, material_rate, unit, id, company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating master material:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a master material
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { company_id } = req.user;
    try {
        const result = await pool.query(
            'DELETE FROM master_materials WHERE id = $1 AND company_id = $2 RETURNING *',
            [id, company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }

        res.json({ message: 'Material deleted successfully' });
    } catch (err) {
        console.error('Error deleting master material:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
