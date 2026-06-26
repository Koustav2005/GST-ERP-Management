const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get pending approval employees for a company
router.get('/pending/:companyId', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.params;

        // Verify user is management of this company
        if (req.user.role !== 'management' || req.user.company_id != companyId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE company_id = $1 AND is_approved = FALSE ORDER BY created_at DESC',
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all approved employees for a company
router.get('/company/:companyId', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.params;

        // Verify user belongs to this company
        if (req.user.company_id != companyId) {
            return res.status(403).json({ error: 'Unauthorized - Not in this company' });
        }

        const result = await pool.query(
            'SELECT id, name, email, role, is_approved, approved_at, created_at FROM users WHERE company_id = $1 AND is_approved = TRUE ORDER BY created_at DESC',
            [companyId]
        );

        res.json({ users: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Approve an employee
router.put('/:id/approve', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify user is management
        if (req.user.role !== 'management') {
            return res.status(403).json({ error: 'Only management can approve employees' });
        }

        // Get the employee to verify they belong to the same company
        const employeeCheck = await pool.query(
            'SELECT company_id, name, email FROM users WHERE id = $1',
            [id]
        );

        if (employeeCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const employee = employeeCheck.rows[0];

        if (employee.company_id != req.user.company_id) {
            return res.status(403).json({ error: 'Cannot approve employees from other companies' });
        }

        // Approve the employee
        const result = await pool.query(
            'UPDATE users SET is_approved = TRUE, approved_by = $1, approved_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, is_approved',
            [req.user.id, id]
        );

        // Send notification to the approved employee
        await pool.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
            [
                id,
                'Account Approved',
                'Your account has been approved by management. You can now login to the system.',
                'account_approved'
            ]
        );

        res.json({
            message: 'Employee approved successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reject/Delete an employee
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify user is management
        if (req.user.role !== 'management') {
            return res.status(403).json({ error: 'Only management can delete employees' });
        }

        // Get the employee to verify they belong to the same company
        const employeeCheck = await pool.query(
            'SELECT company_id, role FROM users WHERE id = $1',
            [id]
        );

        if (employeeCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const employee = employeeCheck.rows[0];

        if (employee.company_id != req.user.company_id) {
            return res.status(403).json({ error: 'Cannot delete employees from other companies' });
        }

        // Prevent deleting management users
        if (employee.role === 'management') {
            return res.status(403).json({ error: 'Cannot delete management users' });
        }

        // Delete the employee
        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
