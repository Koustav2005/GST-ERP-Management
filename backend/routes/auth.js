const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, company_id, company_name, gst_number } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // For non-management roles, company_id is required
    if (role !== 'management' && !company_id) {
      return res.status(400).json({ error: 'Please select a company' });
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let finalCompanyId = company_id;

    // If role is management, create a new company
    if (role === 'management') {
      if (!company_name) {
        return res.status(400).json({ error: 'Company name is required for management role' });
      }

      const companyResult = await pool.query(
        'INSERT INTO companies (name, email, gst_number) VALUES ($1, $2, $3) RETURNING id',
        [company_name, email, gst_number || null]
      );
      finalCompanyId = companyResult.rows[0].id;
    }

    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, company_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, company_id',
      [name, email, hashedPassword, role, finalCompanyId]
    );

    const user = result.rows[0];

    // Get company details
    const companyResult = await pool.query('SELECT id, name, gst_number FROM companies WHERE id = $1', [finalCompanyId]);
    user.company = companyResult.rows[0];

    const token = jwt.sign({ id: user.id, role: user.role, company_id: finalCompanyId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND role = $2', [email, role]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or role' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get company details
    let company = null;
    if (user.company_id) {
      const companyResult = await pool.query('SELECT id, name, gst_number FROM companies WHERE id = $1', [user.company_id]);
      if (companyResult.rows.length > 0) {
        company = companyResult.rows[0];
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role, company_id: user.company_id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        company: company,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
