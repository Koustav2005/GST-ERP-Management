const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Create a new purchase order
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            master_vendor_id,
            vendor_name,
            vendor_email,
            total_amount,
            created_by,
            items
        } = req.body;

        const company_id = req.user.company_id;

        if (!company_id || !master_vendor_id || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields or items' });
        }

        await client.query('BEGIN');

        // 1. Get next sequential number for this company
        const seqResult = await client.query(
            'SELECT COALESCE(MAX(po_number_sequential), 0) + 1 as next_seq FROM purchase_orders WHERE company_id = $1',
            [company_id]
        );
        const nextSeq = seqResult.rows[0].next_seq;

        // 2. Insert Purchase Order
        const poResult = await client.query(
            `INSERT INTO purchase_orders 
            (company_id, master_vendor_id, vendor_name, vendor_email, total_amount, created_by, status, po_number_sequential) 
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) 
            RETURNING *`,
            [company_id, master_vendor_id, vendor_name, vendor_email, total_amount, created_by, nextSeq]
        );

        const po = poResult.rows[0];

        // 2. Insert PO Items
        for (const item of items) {
            await client.query(
                `INSERT INTO purchase_order_items 
                (po_id, material_name, hsn, quantity, unit, unit_price, total_price, gst_rate) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [po.id, item.material_name, item.hsn, item.quantity, item.unit, item.unit_price, item.total_price, item.gst_rate || 0]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(po);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating purchase order:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Get all purchase orders for a company
router.get('/company/:companyId', authenticateToken, async (req, res) => {
    try {
        // Enforce company isolation using token
        const companyId = req.user.company_id;
        const result = await pool.query(
            `SELECT po.*, u.name as creator_name, c.name as company_name 
            FROM purchase_orders po 
            LEFT JOIN users u ON po.created_by = u.id 
            LEFT JOIN companies c ON po.company_id = c.id
            WHERE po.company_id = $1 
            ORDER BY po.created_at DESC`,
            [companyId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching purchase orders:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get a specific purchase order with items
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company_id;

        const poResult = await pool.query('SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2', [id, companyId]);

        if (poResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found or unauthorized' });
        }

        const itemsResult = await pool.query('SELECT * FROM purchase_order_items WHERE po_id = $1', [id]);

        res.json({
            ...poResult.rows[0],
            items: itemsResult.rows
        });
    } catch (err) {
        console.error('Error fetching purchase order details:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update PO status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const companyId = req.user.company_id;

        if (!status || !['pending', 'confirmed', 'order_placed', 'shipped', 'dispatched', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Valid status is required' });
        }

        const result = await pool.query(
            'UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 RETURNING *',
            [status, id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found or unauthorized' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating purchase order status:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
