const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, company_name, gst_number } = req.body;

    if (!name || !email || !password || !role || !company_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate role
    const validRoles = ['management', 'accountant', 'store_incharge', 'npd', 'project_manager', 'worker'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let companyId;
    let isApproved = false;

    if (role === 'management') {
      // Management creates a new company
      const companyResult = await pool.query(
        'INSERT INTO companies (name, email, gst_number) VALUES ($1, $2, $3) RETURNING id',
        [company_name, email, gst_number || null]
      );
      companyId = companyResult.rows[0].id;
      isApproved = true; // Management is auto-approved
    } else {
      // Employee joins existing company by name
      const companyResult = await pool.query(
        'SELECT id FROM companies WHERE LOWER(name) = LOWER($1)',
        [company_name]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Company not found. Please check the company name or contact your management.'
        });
      }

      companyId = companyResult.rows[0].id;
      isApproved = false; // Employees need approval
    }

    // Create user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, company_id, is_approved, approved_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, company_id, is_approved',
      [name, email, hashedPassword, role, companyId, isApproved, isApproved ? new Date() : null]
    );

    const user = result.rows[0];

    // If employee signup, notify all management users of the company
    if (role !== 'management') {
      const managementUsers = await pool.query(
        'SELECT id FROM users WHERE company_id = $1 AND role = $2',
        [companyId, 'management']
      );

      for (const mgmtUser of managementUsers.rows) {
        await pool.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [
            mgmtUser.id,
            'New Employee Signup',
            `${name} (${role}) has requested to join your company and needs approval.`,
            'employee_signup'
          ]
        );
      }
    }

    // Get company details
    const companyDetails = await pool.query('SELECT id, name, gst_number FROM companies WHERE id = $1', [companyId]);
    user.company = companyDetails.rows[0];

    // Only create token for approved users (management)
    if (isApproved) {
      const token = jwt.sign({ id: user.id, role: user.role, company_id: companyId }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ user, token });
    } else {
      // Employee signup - pending approval
      res.status(201).json({
        user,
        message: 'Account created successfully! Waiting for management approval.',
        pending_approval: true
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Allow all roles to login
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is approved
    if (!user.is_approved) {
      return res.status(403).json({
        error: 'Account pending approval',
        message: 'Your account is waiting for management approval. Please contact your administrator.'
      });
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

    // Record attendance login
    try {
      await pool.query(
        `INSERT INTO attendance (user_id, company_id, login_time, date) 
         VALUES ($1, $2, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'), (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)`,
        [user.id, user.company_id]
      );
    } catch (attendanceError) {
      console.error('Error recording attendance:', attendanceError);
      // Don't block login if attendance fails
    }

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

// Forgot Password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      [email]
    );

    // Always return success message (don't reveal if email exists)
    if (userResult.rows.length === 0) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = userResult.rows[0];

    // Generate unique reset token
    const { v4: uuidv4 } = require('uuid');
    const resetToken = uuidv4();

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Store token in database
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetToken, expiresAt]
    );

    // Send reset email
    const { sendPasswordResetEmail } = require('../config/email');
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.name);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue anyway - token is stored in DB
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify Reset Token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid or expired reset token'
      });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify token
    const tokenResult = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [resetToken.id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout - record logout time
router.post('/logout', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Update the latest attendance record that has no logout_time (regardless of date)
    const result = await pool.query(
      `UPDATE attendance 
       SET logout_time = CURRENT_TIMESTAMP 
       WHERE id = (
         SELECT id FROM attendance 
         WHERE user_id = $1 AND logout_time IS NULL
         ORDER BY login_time DESC
         LIMIT 1
       )`,
      [user_id]
    );

    console.log(`Logout recorded for user ${user_id}, rows updated: ${result.rowCount}`);
    res.json({ message: 'Logout recorded successfully', updated: result.rowCount });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

