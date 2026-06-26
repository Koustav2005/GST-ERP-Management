const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get notifications for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId]);

        // Count unread
        const unreadCountResult = await pool.query(`
      SELECT COUNT(*) FROM notifications 
      WHERE user_id = $1 AND is_read = FALSE
    `, [userId]);

        res.json({
            notifications: result.rows,
            unread_count: parseInt(unreadCountResult.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Mark a notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await pool.query(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark ALL notifications as read for a user
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(`
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE user_id = $1
      `, [userId]);

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all read:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
