const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Get all companies (for dropdown)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, gst_number FROM companies ORDER BY name'
    );
    
    res.json({ companies: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get company by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({ company: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create company (when management signs up)
router.post('/', async (req, res) => {
  try {
    const { name, email, gst_number, address, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const companyExists = await pool.query(
      'SELECT * FROM companies WHERE email = $1',
      [email]
    );

    if (companyExists.rows.length > 0) {
      return res.status(400).json({ error: 'Company already exists' });
    }

    const result = await pool.query(
      'INSERT INTO companies (name, email, gst_number, address, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, gst_number, address, phone]
    );

    res.status(201).json({ company: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
