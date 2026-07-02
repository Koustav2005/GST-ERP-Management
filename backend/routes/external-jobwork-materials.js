const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// NPD notifies accountant about incoming external job work materials
router.post('/notify-material-arrival', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      job_work_id, 
      npd_user_id, 
      accountant_id,
      material_description, 
      material_details,
      expected_arrival_date,
      company_id 
    } = req.body;

    // Validate input
    if (!job_work_id || !npd_user_id || !material_description || !company_id || !accountant_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create ONE notification record with specific accountant
    const notificationResult = await client.query(
      `INSERT INTO external_jobwork_material_notifications 
       (job_work_id, npd_user_id, accountant_id, company_id, material_description, expected_arrival_date, material_details, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [job_work_id, npd_user_id, accountant_id, company_id, material_description, expected_arrival_date, JSON.stringify(material_details || {})]
    );

    const notification = notificationResult.rows[0];

    // Send notification to the specific accountant
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, project_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        accountant_id,
        'Material Arrival Notification',
        `External job work material arriving: ${material_description}. Expected arrival: ${expected_arrival_date || 'Not specified'}. Please create challan.`,
        'external_jobwork_material',
        job_work_id
      ]
    );

    res.json({
      message: 'Material arrival notification sent to accountant',
      notification
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Accountant creates challan for external job work materials
router.post('/create-challan', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      notification_id,
      job_work_id,
      company_id,
      accountant_id,
      store_incharge_id,
      material_description,
      quantity,
      unit,
      expected_arrival_date,
      notes,
      materials_list
    } = req.body;

    if (!notification_id || !job_work_id || !company_id || !accountant_id || !store_incharge_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique challan number
    const challanNumberResult = await client.query(
      `SELECT COUNT(*) as count FROM external_jobwork_challans WHERE company_id = $1`,
      [company_id]
    );
    const challanCount = challanNumberResult.rows[0].count;
    const challan_number = `EJW-CHALLAN-${company_id}-${Date.now()}`;

    // Create challan
    const challanResult = await client.query(
      `INSERT INTO external_jobwork_challans 
       (notification_id, job_work_id, company_id, accountant_id, store_incharge_id, challan_number, material_description, quantity, unit, expected_arrival_date, notes, challan_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
       RETURNING *`,
      [notification_id, job_work_id, company_id, accountant_id, store_incharge_id, challan_number, material_description, quantity, unit, expected_arrival_date, notes]
    );

    const challan = challanResult.rows[0];

    // Add materials to external job work inventory (as pending)
    if (materials_list && materials_list.length > 0) {
      for (const material of materials_list) {
        await client.query(
          `INSERT INTO external_jobwork_inventory 
           (challan_id, job_work_id, company_id, material_name, quantity, unit, hsn_code, gst_rate, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
          [challan.id, job_work_id, company_id, material.material_name, material.quantity, material.unit, material.hsn_code || null, material.gst_rate || null]
        );
      }
    }

    // Send notification to store incharge
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, project_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        store_incharge_id,
        'External Job Work Material Challan Created',
        `Challan ${challan_number} created for external job work. Material: ${material_description}. Status: Pending arrival`,
        'external_jobwork_challan',
        job_work_id
      ]
    );

    // Update notification status
    await client.query(
      `UPDATE external_jobwork_material_notifications SET status = 'challan_created' WHERE id = $1`,
      [notification_id]
    );

    res.json({
      message: 'Challan created successfully',
      challan,
      notification: 'Store incharge has been notified'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Store incharge marks material as received
router.post('/receive-challan/:challanId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { challanId } = req.params;
    const { store_incharge_id, received_materials, notes } = req.body;

    if (!challanId || !store_incharge_id || !received_materials) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update challan status
    const challanResult = await client.query(
      `UPDATE external_jobwork_challans 
       SET challan_status = 'received', received_at = NOW(), received_by = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [store_incharge_id, challanId]
    );

    if (challanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    const challan = challanResult.rows[0];

    // Update inventory items with received quantities
    for (const material of received_materials) {
      await client.query(
        `UPDATE external_jobwork_inventory 
         SET received_quantity = $1, received_date = NOW(), received_by = $2, status = 'received'
         WHERE challan_id = $3 AND material_name = $4`,
        [material.received_quantity, store_incharge_id, challanId, material.material_name]
      );
    }

    // Send notification to accountant
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, project_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        challan.accountant_id,
        'External Job Work Material Received',
        `Challan ${challan.challan_number} has been received by store incharge. Materials logged to external job work inventory.`,
        'external_jobwork_received',
        challan.job_work_id
      ]
    );

    res.json({
      message: 'Materials received and logged to external job work inventory',
      challan
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get all material notifications for accountant
router.get('/notifications/accountant/:accountantId/:companyId', authenticateToken, async (req, res) => {
  try {
    const { accountantId, companyId } = req.params;

    const result = await pool.query(
      `SELECT 
        n.id,
        n.job_work_id,
        n.npd_user_id,
        n.accountant_id,
        n.company_id,
        n.material_description,
        n.expected_arrival_date,
        n.material_details,
        n.status,
        n.created_at,
        p.name as project_name,
        p.po_number,
        u.name as npd_name
       FROM external_jobwork_material_notifications n
       LEFT JOIN projects p ON n.job_work_id = p.id
       LEFT JOIN users u ON n.npd_user_id = u.id
       WHERE n.accountant_id = $1 AND n.company_id = $2
       ORDER BY n.created_at DESC`,
      [accountantId, companyId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all challans for store incharge
router.get('/challans/store-incharge/:storeInchargeId/:companyId', authenticateToken, async (req, res) => {
  try {
    const { storeInchargeId, companyId } = req.params;

    const result = await pool.query(
      `SELECT 
        c.*,
        p.name as project_name,
        p.po_number,
        a.name as accountant_name,
        (SELECT COUNT(*) FROM external_jobwork_inventory WHERE challan_id = c.id) as material_count
       FROM external_jobwork_challans c
       LEFT JOIN projects p ON c.job_work_id = p.id
       LEFT JOIN users a ON c.accountant_id = a.id
       WHERE c.store_incharge_id = $1 AND c.company_id = $2
       ORDER BY c.created_at DESC`,
      [storeInchargeId, companyId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get external job work inventory for a specific job work
router.get('/inventory/:jobWorkId/:companyId', authenticateToken, async (req, res) => {
  try {
    const { jobWorkId, companyId } = req.params;

    const result = await pool.query(
      `SELECT 
        i.*,
        c.challan_number,
        c.challan_status,
        u.name as received_by_name
       FROM external_jobwork_inventory i
       LEFT JOIN external_jobwork_challans c ON i.challan_id = c.id
       LEFT JOIN users u ON i.received_by = u.id
       WHERE i.job_work_id = $1 AND i.company_id = $2
       ORDER BY i.created_at DESC`,
      [jobWorkId, companyId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get challan details with all materials
router.get('/challan-details/:challanId', authenticateToken, async (req, res) => {
  try {
    const { challanId } = req.params;

    const challanResult = await pool.query(
      `SELECT c.*, a.name as accountant_name, s.name as store_incharge_name
       FROM external_jobwork_challans c
       LEFT JOIN users a ON c.accountant_id = a.id
       LEFT JOIN users s ON c.store_incharge_id = s.id
       WHERE c.id = $1`,
      [challanId]
    );

    if (challanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    const materialsResult = await pool.query(
      `SELECT * FROM external_jobwork_inventory WHERE challan_id = $1 ORDER BY created_at`,
      [challanId]
    );

    res.json({
      challan: challanResult.rows[0],
      materials: materialsResult.rows
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
