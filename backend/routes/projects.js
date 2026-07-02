const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendJobWorkChallanEmail } = require('../config/email');

const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Sketch upload logic will be re-added below in a cleaner way

// Sketch upload logic will be re-added below in a cleaner way

// Get all projects for a company
router.get('/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const result = await pool.query(`
      SELECT p.*, 
             u.name as assigned_to_name,
             u.role as assigned_to_role,
             c.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.assigned_to = u.id
      LEFT JOIN users c ON p.created_by = c.id
      WHERE p.company_id = $1
      ORDER BY p.created_at DESC
    `, [companyId]);

    res.json({ projects: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get NPD users for a company
router.get('/npd-users/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE company_id = $1 AND role = $2 ORDER BY name',
      [companyId, 'npd']
    );

    res.json({ npdUsers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Project Managers for a company
router.get('/project-managers/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE company_id = $1 AND role = $2 ORDER BY name',
      [companyId, 'project_manager']
    );

    res.json({ projectManagers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get projects assigned to a specific user (for PM dashboard)
router.get('/my-projects/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const result = await pool.query(`
      SELECT p.*, 
             u.name as assigned_to_name,
             u.role as assigned_to_role,
             c.name as created_by_name,
             (SELECT r.revision_number 
              FROM revisions r 
              WHERE r.project_id = p.id 
              ORDER BY r.revision_number DESC 
              LIMIT 1) as latest_revision_number,
             (SELECT r.created_at 
              FROM revisions r 
              WHERE r.project_id = p.id 
              ORDER BY r.revision_number DESC 
              LIMIT 1) as latest_revision_date,
             (SELECT r.sketch_url 
              FROM revisions r 
              WHERE r.project_id = p.id 
              ORDER BY r.revision_number DESC 
              LIMIT 1) as latest_revision_sketch
      FROM projects p
      LEFT JOIN users u ON p.assigned_to = u.id
      LEFT JOIN users c ON p.created_by = c.id
      WHERE p.assigned_to = $1 AND p.company_id = $2
      ORDER BY p.created_at DESC
    `, [userId, companyId]);

    // Get latest revision BOM for each project
    const projectsWithBOM = await Promise.all(result.rows.map(async (project) => {
      if (project.latest_revision_number) {
        const revisionResult = await pool.query(`
          SELECT r.id FROM revisions r 
          WHERE r.project_id = $1 AND r.revision_number = $2
          LIMIT 1
        `, [project.id, project.latest_revision_number]);

        if (revisionResult.rows.length > 0) {
          const bomResult = await pool.query(`
            SELECT * FROM revision_bom_items
            WHERE revision_id = $1
            ORDER BY serial_number ASC
          `, [revisionResult.rows[0].id]);
          project.latest_revision_bom = bomResult.rows;
        }
      } else {
        // Fetch original BOM if no revision exists
        const bomResult = await pool.query(`
          SELECT * FROM bill_of_materials
          WHERE project_id = $1
          ORDER BY id ASC
        `, [project.id]);
        project.original_bom = bomResult.rows;
      }
      return project;
    }));

    res.json({ projects: projectsWithBOM });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get projects for NPD user (includes projects they are responsible for)
router.get('/npd-projects/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Check if npd_user_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'npd_user_id'
    `);

    const hasNPDColumn = columnCheck.rows.length > 0;

    let query;
    if (hasNPDColumn) {
      await pool.query(`
        UPDATE projects 
        SET npd_user_id = $1 
        WHERE assigned_to = $1 AND company_id = $2 AND (npd_user_id IS NULL OR npd_user_id != $1)
      `, [userId, companyId]);

      query = `
        SELECT p.*, 
               u.name as assigned_to_name,
               u.role as assigned_to_role,
               c.name as created_by_name
        FROM projects p
        LEFT JOIN users u ON p.assigned_to = u.id
        LEFT JOIN users c ON p.created_by = c.id
        WHERE p.company_id = $2 AND (p.npd_user_id = $1 OR p.assigned_to = $1)
        ORDER BY p.created_at DESC
      `;
    } else {
      query = `
        SELECT p.*, 
               u.name as assigned_to_name,
               u.role as assigned_to_role,
               c.name as created_by_name
        FROM projects p
        LEFT JOIN users u ON p.assigned_to = u.id
        LEFT JOIN users c ON p.created_by = c.id
        WHERE p.company_id = $2 AND p.assigned_to = $1
        ORDER BY p.created_at DESC
      `;
    }

    const result = await pool.query(query, [userId, companyId]);
    res.json({ projects: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single project details with BOM and Revisions
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    // 1. Get Project Details - Filtered by Company
    const projectResult = await pool.query(`
      SELECT p.*, 
             u.name as assigned_to_name,
             u.role as assigned_to_role,
             c.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.assigned_to = u.id
      LEFT JOIN users c ON p.created_by = c.id
      WHERE p.id = $1 AND p.company_id = $2
    `, [id, companyId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // 2. Get Original BOM
    const bomResult = await pool.query(`
      SELECT * FROM bill_of_materials
      WHERE project_id = $1
      ORDER BY id ASC
    `, [id]);

    // 3. Get Latest Revision
    const revisionResult = await pool.query(`
      SELECT * FROM revisions 
      WHERE project_id = $1 
      ORDER BY revision_number DESC 
      LIMIT 1
    `, [id]);

    let latestRevision = null;
    let latestRevisionBOM = [];

    if (revisionResult.rows.length > 0) {
      latestRevision = revisionResult.rows[0];

      // 4. Get Latest Revision BOM
      const revisionBOMResult = await pool.query(`
        SELECT * FROM revision_bom_items
        WHERE revision_id = $1
        ORDER BY serial_number ASC
      `, [latestRevision.id]);

      latestRevisionBOM = revisionBOMResult.rows;
    }

    res.json({
      project,
      materials: bomResult.rows,
      latestRevision,
      latestRevisionBOM
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const { name, description, company_id, assigned_to, priority, start_date, end_date, created_by, npd_user_id, project_type } = req.body;
    const requestedProjectType = project_type || 'regular';
    const projectType = ['regular', 'external_job_work'].includes(requestedProjectType) ? requestedProjectType : 'regular';

    if (!name || !company_id || !created_by) {
      return res.status(400).json({ error: 'Name, company_id, and created_by are required' });
    }

    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'regular'
    `);

    // Check if npd_user_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'npd_user_id'
    `);

    const hasNPDColumn = columnCheck.rows.length > 0;

    let query, values;
    if (hasNPDColumn) {
      query = `INSERT INTO projects (name, description, company_id, assigned_to, priority, start_date, end_date, created_by, status, npd_user_id, project_type) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
               RETURNING *`;
      values = [name, description, company_id, assigned_to || null, priority || 'medium', start_date || null, end_date || null, created_by, 'pending', npd_user_id || null, projectType];
    } else {
      query = `INSERT INTO projects (name, description, company_id, assigned_to, priority, start_date, end_date, created_by, status, project_type) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
               RETURNING *`;
      values = [name, description, company_id, assigned_to || null, priority || 'medium', start_date || null, end_date || null, created_by, 'pending', projectType];
    }

    const result = await pool.query(query, values);
    const newProject = result.rows[0];

    // Notify Assigned User (if any)
    if (newProject.assigned_to) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, project_id)
        VALUES ($1, 'project_assignment', 'New Project Assigned', $2, $3)
      `, [newProject.assigned_to, `You have been assigned to project: ${newProject.name}`, newProject.id]);
    }

    // Notify NPD User (if assigned via npd_user_id)
    if (newProject.npd_user_id && newProject.npd_user_id !== newProject.assigned_to) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, project_id)
        VALUES ($1, 'project_assignment', 'New Project Assigned', $2, $3)
      `, [newProject.npd_user_id, `You have been assigned as NPD for project: ${newProject.name}`, newProject.id]);
    }

    res.status(201).json({ project: newProject });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project (assign/reassign)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, status, priority, description, npd_user_id } = req.body;

    // Check if npd_user_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'npd_user_id'
    `);
    const hasNPDColumn = columnCheck.rows.length > 0;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
    }
    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (priority) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }
    if (description) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    // Only add npd_user_id update if column exists
    // When NPD assigns to PM, npd_user_id should be set to track NPD responsibility
    if (npd_user_id !== undefined && hasNPDColumn) {
      updates.push(`npd_user_id = $${paramCount}`);
      values.push(npd_user_id);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updatedProject = result.rows[0];

    // Notify Assigned User if changed
    if (assigned_to && updatedProject.assigned_to == assigned_to) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, project_id)
        VALUES ($1, 'project_assignment', 'Project Assignment Update', $2, $3)
      `, [updatedProject.assigned_to, `You have been assigned to project: ${updatedProject.name}`, updatedProject.id]);
    }

    // Notify Management if status changed
    if (status) {
      // Find management users for this company
      const managementUsers = await pool.query(`
        SELECT id FROM users 
        WHERE company_id = $1 AND role = 'management'
      `, [updatedProject.company_id]);

      for (const user of managementUsers.rows) {
        await pool.query(`
          INSERT INTO notifications (user_id, type, title, message, project_id)
          VALUES ($1, 'status_update', 'Project Status Updated', $2, $3)
        `, [user.id, `Project "${updatedProject.name}" status updated to: ${status.replace('_', ' ').toUpperCase()}`, updatedProject.id]);
      }

      // Notify NPD User
      // Priority: 1. npd_user_id (explicitly assigned NPD)
      //           2. created_by (if they are an NPD user)
      let npdUserIdToNotify = updatedProject.npd_user_id;

      if (!npdUserIdToNotify && updatedProject.created_by) {
        const creatorRes = await pool.query('SELECT role FROM users WHERE id = $1', [updatedProject.created_by]);
        if (creatorRes.rows.length > 0 && creatorRes.rows[0].role === 'npd') {
          npdUserIdToNotify = updatedProject.created_by;
        }
      }

      if (npdUserIdToNotify) {
        await pool.query(`
          INSERT INTO notifications (user_id, type, title, message, project_id)
          VALUES ($1, 'status_update', 'Project Status Updated', $2, $3)
        `, [npdUserIdToNotify, `Project "${updatedProject.name}" status updated to: ${status.replace('_', ' ').toUpperCase()}`, updatedProject.id]);
      }
    }

    res.json({ project: updatedProject });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Bill of Materials for a project with stock availability
router.get('/:id/bom', async (req, res) => {
  try {
    const { id } = req.params;

    // Get project's company_id
    const projectResult = await pool.query('SELECT company_id FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const companyId = projectResult.rows[0].company_id;

    const result = await pool.query(
      'SELECT * FROM bill_of_materials WHERE project_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const materials = result.rows;

    // Check stock availability for each material
    const materialsWithStock = await Promise.all(materials.map(async (material) => {
      let totalStock = 0;
      let inStock = false;

      if (companyId && material.material_name) {
        try {
          // Get all barcodes for this material (case-insensitive match)
          const barcodesResult = await pool.query(`
            SELECT barcode_data
            FROM barcodes
            WHERE company_id = $1 AND LOWER(TRIM(item_name)) = LOWER(TRIM($2))
          `, [companyId, material.material_name]);

          // Calculate total stock from all barcodes
          for (const barcode of barcodesResult.rows) {
            try {
              let barcodeQty = 0;
              const barcodeDataStr = barcode.barcode_data;

              // Try to extract quantity from JSON in barcode_data
              const jsonMatch = barcodeDataStr.match(/JSON Data: ({.*?})/);
              if (jsonMatch) {
                const barcodeJson = JSON.parse(jsonMatch[1]);
                barcodeQty = parseFloat(barcodeJson.quantity) || 0;
              } else {
                // Fallback: try parsing entire barcode_data as JSON
                try {
                  const barcodeJson = JSON.parse(barcodeDataStr);
                  barcodeQty = parseFloat(barcodeJson.quantity) || 0;
                } catch (e) {
                  // If parsing fails, try to extract from text format
                  const qtyMatch = barcodeDataStr.match(/Quantity:\s*(\d+\.?\d*)/);
                  if (qtyMatch) {
                    barcodeQty = parseFloat(qtyMatch[1]) || 0;
                  }
                }
              }

              totalStock += barcodeQty;
            } catch (e) {
              // Ignore parsing errors
            }
          }

          inStock = totalStock > 0;
        } catch (error) {
          console.error(`Error checking stock for ${material.material_name}:`, error);
        }
      }

      return {
        ...material,
        available_quantity: totalStock,
        in_stock: inStock
      };
    }));

    res.json({ materials: materialsWithStock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add material to BOM
router.post('/:id/bom', async (req, res) => {
  try {
    const { id } = req.params;
    const { material_name, quantity, unit, estimated_cost, supplier, notes, hsn } = req.body;

    if (!material_name || !quantity || !unit) {
      return res.status(400).json({ error: 'Material name, quantity, and unit are required' });
    }

    const result = await pool.query(
      `INSERT INTO bill_of_materials (project_id, material_name, quantity, unit, estimated_cost, supplier, notes, hsn) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, material_name, quantity, unit, estimated_cost || null, supplier || null, notes || null, hsn || null]
    );

    res.status(201).json({ material: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete material from BOM
router.delete('/:projectId/bom/:materialId', async (req, res) => {
  try {
    const { materialId } = req.params;

    const result = await pool.query('DELETE FROM bill_of_materials WHERE id = $1 RETURNING *', [materialId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project sketch URL
router.put('/:id/sketch', async (req, res) => {
  try {
    const { id } = req.params;
    const { sketch_url } = req.body;

    const result = await pool.query(
      'UPDATE projects SET sketch_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [sketch_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get project status history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT psh.*, u.name as changed_by_name
      FROM project_status_history psh
      LEFT JOIN users u ON psh.changed_by = u.id
      WHERE psh.project_id = $1
      ORDER BY psh.changed_at DESC
    `, [id]);

    res.json({ history: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add status history entry
router.post('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_status, changed_by, old_status, notes } = req.body;

    if (!new_status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Insert history
    const result = await pool.query(`
      INSERT INTO project_status_history (project_id, old_status, new_status, changed_by, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, old_status || null, new_status, changed_by || null, notes || null]);

    // Automatically update project status in projects table
    if (new_status === 'Completed') {
      await pool.query(`UPDATE projects SET status = 'completed' WHERE id = $1`, [id]);
    } else {
      await pool.query(`UPDATE projects SET status = 'in_progress' WHERE id = $1 AND status = 'pending'`, [id]);
    }

    // Fetch the updated entry with user name
    const fetchResult = await pool.query(`
      SELECT psh.*, u.name as changed_by_name
      FROM project_status_history psh
      LEFT JOIN users u ON psh.changed_by = u.id
      WHERE psh.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({ historyEntry: fetchResult.rows[0] });
  } catch (error) {
    console.error('Error adding status history:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ==================== REVISIONS ROUTES ====================

// Get all revisions for a project
router.get('/:id/revisions', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT r.*, 
             u.name as created_by_name
      FROM revisions r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.project_id = $1
      ORDER BY r.revision_number DESC
    `, [id]);

    res.json({ revisions: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific revision with BOM items
router.get('/:id/revisions/:revisionId', async (req, res) => {
  try {
    const { id, revisionId } = req.params;

    // Get revision details
    const revisionResult = await pool.query(`
      SELECT r.*, 
             u.name as created_by_name
      FROM revisions r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = $1 AND r.project_id = $2
    `, [revisionId, id]);

    if (revisionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    // Get project's company_id
    const projectResult = await pool.query('SELECT company_id FROM projects WHERE id = $1', [id]);
    let companyId = null;
    if (projectResult.rows.length > 0) {
      companyId = projectResult.rows[0].company_id;
    }

    // Get BOM items for this revision
    const bomResult = await pool.query(`
      SELECT * FROM revision_bom_items
      WHERE revision_id = $1
      ORDER BY serial_number ASC
    `, [revisionId]);

    const bomItems = bomResult.rows;

    // Check stock availability for each material
    const bomItemsWithStock = await Promise.all(bomItems.map(async (item) => {
      let totalStock = 0;
      let inStock = false;

      if (companyId && item.material_name) {
        try {
          // Get all barcodes for this material (case-insensitive match)
          const barcodesResult = await pool.query(`
            SELECT barcode_data
            FROM barcodes
            WHERE company_id = $1 AND LOWER(TRIM(item_name)) = LOWER(TRIM($2))
          `, [companyId, item.material_name]);

          // Calculate total stock from all barcodes
          for (const barcode of barcodesResult.rows) {
            try {
              let barcodeQty = 0;
              const barcodeDataStr = barcode.barcode_data;

              // Try to extract quantity from JSON in barcode_data
              const jsonMatch = barcodeDataStr.match(/JSON Data: ({.*?})/);
              if (jsonMatch) {
                const barcodeJson = JSON.parse(jsonMatch[1]);
                barcodeQty = parseFloat(barcodeJson.quantity) || 0;
              } else {
                // Fallback: try parsing entire barcode_data as JSON
                try {
                  const barcodeJson = JSON.parse(barcodeDataStr);
                  barcodeQty = parseFloat(barcodeJson.quantity) || 0;
                } catch (e) {
                  // If parsing fails, try to extract from text format
                  const qtyMatch = barcodeDataStr.match(/Quantity:\s*(\d+\.?\d*)/);
                  if (qtyMatch) {
                    barcodeQty = parseFloat(qtyMatch[1]) || 0;
                  }
                }
              }

              totalStock += barcodeQty;
            } catch (e) {
              // Ignore parsing errors
            }
          }

          inStock = totalStock > 0;
        } catch (error) {
          console.error(`Error checking stock for ${item.material_name}:`, error);
        }
      }

      return {
        ...item,
        available_quantity: totalStock,
        in_stock: inStock
      };
    }));

    res.json({
      revision: revisionResult.rows[0],
      bomItems: bomItemsWithStock
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a revision (e.g. sketch)
router.put('/:id/revisions/:revisionId', async (req, res) => {
  try {
    const { id, revisionId } = req.params;
    const { sketch_url, notes } = req.body;

    // Build update query
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (sketch_url !== undefined) {
      updateFields.push(`sketch_url = $${paramCount}`);
      values.push(sketch_url);
      paramCount++;
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(revisionId);
    values.push(id);

    const result = await pool.query(`
      UPDATE revisions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND project_id = $${paramCount + 1}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Revision not found' });
    }

    res.json({ revision: result.rows[0] });
  } catch (error) {
    console.error('Error updating revision:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new revision
router.post('/:id/revisions', async (req, res) => {
  try {
    const { id } = req.params;
    const { sketch_url, notes, bom_items, created_by } = req.body;

    if (!created_by) {
      return res.status(400).json({ error: 'created_by is required' });
    }

    // Get the next revision number
    const revisionCount = await pool.query(
      'SELECT COUNT(*) as count FROM revisions WHERE project_id = $1',
      [id]
    );
    const nextRevisionNumber = parseInt(revisionCount.rows[0].count) + 1;

    // Create revision
    const revisionResult = await pool.query(
      `INSERT INTO revisions (project_id, revision_number, sketch_url, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, nextRevisionNumber, sketch_url || null, notes || null, created_by]
    );

    const revision = revisionResult.rows[0];

    // Add BOM items if provided
    if (bom_items && Array.isArray(bom_items) && bom_items.length > 0) {
      for (let i = 0; i < bom_items.length; i++) {
        const item = bom_items[i];
        await pool.query(
          `INSERT INTO revision_bom_items 
           (revision_id, serial_number, material_name, quantity, unit, estimated_cost, supplier, notes, hsn)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            revision.id,
            i + 1, // Serial number starts from 1
            item.material_name,
            item.quantity,
            item.unit,
            item.estimated_cost || null,
            item.supplier || null,
            item.notes || null,
            item.hsn || null
          ]
        );
      }
    }

    // Get the complete revision with BOM items
    const bomResult = await pool.query(`
      SELECT * FROM revision_bom_items
      WHERE revision_id = $1
      ORDER BY serial_number ASC
    `, [revision.id]);

    // Get project details to find assigned Project Manager
    const projectResult = await pool.query(
      'SELECT assigned_to FROM projects WHERE id = $1',
      [id]
    );

    // Send notification to Project Manager if project is assigned
    if (projectResult.rows.length > 0 && projectResult.rows[0].assigned_to) {
      const pmUserId = projectResult.rows[0].assigned_to;

      // Check if assigned user is a Project Manager
      const pmCheck = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [pmUserId]
      );

      if (pmCheck.rows.length > 0 && pmCheck.rows[0].role === 'project_manager') {
        // Create notification for Project Manager
        await pool.query(
          `INSERT INTO notifications (user_id, project_id, title, message)
           VALUES ($1, $2, $3, $4)`,
          [
            pmUserId,
            id,
            'New Revision Created',
            `A new revision (Revision ${revision.revision_number}) has been created for project.`
          ]
        );
      }
    }

    res.status(201).json({
      revision: revision,
      bomItems: bomResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

// Get notifications for a user
router.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT n.*, 
             p.name as project_name
      FROM notifications n
      LEFT JOIN projects p ON n.project_id = p.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [userId]);

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await pool.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *',
      [notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread notification count
router.get('/notifications/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit project inspection result
router.post('/:id/inspect', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, inspected_by } = req.body;

    if (!status || !inspected_by) {
      return res.status(400).json({ error: 'Status and inspector ID are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_inspections (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES projects(id),
          inspected_by INTEGER REFERENCES users(id),
          status VARCHAR(50) NOT NULL, -- 'passed', 'failed'
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result = await client.query(`
        INSERT INTO project_inspections (project_id, inspected_by, status, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [id, inspected_by, status, notes || null]);

      await client.query('COMMIT');

      // Notify Project Manager and Management
      const projectRes = await client.query('SELECT name, assigned_to, company_id FROM projects WHERE id = $1', [id]);
      const project = projectRes.rows[0];

      if (project) {
        // Notify PM
        if (project.assigned_to) {
          await client.query(`
            INSERT INTO notifications (user_id, type, title, message, project_id)
            VALUES ($1, 'inspection_result', 'Inspection Result', $2, $3)
          `, [project.assigned_to, `Project "${project.name}" inspection status: ${status.toUpperCase()}`, id]);
        }

        // Notify Management
        const managementUsers = await client.query(`
          SELECT id FROM users WHERE company_id = $1 AND role = 'management'
        `, [project.company_id]);

        for (const user of managementUsers.rows) {
          await client.query(`
            INSERT INTO notifications (user_id, type, title, message, project_id)
            VALUES ($1, 'inspection_result', 'Inspection Result', $2, $3)
          `, [user.id, `Project "${project.name}" inspection status: ${status.toUpperCase()}`, id]);
        }
      }

      res.json({ inspection: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error submitting inspection:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete project and move to sales inventory
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { hsn_code } = req.body;

    if (!hsn_code) {
      return res.status(400).json({ error: 'HSN Code is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get project details
      const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
      if (projectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Project not found' });
      }
      const project = projectResult.rows[0];

      // 2. CHECK PRE-CONDITION: Material Usage Report must exist
      const usageTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'material_usage_reports'
        );
      `);

      let hasUsageReport = false;
      let materialCost = 0;

      if (usageTableCheck.rows[0].exists) {
        const usageReportsResult = await client.query(`
          SELECT materials FROM material_usage_reports 
          WHERE project_id = $1
        `, [id]);

        if (usageReportsResult.rows.length > 0) {
          hasUsageReport = true;
          // Calculate cost from reports
          for (const report of usageReportsResult.rows) {
            const materials = typeof report.materials === 'string'
              ? JSON.parse(report.materials)
              : report.materials;

            if (Array.isArray(materials)) {
              const reportTotal = materials.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
              materialCost += reportTotal;
            }
          }
        }
      }

      if (!hasUsageReport) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Pre-condition Failed: Project Manager must send the used material list to accounts before completion.'
        });
      }

      // 3. CHECK PRE-CONDITION: NPD Inspection must be passed
      // Check if table exists first
      const inspectionTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'project_inspections'
        );
      `);

      let isPassed = false;
      if (inspectionTableCheck.rows[0].exists) {
        const inspectionResult = await client.query(`
          SELECT status FROM project_inspections 
          WHERE project_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        `, [id]);

        if (inspectionResult.rows.length > 0 && inspectionResult.rows[0].status === 'passed') {
          isPassed = true;
        }
      }

      if (!isPassed) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Pre-condition Failed: Project must pass NPD inspection before completion.'
        });
      }

      console.log(`Project ${id} completion: Final Material Cost = ${materialCost}`);

      // 4. Calculate final price (Cost + 20%)
      const finalPrice = materialCost + (materialCost * 0.20);

      // 5. Create sales_inventory table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS sales_inventory (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES projects(id),
          item_name VARCHAR(255) NOT NULL,
          hsn_code VARCHAR(50),
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10, 2),
          total_price DECIMAL(10, 2),
          status VARCHAR(50) DEFAULT 'in_stock',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 6. Insert into sales_inventory
      await client.query(`
        INSERT INTO sales_inventory (project_id, item_name, hsn_code, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, 1, $4, $4)
      `, [id, project.name, hsn_code, finalPrice]);

      // 7. Update project status
      await client.query('UPDATE projects SET status = $1 WHERE id = $2', ['completed', id]);

      // Notify Management and Accountants
      const managementUsers = await client.query(`
        SELECT id FROM users WHERE company_id = $1 AND role = 'management'
      `, [project.company_id]);

      const accountantUsers = await client.query(`
        SELECT id FROM users WHERE company_id = $1 AND role = 'accountant'
      `, [project.company_id]);

      const notifyUsers = [...managementUsers.rows, ...accountantUsers.rows];

      for (const user of notifyUsers) {
        await client.query(`
          INSERT INTO notifications (user_id, type, title, message, project_id)
          VALUES ($1, 'project_completed', 'Project Completed', $2, $3)
        `, [user.id, `Project "${project.name}" marked as COMPLETED. Final Price: ₹${finalPrice.toFixed(2)}`, id]);
      }

      await client.query('COMMIT');
      res.json({ message: 'Project completed', price: finalPrice.toFixed(2) });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error completing project:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get sales inventory
router.get('/sales/inventory', async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sales_inventory'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({ inventory: [] });
    }

    const result = await pool.query('SELECT * FROM sales_inventory ORDER BY created_at DESC');
    res.json({ inventory: result.rows });
  } catch (error) {
    console.error('Error fetching sales inventory:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sell an inventory item
router.post('/sales/sell', async (req, res) => {
  const client = await pool.connect();
  try {
    const { inventory_id, buyer_name, buyer_gstin, buyer_address, buyer_contact, final_price, gst_rate } = req.body;

    if (!inventory_id || !buyer_name || !final_price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    // Fetch item details for snapshot
    const itemRes = await client.query('SELECT item_name, hsn_code FROM sales_inventory WHERE id = $1', [inventory_id]);
    const item = itemRes.rows[0];
    if (!item) throw new Error('Item not found');

    // 1. Create sales_orders table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER REFERENCES sales_inventory(id),
        item_name VARCHAR(255),
        hsn_code VARCHAR(50),
        buyer_name VARCHAR(255) NOT NULL,
        buyer_gstin VARCHAR(50),
        buyer_address TEXT,
        buyer_contact VARCHAR(50),
        base_price DECIMAL(10, 2) NOT NULL,
        gst_rate DECIMAL(5, 2) DEFAULT 18.00,
        gst_amount DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        invoice_number VARCHAR(50) UNIQUE
      )
    `);

    // Ensure columns exist (migration)
    await client.query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN item_name VARCHAR(255);
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN hsn_code VARCHAR(50);
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN gst_rate DECIMAL(5, 2) DEFAULT 18.00;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN gst_amount DECIMAL(10, 2) DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN base_price DECIMAL(10, 2) DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN total_price DECIMAL(10, 2) DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
      END $$;
    `);

    // 2. Generate Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${Date.now().toString().slice(-4)}`;

    // 3. Calculate Amounts
    const rate = parseFloat(gst_rate) || 18;
    const price = parseFloat(final_price);
    const gstAmount = (price * rate) / 100;
    const totalPrice = price + gstAmount;

    // 3. Insert into sales_orders
    const orderResult = await client.query(`
      INSERT INTO sales_orders (
        inventory_id, item_name, hsn_code, 
        buyer_name, buyer_gstin, buyer_address, buyer_contact, 
        base_price, gst_rate, gst_amount, total_price, invoice_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      inventory_id, item.item_name, item.hsn_code,
      buyer_name, buyer_gstin, buyer_address, buyer_contact,
      price, rate, gstAmount, totalPrice, invoiceNumber
    ]);

    // 4. Update sales_inventory status
    await client.query(`
      UPDATE sales_inventory 
      SET status = 'sold' 
      WHERE id = $1
    `, [inventory_id]);

    await client.query('COMMIT');
    res.json({ message: 'Sale recorded successfully', order: orderResult.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing sale:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get Sales Invoices (for Accounts)
router.get('/sales/invoices', async (req, res) => {
  try {
    // Ensure columns exist (migration for existing table)
    await pool.query(`
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN item_name VARCHAR(255);
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN hsn_code VARCHAR(50);
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN gst_rate DECIMAL(5, 2) DEFAULT 18.00;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN gst_amount DECIMAL(10, 2) DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN base_price DECIMAL(10, 2) DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN
          ALTER TABLE sales_orders ADD COLUMN total_price DECIMAL(10, 2) DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN NULL; END;
      END $$;
    `);

    const result = await pool.query(`
      SELECT 
        so.id,
        so.inventory_id,
        so.buyer_name,
        so.buyer_gstin,
        so.buyer_address,
        so.buyer_contact,
        so.base_price,
        so.gst_rate,
        so.gst_amount,
        so.total_price,
        so.sale_date,
        so.invoice_number,
        COALESCE(so.item_name, si.item_name) as item_name,
        COALESCE(so.hsn_code, si.hsn_code) as hsn_code
      FROM sales_orders so
      LEFT JOIN sales_inventory si ON so.inventory_id = si.id
      ORDER BY so.sale_date DESC
    `);
    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== TAX CALCULATOR ROUTES ====================

// Add Project Expense
router.post('/:id/expenses', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { expense_name, amount, gst_rate } = req.body;

    if (!expense_name || !amount) {
      return res.status(400).json({ error: 'Expense name and amount are required' });
    }

    await client.query('BEGIN');

    // Create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_expenses (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        expense_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        gst_rate DECIMAL(5, 2) DEFAULT 18.00,
        gst_amount DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const baseAmount = parseFloat(amount);
    const rate = parseFloat(gst_rate) || 18;
    const gstAmount = (baseAmount * rate) / 100;
    const totalAmount = baseAmount + gstAmount;

    const result = await client.query(`
      INSERT INTO project_expenses (project_id, expense_name, amount, gst_rate, gst_amount, total_amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, expense_name, baseAmount, rate, gstAmount, totalAmount]);

    await client.query('COMMIT');
    res.json({ message: 'Expense added successfully', expense: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding expense:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get Tax Summary for a Project
router.get('/:id/tax-summary', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Calculate Input GST ONLY from Material Usage Reports (Proj Material)
    let inputGst = 0;

    const usageTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'material_usage_reports'
      );
    `);

    if (usageTableCheck.rows[0].exists) {
      const usageRes = await pool.query(`
        SELECT materials FROM material_usage_reports WHERE project_id = $1
      `, [id]);

      for (const report of usageRes.rows) {
        const materials = typeof report.materials === 'string'
          ? JSON.parse(report.materials)
          : report.materials;

        if (Array.isArray(materials)) {
          const reportGst = materials.reduce((sum, item) => sum + (parseFloat(item.gst_amount) || 0), 0);
          inputGst += reportGst;
        }
      }
    }

    // 2. Calculate Output GST (from Sales)
    // Join sales_orders -> sales_inventory -> projects
    const salesRes = await pool.query(`
      SELECT so.gst_amount 
      FROM sales_orders so
      JOIN sales_inventory si ON so.inventory_id = si.id
      WHERE si.project_id = $1
    `, [id]);

    const outputGst = salesRes.rows.reduce((sum, sale) => sum + parseFloat(sale.gst_amount), 0);

    // 3. Calculate Net
    const netGst = inputGst - outputGst;
    const status = netGst > 0 ? 'CREDIT' : 'PAYABLE';

    res.json({
      input_gst: inputGst.toFixed(2),
      output_gst: outputGst.toFixed(2),
      net_gst: Math.abs(netGst).toFixed(2),
      status
    });

  } catch (error) {
    console.error('Error calculating tax summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== REQUIREMENTS ROUTES ====================

// Get accountants for a company
router.get('/accountants/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE company_id = $1 AND role = $2 ORDER BY name',
      [companyId, 'accountant']
    );

    res.json({ accountants: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get store incharge users for a company
router.get('/store-incharge/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE company_id = $1 AND role = $2 ORDER BY name',
      [companyId, 'store_incharge']
    );

    res.json({ storeIncharge: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get requirements sent by NPD
router.get('/requirements/sent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT r.*, 
             p.name as project_name,
             u.name as sent_to_name,
             u.email as sent_to_email
      FROM requirements r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN users u ON r.sent_to = u.id
      WHERE r.created_by = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    res.json({ requirements: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get requirements received by accountant
router.get('/requirements/received/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const result = await pool.query(`
      SELECT r.*, 
             p.name as project_name,
             u.name as created_by_name,
             u.email as created_by_email
      FROM requirements r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN users u ON r.created_by = u.id
      JOIN users u_sent ON r.sent_to = u_sent.id
      WHERE r.sent_to = $1 AND u_sent.company_id = $2
      ORDER BY r.created_at DESC
    `, [userId, companyId]);

    res.json({ requirements: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific requirement with items
router.get('/requirements/:requirementId', async (req, res) => {
  try {
    const { requirementId } = req.params;

    // Get requirement details
    const requirementResult = await pool.query(`
      SELECT r.*, 
             p.name as project_name,
             u1.name as created_by_name,
             u2.name as sent_to_name
      FROM requirements r
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.sent_to = u2.id
      WHERE r.id = $1
    `, [requirementId]);

    if (requirementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    // Get requirement items
    const itemsResult = await pool.query(`
      SELECT * FROM requirement_items
      WHERE requirement_id = $1
      ORDER BY serial_number ASC
    `, [requirementId]);

    res.json({
      requirement: requirementResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update requirement status (by accountant)
router.put('/requirements/:requirementId/status', async (req, res) => {
  try {
    const { requirementId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await pool.query(
      'UPDATE requirements SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, requirementId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    const updatedRequirement = result.rows[0];

    // Notify NPD User (created_by)
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, project_id)
      VALUES ($1, 'requirement_status', 'Requirement Status Updated', $2, $3)
    `, [updatedRequirement.created_by, `Requirement "${updatedRequirement.title}" status updated to: ${status.toUpperCase()}`, updatedRequirement.project_id]);

    res.json({ requirement: updatedRequirement });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== VENDOR PORTAL ROUTES ====================

// Create a vendor demand (by Accounts)
router.post('/vendor-demands', async (req, res) => {
  try {
    const { title, description, company_id, created_by, bid_deadline, items } = req.body;

    if (!title || !created_by || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Title, created_by, and items are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create demand
      const demandResult = await client.query(
        `INSERT INTO vendor_demands(title, description, company_id, created_by, bid_deadline)
    VALUES($1, $2, $3, $4, $5)
    RETURNING * `,
        [title, description || null, company_id || null, created_by, bid_deadline || null]
      );

      const demand = demandResult.rows[0];

      // Add demand items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(
          `INSERT INTO demand_items(demand_id, serial_number, item_name, quantity, unit, hsn, notes)
    VALUES($1, $2, $3, $4, $5, $6, $7)`,
          [
            demand.id,
            i + 1,
            item.item_name,
            item.quantity,
            item.unit,
            item.hsn || null,
            item.notes || null
          ]
        );
      }

      await client.query('COMMIT');

      // Notify Accounts (Role ID 18 or find by role)
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'new_demand', 'New Requirement Created', $1
        FROM users WHERE role = 'accountant' AND company_id = $2
      `, [`New requirement created: ${title}`, company_id]);

      // Notify Vendors (Role ID 19 or find by role)
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'new_demand', 'New Order Request', $1
        FROM users WHERE role = 'vendor' AND company_id = $2
      `, [`New order request available: ${title}`, company_id]);

      res.status(201).json({ demand });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all vendor demands (for Accounts to view their demands)
router.get('/vendor-demands/accountant/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT d.*,
      COUNT(DISTINCT b.id) as bid_count
      FROM vendor_demands d
      LEFT JOIN vendor_bids b ON d.id = b.demand_id
      WHERE d.created_by = $1
      GROUP BY d.id
      ORDER BY d.created_at DESC
      `, [userId]);

    res.json({ demands: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific vendor demand with items and bids
router.get('/vendor-demands/:demandId', async (req, res) => {
  try {
    const { demandId } = req.params;

    // Get demand details
    const demandResult = await pool.query(`
      SELECT d.*, u.name as created_by_name
      FROM vendor_demands d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = $1
      `, [demandId]);

    if (demandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Demand not found' });
    }

    const demand = demandResult.rows[0];

    // Get demand items
    const itemsResult = await pool.query(`
    SELECT * FROM demand_items
      WHERE demand_id = $1
      ORDER BY serial_number ASC
      `, [demandId]);

    // Get awarded materials for this demand
    const awardedItemsResult = await pool.query(`
      SELECT md.*, di.serial_number
      FROM materials_detail md
      LEFT JOIN demand_items di ON md.demand_item_id = di.id
      WHERE md.demand_id = $1
      `, [demandId]);

    const awardedMap = {};
    awardedItemsResult.rows.forEach((row) => {
      if (row.demand_item_id) {
        awardedMap[row.demand_item_id] = row;
      }
    });

    // Get bids
    const bidsResult = await pool.query(`
      SELECT b.*, u.name as vendor_name, u.email as vendor_email
      FROM vendor_bids b
      LEFT JOIN users u ON b.vendor_id = u.id
      WHERE b.demand_id = $1
      ORDER BY b.total_amount ASC, b.created_at ASC
      `, [demandId]);

    // Get bid items for each bid
    const bidsWithItems = await Promise.all(bidsResult.rows.map(async (bid) => {
      const bidItemsResult = await pool.query(`
        SELECT bi.*, di.item_name, di.quantity, di.unit, di.hsn, di.serial_number
        FROM bid_items bi
        JOIN demand_items di ON bi.demand_item_id = di.id
        WHERE bi.bid_id = $1
        ORDER BY di.serial_number ASC
      `, [bid.id]);

      const itemsWithAwardInfo = bidItemsResult.rows.map(item => ({
        ...item,
        is_awarded: !!awardedMap[item.demand_item_id],
        awarded_to_vendor_name: awardedMap[item.demand_item_id]?.vendor_name || null,
        awarded_bid_id: awardedMap[item.demand_item_id]?.bid_id || null
      }));

      return {
        ...bid,
        items: itemsWithAwardInfo
      };
    }));

    res.json({
      demand,
      items: itemsResult.rows.map(item => ({
        ...item,
        awarded_detail: awardedMap[item.id] || null
      })),
      bids: bidsWithItems,
      awarded_items: awardedItemsResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all open vendor demands (for Vendors to view)
router.get('/vendor-demands/open/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*,
      u.name as created_by_name,
      COUNT(DISTINCT b.id) as bid_count
      FROM vendor_demands d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN vendor_bids b ON d.id = b.demand_id
      WHERE d.status = 'open'
      GROUP BY d.id, u.name
      ORDER BY d.created_at DESC
      `);

    res.json({ demands: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get demand items for a specific demand
router.get('/vendor-demands/:demandId/items', async (req, res) => {
  try {
    const { demandId } = req.params;

    const result = await pool.query(`
    SELECT * FROM demand_items
      WHERE demand_id = $1
      ORDER BY serial_number ASC
      `, [demandId]);

    res.json({ items: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get minimum bid info per item (for vendors to see competitive pricing without bidder details)
router.get('/vendor-demands/:demandId/minimum-bids', async (req, res) => {
  try {
    const { demandId } = req.params;

    // Get all demand items first
    const itemsResult = await pool.query(`
      SELECT id, serial_number, item_name
      FROM demand_items
      WHERE demand_id = $1
      ORDER BY serial_number ASC
      `, [demandId]);

    // Get minimum bid per item (unit price and supply_until_date) without vendor details
    const itemsWithMinBids = await Promise.all(itemsResult.rows.map(async (item) => {
      const minBidResult = await pool.query(`
    SELECT
    bi.unit_price,
      vb.supply_until_date
        FROM bid_items bi
        JOIN vendor_bids vb ON bi.bid_id = vb.id
        WHERE bi.demand_item_id = $1 
          AND vb.demand_id = $2
        ORDER BY bi.unit_price ASC
        LIMIT 1
      `, [item.id, demandId]);

      if (minBidResult.rows.length > 0) {
        return {
          demand_item_id: item.id,
          serial_number: item.serial_number,
          item_name: item.item_name,
          min_unit_price: minBidResult.rows[0].unit_price,
          min_supply_until_date: minBidResult.rows[0].supply_until_date,
        };
      }
      return {
        demand_item_id: item.id,
        serial_number: item.serial_number,
        item_name: item.item_name,
        min_unit_price: null,
        min_supply_until_date: null,
      };
    }));

    res.json({ minimum_bids: itemsWithMinBids });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit a bid (by Vendor)
router.post('/vendor-demands/:demandId/bids', async (req, res) => {
  try {
    const { demandId } = req.params;
    const { vendor_id, total_amount, supply_until_date, notes, bid_items } = req.body;

    if (!vendor_id || !total_amount || !supply_until_date || !bid_items || !Array.isArray(bid_items)) {
      return res.status(400).json({ error: 'vendor_id, total_amount, supply_until_date, and bid_items are required' });
    }

    if (bid_items.length === 0) {
      return res.status(400).json({ error: 'At least one item must be selected for bidding' });
    }

    // Check if demand exists and is open
    const demandCheck = await pool.query(`
      SELECT status FROM vendor_demands WHERE id = $1
      `, [demandId]);

    if (demandCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Demand not found' });
    }

    if (demandCheck.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Demand is not open for bidding' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if vendor already bid on this demand
      const existingBid = await client.query(`
        SELECT id FROM vendor_bids WHERE demand_id = $1 AND vendor_id = $2
      `, [demandId, vendor_id]);

      if (existingBid.rows.length > 0) {
        // Update existing bid
        const bidResult = await client.query(`
          UPDATE vendor_bids
          SET total_amount = $1, supply_until_date = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
    RETURNING *
      `, [total_amount, supply_until_date, notes || null, existingBid.rows[0].id]);

        const bid = bidResult.rows[0];

        // Delete old bid items
        await client.query(`DELETE FROM bid_items WHERE bid_id = $1`, [bid.id]);

        // Add new bid items
        for (const item of bid_items) {
          await client.query(`
            INSERT INTO bid_items(bid_id, demand_item_id, unit_price, total_price)
    VALUES($1, $2, $3, $4)
      `, [bid.id, item.demand_item_id, item.unit_price, item.total_price]);
        }

        await client.query('COMMIT');
        res.json({ bid, message: 'Bid updated successfully' });
      } else {
        // Create new bid
        const bidResult = await client.query(`
          INSERT INTO vendor_bids(demand_id, vendor_id, total_amount, supply_until_date, notes)
    VALUES($1, $2, $3, $4, $5)
    RETURNING *
      `, [demandId, vendor_id, total_amount, supply_until_date, notes || null]);

        const bid = bidResult.rows[0];

        // Add bid items
        for (const item of bid_items) {
          await client.query(`
            INSERT INTO bid_items(bid_id, demand_item_id, unit_price, total_price)
    VALUES($1, $2, $3, $4)
      `, [bid.id, item.demand_item_id, item.unit_price, item.total_price]);
        }

        await client.query('COMMIT');

        // Notify Store Incharge & Accounts
        // Get company_id from demand
        const demandInfo = await client.query('SELECT company_id, title FROM vendor_demands WHERE id = $1', [demandId]);
        if (demandInfo.rows.length > 0) {
          const { company_id, title } = demandInfo.rows[0];

          // Notify Store Incharge
          await client.query(`
                INSERT INTO notifications (user_id, type, title, message)
                SELECT id, 'bid_submission', 'New Bid Received', $1
                FROM users WHERE role = 'store_incharge' AND company_id = $2
            `, [`New bid received for demand: ${title}`, company_id]);

          // Notify Accounts
          await client.query(`
                INSERT INTO notifications (user_id, type, title, message)
                SELECT id, 'bid_submission', 'New Bid Received', $1
                FROM users WHERE role = 'accountant' AND company_id = $2
            `, [`New bid received for demand: ${title}`, company_id]);
        }

        res.status(201).json({ bid, message: 'Bid submitted successfully' });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error in bid submission:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Bid submission error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    res.status(500).json({
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to submit bid'
    });
  }
});

// Get vendor's bids
router.get('/vendor-bids/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const result = await pool.query(`
      SELECT b.*, d.title as demand_title, d.status as demand_status
      FROM vendor_bids b
      JOIN vendor_demands d ON b.demand_id = d.id
      WHERE b.vendor_id = $1
      ORDER BY b.created_at DESC
      `, [vendorId]);

    res.json({ bids: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept or reject a bid (by Accounts)
router.put('/vendor-bids/:bidId/status', async (req, res) => {
  try {
    const { bidId } = req.params;
    const { status, created_by, company_id } = req.body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (accepted/rejected) is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the current status before updating
      const currentBidResult = await client.query(`
        SELECT status, demand_id FROM vendor_bids WHERE id = $1
      `, [bidId]);

      if (currentBidResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Bid not found' });
      }

      const demandId = currentBidResult.rows[0].demand_id;

      // If bid is being rejected, handle awarded items if any
      if (status === 'rejected') {
        const awardedItemsForBid = await client.query(`
          SELECT id, demand_item_id FROM materials_detail WHERE bid_id = $1
      `, [bidId]);

        if (awardedItemsForBid.rows.length > 0) {
          // Delete awarded items tied to this bid
          await client.query(`DELETE FROM materials_detail WHERE bid_id = $1`, [bidId]);

          // If no awarded items remain for the demand, reopen it
          const remainingAwards = await client.query(`
            SELECT COUNT(*)::int AS count FROM materials_detail WHERE demand_id = $1
      `, [demandId]);

          if (remainingAwards.rows[0].count === 0) {
            await client.query(`
              UPDATE vendor_demands
              SET status = 'open', updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
      `, [demandId]);
          }

          // Set bid back to pending so it can be reconsidered
          const result = await client.query(`
            UPDATE vendor_bids
            SET status = 'pending', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
    RETURNING *
      `, [bidId]);

          await client.query('COMMIT');
          return res.json({ bid: result.rows[0], message: 'Award removed. Bid is available again.' });
        }
      }

      // Update the bid status
      const result = await client.query(`
        UPDATE vendor_bids
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    RETURNING *
      `, [status, bidId]);

      const bid = result.rows[0];

      // Notify Vendor
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message)
        VALUES ($1, 'bid_status', 'Bid Status Update', $2)
      `, [bid.vendor_id, `Your bid has been ${status}`]);

      // If bid is accepted, close the demand and save items to materials_detail
      if (status === 'accepted') {
        // Check if there's already an accepted bid for this demand (excluding current bid)
        const existingAcceptedBid = await client.query(`
          SELECT id FROM vendor_bids 
          WHERE demand_id = $1 AND status = 'accepted' AND id != $2
      `, [demandId, bidId]);

        // If there's an existing accepted bid, reject it first (clean up materials_detail)
        if (existingAcceptedBid.rows.length > 0) {
          const oldBidId = existingAcceptedBid.rows[0].id;

          // Delete materials_detail entries for the old accepted bid
          await client.query(`
            DELETE FROM materials_detail WHERE bid_id = $1
      `, [oldBidId]);

          // Reject the old bid
          await client.query(`
            UPDATE vendor_bids
            SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
      `, [oldBidId]);
        }

        // Close the demand
        await client.query(`
          UPDATE vendor_demands
          SET status = 'awarded', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
      `, [demandId]);

        // Remove any previously awarded items (we're awarding everything to this bid)
        await client.query(`DELETE FROM materials_detail WHERE demand_id = $1`, [demandId]);

        // Get bid items and vendor details
        const bidItemsResult = await client.query(`
          SELECT bi.*, di.item_name, di.quantity as demand_quantity, di.unit as demand_unit, di.hsn as demand_hsn
          FROM bid_items bi
          JOIN demand_items di ON bi.demand_item_id = di.id
          WHERE bi.bid_id = $1
      `, [bidId]);

        const vendorResult = await client.query(`
          SELECT name, gstin FROM users WHERE id = $1
      `, [bid.vendor_id]);

        const vendor = vendorResult.rows[0];

        // Get demand company_id
        const demandResult = await client.query(`
          SELECT company_id FROM vendor_demands WHERE id = $1
      `, [demandId]);

        const demandCompanyId = demandResult.rows[0]?.company_id || company_id;

        // Save each item to materials_detail
        for (const item of bidItemsResult.rows) {
          await client.query(`
            INSERT INTO materials_detail
      (company_id, demand_id, demand_item_id, bid_id, vendor_id, item_name, quantity, unit, hsn,
        unit_price, total_price, supply_until_date, vendor_name, vendor_gstin, created_by, status)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [
            demandCompanyId,
            demandId,
            item.demand_item_id,
            bidId,
            bid.vendor_id,
            item.item_name,
            item.demand_quantity, // Use demand item quantity
            item.demand_unit,
            item.demand_hsn,
            item.unit_price,
            item.total_price,
            bid.supply_until_date,
            vendor?.name || null,
            vendor?.gstin || null,
            created_by || null,
            'pending' // Default status
          ]);
        }
      }

      await client.query('COMMIT');
      res.json({ bid: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Award specific items from a bid (material-wise acceptance)
router.post('/vendor-bids/:bidId/award-items', async (req, res) => {
  try {
    const { bidId } = req.params;
    const { bid_item_ids, created_by, company_id } = req.body;

    if (!bid_item_ids || !Array.isArray(bid_item_ids) || bid_item_ids.length === 0) {
      return res.status(400).json({ error: 'Please select at least one bid item to award' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const bidResult = await client.query(`SELECT * FROM vendor_bids WHERE id = $1`, [bidId]);
      if (bidResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Bid not found' });
      }

      const bid = bidResult.rows[0];

      const vendorResult = await client.query(`SELECT name, gstin FROM users WHERE id = $1`, [bid.vendor_id]);
      const vendor = vendorResult.rows[0];

      const demandResult = await client.query(`SELECT company_id FROM vendor_demands WHERE id = $1`, [bid.demand_id]);
      const demandCompanyId = demandResult.rows[0]?.company_id || company_id;

      const bidItemsResult = await client.query(`
        SELECT bi.*, di.item_name, di.quantity as demand_quantity, di.unit as demand_unit, di.hsn as demand_hsn
        FROM bid_items bi
        JOIN demand_items di ON bi.demand_item_id = di.id
        WHERE bi.bid_id = $1 AND bi.id = ANY($2:: int[])
      `, [bidId, bid_item_ids]);

      if (bidItemsResult.rows.length !== bid_item_ids.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Some selected items do not belong to this bid or do not exist' });
      }

      for (const item of bidItemsResult.rows) {
        // Ensure this demand item is not already awarded
        const existingAward = await client.query(`
          SELECT id FROM materials_detail WHERE demand_item_id = $1
      `, [item.demand_item_id]);

        if (existingAward.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Item ${item.item_name} has already been awarded` });
        }

        await client.query(`
          INSERT INTO materials_detail
      (company_id, demand_id, demand_item_id, bid_id, vendor_id, item_name, quantity, unit, hsn,
        unit_price, total_price, supply_until_date, vendor_name, vendor_gstin, created_by, status)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          demandCompanyId,
          bid.demand_id,
          item.demand_item_id,
          bidId,
          bid.vendor_id,
          item.item_name,
          item.demand_quantity,
          item.demand_unit,
          item.demand_hsn,
          item.unit_price,
          item.total_price,
          bid.supply_until_date,
          vendor?.name || null,
          vendor?.gstin || null,
          created_by || null,
          'pending'
        ]);
      }

      // Determine if this bid now has all items awarded
      const totalBidItems = await client.query(`SELECT COUNT(*):: int as count FROM bid_items WHERE bid_id = $1`, [bidId]);
      const awardedBidItems = await client.query(`SELECT COUNT(*):: int as count FROM materials_detail WHERE bid_id = $1`, [bidId]);

      if (awardedBidItems.rows[0].count === totalBidItems.rows[0].count) {
        await client.query(`
          UPDATE vendor_bids
          SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
      `, [bidId]);
      } else {
        await client.query(`
          UPDATE vendor_bids
          SET status = 'pending', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
      `, [bidId]);
      }

      // Check if all demand items are awarded to close the demand
      const totalDemandItems = await client.query(`SELECT COUNT(*):: int as count FROM demand_items WHERE demand_id = $1`, [bid.demand_id]);
      const awardedDemandItems = await client.query(`SELECT COUNT(*):: int as count FROM materials_detail WHERE demand_id = $1`, [bid.demand_id]);

      if (awardedDemandItems.rows[0].count === totalDemandItems.rows[0].count && totalDemandItems.rows[0].count > 0) {
        await client.query(`
          UPDATE vendor_demands
          SET status = 'awarded', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
      `, [bid.demand_id]);
      } else {
        await client.query(`
          UPDATE vendor_demands
          SET status = 'open', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status <> 'open'
      `, [bid.demand_id]);
      }

      await client.query('COMMIT');
      res.json({ message: 'Selected items awarded successfully!' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error awarding items:', error);
      res.status(500).json({ error: 'Server error while awarding items' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in award items route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get materials detail for a company
router.get('/materials-detail/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(`
    SELECT
    md.*,
      vd.title as demand_title,
      vd.description as demand_description
      FROM materials_detail md
      LEFT JOIN vendor_demands vd ON md.demand_id = vd.id
      WHERE md.company_id = $1
      ORDER BY md.created_at DESC
      `, [companyId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching materials detail:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search materials by item name or HSN
router.get('/materials-detail/:companyId/search', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { term } = req.query;

    if (!term) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const result = await pool.query(`
    SELECT
    md.*,
      vd.title as demand_title
      FROM materials_detail md
      LEFT JOIN vendor_demands vd ON md.demand_id = vd.id
      WHERE md.company_id = $1
    AND(LOWER(md.item_name) LIKE LOWER($2) OR md.hsn LIKE $2)
      ORDER BY md.created_at DESC
      `, [companyId, ` % ${term}% `]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching materials:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create major order
// Create major order (supports single or multiple items)
router.post('/major-orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const { items, company_id, created_by } = req.body;

    // Handle multiple items
    if (items && Array.isArray(items) && items.length > 0) {
      await client.query('BEGIN');
      const createdOrders = [];

      for (const item of items) {
        const {
          materials_detail_id,
          vendor_id,
          item_name,
          hsn,
          quantity,
          unit,
          unit_price,
          total_price
        } = item;

        if (!company_id || !vendor_id || !item_name || !quantity || !unit || !unit_price || !total_price) {
          throw new Error('All required fields must be provided for each item');
        }

        const result = await client.query(`
          INSERT INTO major_orders
      (company_id, materials_detail_id, vendor_id, item_name, hsn, quantity, unit,
        unit_price, total_price, created_by)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
      `, [
          company_id,
          materials_detail_id || null,
          vendor_id,
          item_name,
          hsn || null,
          quantity,
          unit,
          unit_price,
          total_price,
          created_by || null,
        ]);

        createdOrders.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return res.status(201).json({ orders: createdOrders, message: 'Orders placed successfully' });
    }

    // Handle single item (legacy support)
    const {
      materials_detail_id,
      vendor_id,
      item_name,
      hsn,
      quantity,
      unit,
      unit_price,
      total_price,
    } = req.body;

    if (!company_id || !vendor_id || !item_name || !quantity || !unit || !unit_price || !total_price) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const result = await pool.query(`
      INSERT INTO major_orders
      (company_id, materials_detail_id, vendor_id, item_name, hsn, quantity, unit,
        unit_price, total_price, created_by)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
      `, [
      company_id,
      materials_detail_id || null,
      vendor_id,
      item_name,
      hsn || null,
      quantity,
      unit,
      unit_price,
      total_price,
      created_by || null,
    ]);

    res.status(201).json({ order: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating major order:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  } finally {
    client.release();
  }
});

// Get major orders for a company (including Purchase Order items)
// Get major orders for a company
router.get('/major-orders/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const result = await pool.query(`
      (SELECT 
        mo.id, NULL::integer as project_id, mo.vendor_id, mo.status, 
        mo.item_name, mo.hsn, mo.quantity, mo.unit, 
        mo.unit_price, mo.total_price, mo.created_at, mo.created_at as order_date,
        u.name as vendor_name, u.email as vendor_email,
        'legacy' as order_type,
        NULL::integer as purchase_order_id,
        NULL::integer as po_number_sequential,
        c.name as company_name,
        COALESCE((SELECT SUM(ori.quantity_received) FROM order_receipt_items ori WHERE ori.order_id = mo.id), 0) as total_received
      FROM major_orders mo
      LEFT JOIN users u ON mo.vendor_id = u.id
      LEFT JOIN companies c ON mo.company_id = c.id
      WHERE mo.company_id = $1)
      UNION ALL
      (SELECT 
        poi.id, NULL::integer as project_id, po.master_vendor_id as vendor_id, po.status,
        poi.material_name as item_name, poi.hsn, poi.quantity, poi.unit,
        poi.unit_price, poi.total_price, po.created_at, po.created_at as order_date,
        mv.name as vendor_name, mv.email as vendor_email,
        'purchase_order' as order_type,
        po.id as purchase_order_id,
        po.po_number_sequential,
        c.name as company_name,
        COALESCE((SELECT SUM(ori.quantity_received) FROM order_receipt_items ori WHERE ori.purchase_order_item_id = poi.id), 0) as total_received
      FROM purchase_order_items poi
      JOIN purchase_orders po ON poi.po_id = po.id
      LEFT JOIN master_vendors mv ON po.master_vendor_id = mv.id
      LEFT JOIN companies c ON po.company_id = c.id
      WHERE po.company_id = $1)
      ORDER BY created_at DESC
      `, [companyId]);

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching major orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get major orders for a vendor (Order Request)
router.get('/major-orders/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const result = await pool.query(`
      SELECT mo.*, c.name as company_name
      FROM major_orders mo
      LEFT JOIN companies c ON mo.company_id = c.id
      WHERE mo.vendor_id = $1
      ORDER BY mo.created_at DESC
      `,
      [vendorId]);

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status
router.put('/major-orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'confirmed', 'order_placed', 'shipped', 'dispatched', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const result = await pool.query(
      'UPDATE major_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Create minor order
router.post('/minor-orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const { items, company_id, created_by } = req.body;

    // Handle multiple items
    if (items && Array.isArray(items) && items.length > 0) {
      await client.query('BEGIN');
      const createdOrders = [];

      for (const item of items) {
        const {
          item_name,
          hsn,
          quantity,
          unit,
          deadline_date
        } = item;

        if (!company_id || !item_name || !quantity || !unit || !deadline_date) {
          throw new Error('All required fields must be provided for each item');
        }

        const result = await client.query(`
          INSERT INTO minor_orders
      (company_id, item_name, hsn, quantity, unit, deadline_date, created_by)
    VALUES($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
      `, [
          company_id,
          item_name,
          hsn || null,
          quantity,
          unit,
          deadline_date,
          created_by || null,
        ]);

        createdOrders.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return res.status(201).json({ orders: createdOrders, message: 'Minor orders created successfully' });
    }

    // Handle single item (legacy support)
    const {
      item_name,
      hsn,
      quantity,
      unit,
      deadline_date,
    } = req.body;

    if (!company_id || !item_name || !quantity || !unit || !deadline_date) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const result = await pool.query(`
      INSERT INTO minor_orders
      (company_id, item_name, hsn, quantity, unit, deadline_date, created_by)
    VALUES($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
      `, [
      company_id,
      item_name,
      hsn || null,
      quantity,
      unit,
      deadline_date,
      created_by || null,
    ]);

    res.status(201).json({ order: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating minor order:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  } finally {
    client.release();
  }
});

// Get minor orders for a company
router.get('/minor-orders/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(`
      SELECT mo.*,
      COUNT(DISTINCT mob.id) as bid_count,
      MIN(mob.unit_price) as min_bid_price
      FROM minor_orders mo
      LEFT JOIN minor_order_bids mob ON mo.id = mob.minor_order_id
      WHERE mo.company_id = $1
      GROUP BY mo.id
      ORDER BY mo.created_at DESC
      `, [companyId]);

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching minor orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all open minor orders (for vendors)
router.get('/minor-orders/open/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mo.*, c.name as company_name
      FROM minor_orders mo
      LEFT JOIN companies c ON mo.company_id = c.id
      WHERE mo.status = 'open'
      ORDER BY mo.deadline_date ASC, mo.created_at DESC
      `);

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Error fetching open minor orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get minor order with bids
router.get('/minor-orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderResult = await pool.query(`
      SELECT mo.*, c.name as company_name
      FROM minor_orders mo
      LEFT JOIN companies c ON mo.company_id = c.id
      WHERE mo.id = $1
      `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const bidsResult = await pool.query(`
      SELECT mob.*, u.name as vendor_name, u.email as vendor_email
      FROM minor_order_bids mob
      LEFT JOIN users u ON mob.vendor_id = u.id
      WHERE mob.minor_order_id = $1
      ORDER BY mob.unit_price ASC, mob.created_at ASC
      `, [orderId]);

    res.json({
      order: orderResult.rows[0],
      bids: bidsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching minor order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get minor order bids (for management screen)
router.get('/minor-orders/:orderId/bids', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderResult = await pool.query(`
      SELECT mo.*, c.name as company_name
      FROM minor_orders mo
      LEFT JOIN companies c ON mo.company_id = c.id
      WHERE mo.id = $1
      `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const bidsResult = await pool.query(`
      SELECT mob.*, u.name as vendor_name, u.email as vendor_email
      FROM minor_order_bids mob
      LEFT JOIN users u ON mob.vendor_id = u.id
      WHERE mob.minor_order_id = $1
      ORDER BY mob.unit_price ASC, mob.created_at ASC
      `, [orderId]);

    res.json({
      order: orderResult.rows[0],
      bids: bidsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching minor order bids:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit bid for minor order
router.post('/minor-orders/:orderId/bids', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { vendor_id, unit_price, total_price } = req.body;

    if (!vendor_id || !unit_price || !total_price) {
      return res.status(400).json({ error: 'vendor_id, unit_price, and total_price are required' });
    }

    // Check if order exists and is open
    const orderCheck = await pool.query(`
      SELECT status FROM minor_orders WHERE id = $1
      `, [orderId]);

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (orderCheck.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Order is not open for bidding' });
    }

    // Check if vendor already bid
    const existingBid = await pool.query(`
      SELECT id FROM minor_order_bids 
      WHERE minor_order_id = $1 AND vendor_id = $2
      `, [orderId, vendor_id]);

    if (existingBid.rows.length > 0) {
      // Update existing bid
      const result = await pool.query(`
        UPDATE minor_order_bids
        SET unit_price = $1, total_price = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
    RETURNING *
      `, [unit_price, total_price, existingBid.rows[0].id]);

      return res.json({ bid: result.rows[0], message: 'Bid updated successfully' });
    }

    // Create new bid
    const result = await pool.query(`
      INSERT INTO minor_order_bids(minor_order_id, vendor_id, unit_price, total_price)
    VALUES($1, $2, $3, $4)
    RETURNING *
      `, [orderId, vendor_id, unit_price, total_price]);

    res.status(201).json({ bid: result.rows[0], message: 'Bid submitted successfully' });
  } catch (error) {
    console.error('Error submitting bid:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get minimum bids for minor order (for vendors to see)
router.get('/minor-orders/:orderId/minimum-bids', async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await pool.query(`
    SELECT
    MIN(unit_price) as min_unit_price,
      MIN(total_price) as min_total_price
      FROM minor_order_bids
      WHERE minor_order_id = $1
      `, [orderId]);

    res.json({ minimum_bids: result.rows[0] || { min_unit_price: null, min_total_price: null } });
  } catch (error) {
    console.error('Error fetching minimum bids:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Select vendor for minor order
router.put('/minor-orders/:orderId/select-vendor', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { bid_id } = req.body;

    if (!bid_id) {
      return res.status(400).json({ error: 'bid_id is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get bid details
      const bidResult = await client.query(`
    SELECT * FROM minor_order_bids WHERE id = $1 AND minor_order_id = $2
      `, [bid_id, orderId]);

      if (bidResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Bid not found' });
      }

      const bid = bidResult.rows[0];

      // Update order status and selected vendor
      await client.query(`
        UPDATE minor_orders
        SET status = 'awarded',
      selected_vendor_id = $1,
      selected_bid_id = $2,
      updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [bid.vendor_id, bid_id, orderId]);

      // Update bid status
      await client.query(`
        UPDATE minor_order_bids
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [bid_id]);

      // Reject other bids
      await client.query(`
        UPDATE minor_order_bids
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE minor_order_id = $1 AND id != $2
      `, [orderId, bid_id]);

      await client.query('COMMIT');
      res.json({ message: 'Vendor selected successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error selecting vendor:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sketch Upload Configuration
const sketchStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'sketch-' + Date.now() + path.extname(file.originalname));
  }
});

const sketchUpload = multer({ 
  storage: sketchStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Upload sketch endpoint
router.post('/upload-sketch', sketchUpload.single('sketch'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return relative path
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Order Receipts Routes
// multer, path, and fs are already imported at the top

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/bills');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bill-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Submit order receipt
router.post('/order-receipts', upload.any(), async (req, res) => {
  try {
    const {
      order_id,
      purchase_order_id,
      company_id,
      submitted_by,
      gross_weight,
      tare_weight,
      net_weight,
      vehicle_weight_unit,
      items: itemsRaw,
    } = req.body;

    // items arrives as a JSON string from multipart FormData — parse it
    let itemsData;
    try {
      itemsData = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : (itemsRaw || []);
    } catch (_e) {
      return res.status(400).json({ error: 'Invalid items data' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Bill file is required' });
    }

    if (!company_id || !submitted_by) {
      return res.status(400).json({ error: 'company_id and submitted_by are required' });
    }

    if (!order_id && !purchase_order_id) {
      return res.status(400).json({ error: 'Either order_id or purchase_order_id is required' });
    }

    if (!Array.isArray(itemsData) || itemsData.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Ensure receipt_status and total_quantity_received columns exist (safe auto-migration)
    try {
      await pool.query(`ALTER TABLE order_receipts ADD COLUMN IF NOT EXISTS receipt_status VARCHAR(20) DEFAULT 'complete'`);
      await pool.query(`ALTER TABLE order_receipts ADD COLUMN IF NOT EXISTS total_quantity_received DECIMAL(10, 2) DEFAULT 0`);
    } catch (migErr) {
      console.warn('Migration note (receipt_status):', migErr.message);
    }

    let existingReceipt;
    if (order_id && order_id !== 'null') {
      existingReceipt = await pool.query(`
        SELECT id, receipt_status FROM order_receipts WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1
        `, [order_id]);
    } else {
      existingReceipt = await pool.query(`
        SELECT id, receipt_status FROM order_receipts WHERE purchase_order_id = $1 ORDER BY created_at DESC LIMIT 1
        `, [purchase_order_id]);
    }

    if (existingReceipt.rows.length > 0) {
      const existing = existingReceipt.rows[0];
      if (existing.receipt_status === 'complete') {
        return res.status(400).json({ error: 'Receipt already submitted and fully received. No further submissions allowed.' });
      }
      // If partial, allow re-submission — continue below
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate totals
      const totalAmount = itemsData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
      const totalGST = itemsData.reduce((sum, item) => sum + parseFloat(item.gst_amount || 0), 0);

      // Determine receipt_status: compare each item's received vs ordered
      // receipt_status = 'complete' if ALL items have quantity_received >= quantity_ordered
      // receipt_status = 'partial' if ANY item still has a shortfall
      let receiptStatus = 'complete';
      for (const item of itemsData) {
        const qtyOrdered = parseFloat(item.quantity_ordered) || 0;
        const qtyReceived = parseFloat(item.quantity_received) || 0;

        // Also sum up previously received quantities for this item across prior receipts
        let prevReceivedResult;
        if (order_id && order_id !== 'null') {
          prevReceivedResult = await client.query(`
            SELECT COALESCE(SUM(ori.quantity_received), 0) as prev_received
            FROM order_receipt_items ori
            JOIN order_receipts orec ON ori.receipt_id = orec.id
            WHERE orec.order_id = $1 AND ori.item_name = $2
          `, [order_id, item.item_name]);
        } else {
          prevReceivedResult = await client.query(`
            SELECT COALESCE(SUM(ori.quantity_received), 0) as prev_received
            FROM order_receipt_items ori
            JOIN order_receipts orec ON ori.receipt_id = orec.id
            WHERE orec.purchase_order_id = $1 AND ori.item_name = $2
          `, [purchase_order_id, item.item_name]);
        }

        const prevReceived = parseFloat(prevReceivedResult.rows[0].prev_received) || 0;
        const totalReceivedForItem = prevReceived + qtyReceived;

        if (qtyOrdered > 0 && totalReceivedForItem < qtyOrdered) {
          receiptStatus = 'partial';
        }
      }

      const totalQuantityReceived = itemsData.reduce((sum, item) => sum + (parseFloat(item.quantity_received) || 0), 0);
      const mainBill = req.files.find(f => f.fieldname === 'bill') || req.files[0];

      // Create order receipt
      const receiptResult = await client.query(`
        INSERT INTO order_receipts
          (order_id, purchase_order_id, company_id, bill_image_url, total_amount, total_gst_amount, submitted_by,
           gross_weight, tare_weight, net_weight, vehicle_weight_unit, receipt_status, total_quantity_received)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        (order_id && order_id !== 'null') ? order_id : null,
        (purchase_order_id && purchase_order_id !== 'null') ? purchase_order_id : null,
        company_id,
        mainBill ? `/uploads/bills/${mainBill.filename}` : null,
        totalAmount > 0 ? totalAmount : null,
        totalGST > 0 ? totalGST : null,
        submitted_by,
        gross_weight ? parseFloat(gross_weight) : null,
        tare_weight ? parseFloat(tare_weight) : null,
        net_weight ? parseFloat(net_weight) : null,
        vehicle_weight_unit || 'kg',
        receiptStatus,
        totalQuantityReceived
      ]);

      const receipt = receiptResult.rows[0];
      const generatedQRs = [];

      // Insert receipt items and update inventory
      for (const item of itemsData) {
        await client.query(`
          INSERT INTO order_receipt_items
          (receipt_id, order_id, purchase_order_item_id, item_name, hsn, quantity_ordered, quantity_received,
            unit, unit_price, gst_rate, gst_amount, total_amount)
          VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
          receipt.id,
          (item.order_id && item.order_id !== 'null') ? item.order_id : null,
          (item.purchase_order_item_id && item.purchase_order_item_id !== 'null') ? item.purchase_order_item_id : null,
          item.item_name,
          item.hsn || null,
          item.quantity_ordered,
          item.quantity_received,
          item.unit,
          item.unit_price ? parseFloat(item.unit_price) : null,
          item.gst_rate ? parseFloat(item.gst_rate) : null,
          item.gst_amount ? parseFloat(item.gst_amount) : null,
          item.total_amount ? parseFloat(item.total_amount) : null,
        ]);

        // ── Auto-update inventory when bill is submitted ────────────────────────
        const qtyToStore = parseFloat(item.quantity_received) || 0;
        if (qtyToStore > 0) {
          const inventoryCheck = await client.query(`
            SELECT id, quantity FROM inventory
            WHERE company_id = $1 AND item_name = $2 AND (hsn = $3 OR (hsn IS NULL AND $3 IS NULL))
          `, [company_id, item.item_name, item.hsn || null]);

          if (inventoryCheck.rows.length > 0) {
            const existingQty = parseFloat(inventoryCheck.rows[0].quantity) || 0;
            const newQty = existingQty + qtyToStore;
            await client.query(`
              UPDATE inventory
              SET quantity = $1, last_updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [newQty, inventoryCheck.rows[0].id]);
          } else {
            await client.query(`
              INSERT INTO inventory(company_id, item_name, hsn, quantity, unit)
              VALUES($1, $2, $3, $4, $5)
            `, [
              company_id,
              item.item_name,
              item.hsn || null,
              qtyToStore,
              item.unit || 'units'
            ]);
          }
        }
        // ── Auto-generate QR code for this item ─────────────────────────────────
        if (qtyToStore > 0) {
          const barcodeData = `Item: ${item.item_name}\nQty: ${qtyToStore}\nDate: ${new Date().toISOString()}\nJSON Data: ${JSON.stringify({
            item_name: item.item_name,
            hsn: item.hsn,
            quantity: qtyToStore,
            unit: item.unit,
            company_id: company_id,
            receipt_id: receipt.id,
            purchase_order_id: (purchase_order_id && purchase_order_id !== 'null') ? purchase_order_id : null
          })}`;

          const barcodeResult = await client.query(`
            INSERT INTO barcodes(company_id, item_name, order_id, purchase_order_id, hsn, purchased_date, barcode_data)
            VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
            RETURNING id
          `, [
            company_id,
            item.item_name,
            (order_id && order_id !== 'null') ? order_id : null,
            (purchase_order_id && purchase_order_id !== 'null') ? purchase_order_id : null,
            item.hsn || null,
            barcodeData
          ]);

          const barcodeId = barcodeResult.rows[0].id;
          const qrNumber = `QR${String(barcodeId).padStart(8, '0')}`;
          
          await client.query(`
            UPDATE barcodes SET qr_number = $1 WHERE id = $2
          `, [qrNumber, barcodeId]);

          generatedQRs.push(qrNumber);
        }
      }

      // ── Notifications ────────────────────────────────────────────────────────
      const accountantsRes = await client.query(`
        SELECT id FROM users
        WHERE company_id = $1 AND role = 'accountant' AND is_approved = true
      `, [company_id]);

      const companyRes = await client.query(`SELECT name FROM companies WHERE id = $1`, [company_id]);
      const companyName = companyRes.rows[0]?.name || 'PO';
      
      const getInitials = (name) => {
        if (!name) return 'PO';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) return words[0].substring(0, 5).toUpperCase();
        return words.map(w => w[0]).join('').substring(0, 5).toUpperCase();
      };
      
      const prefix = order_id ? 'ORD' : getInitials(companyName);
      const idToUse = order_id ? order_id : purchase_order_id;
      const poNumber = `${prefix}${String(idToUse || '').padStart(9, '0')}`;

      const notifTitle = receiptStatus === 'complete' ? 'Order Fully Received' : 'Partial Order Receipt';
      const notifMessage = receiptStatus === 'complete'
        ? `Order ${poNumber} has been fully received and requires your review for pricing/GST.`
        : `Order ${poNumber} has been partially received and requires your review for pricing/GST.`;

      for (const acc of accountantsRes.rows) {
        try {
          await client.query(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES ($1, $2, $3, $4)
          `, [
            acc.id,
            notifTitle,
            notifMessage,
            'info'
          ]);
        } catch (notifErr) {
          console.error('Error sending receipt notification:', notifErr.message);
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      await client.query('COMMIT');
      res.status(201).json({
        receipt,
        receipt_status: receiptStatus,
        generated_qrs: generatedQRs,
        message: receiptStatus === 'complete'
          ? 'Receipt submitted successfully. Order fully received!'
          : 'Receipt submitted. Order partially received — you can submit again for the remaining quantity.'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error submitting receipt:', error?.message || error);
    res.status(500).json({ error: 'Server error: ' + (error?.message || 'Unknown error') });
  }
});
// Accountant: Update unit price & GST for receipt items
router.put('/order-receipts/:id/amounts', async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // [{item_name, unit_price, gst_rate}]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let totalAmount = 0;
      let totalGST = 0;

      for (const item of items) {
        const unitPrice = parseFloat(item.unit_price) || 0;
        const gstRate = parseFloat(item.gst_rate) || 0;

        // Get existing quantity_received for this item in this receipt
        const existing = await client.query(`
          SELECT id, quantity_received FROM order_receipt_items
          WHERE receipt_id = $1 AND item_name = $2
        `, [id, item.item_name]);

        if (existing.rows.length > 0) {
          const qtyReceived = parseFloat(existing.rows[0].quantity_received) || 0;
          const baseAmount = qtyReceived * unitPrice;
          const gstAmount = (baseAmount * gstRate) / 100;
          const itemTotal = baseAmount + gstAmount;

          await client.query(`
            UPDATE order_receipt_items
            SET unit_price = $1, gst_rate = $2, gst_amount = $3, total_amount = $4
            WHERE id = $5
          `, [unitPrice, gstRate, gstAmount, itemTotal, existing.rows[0].id]);

          totalAmount += itemTotal;
          totalGST += gstAmount;
        }
      }

      // Update receipt totals
      await client.query(`
        UPDATE order_receipts
        SET total_amount = $1, total_gst_amount = $2
        WHERE id = $3
      `, [totalAmount, totalGST, id]);

      await client.query('COMMIT');
      res.json({ success: true, total_amount: totalAmount, total_gst_amount: totalGST });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating receipt amounts:', error?.message);
    res.status(500).json({ error: 'Server error: ' + (error?.message || 'Unknown') });
  }
});

// Get order receipts for a company
router.get('/order-receipts/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const result = await pool.query(`
      SELECT orec.*,
        COALESCE(mo.item_name, 'PO: ' || po.vendor_name) as order_item_name,
        COALESCE(mo.vendor_id, po.master_vendor_id) as vendor_id,
        COALESCE(u.name, po.vendor_name) as vendor_name,
        u2.name as submitted_by_name,
        u3.name as approved_by_name
      FROM order_receipts orec
      LEFT JOIN major_orders mo ON orec.order_id = mo.id
      LEFT JOIN purchase_orders po ON orec.purchase_order_id = po.id
      LEFT JOIN users u ON COALESCE(mo.vendor_id, po.master_vendor_id) = u.id
      LEFT JOIN users u2 ON orec.submitted_by = u2.id
      LEFT JOIN users u3 ON orec.approved_by = u3.id
      WHERE orec.company_id = $1
      ORDER BY orec.created_at DESC
          `, [companyId]);

    res.json({ receipts: result.rows });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get order receipt details with items
router.get('/order-receipts/:receiptId', async (req, res) => {
  try {
    const { receiptId } = req.params;

    const receiptResult = await pool.query(`
      SELECT orec.*,
        COALESCE(mo.item_name, 'PO: ' || po.vendor_name) as order_item_name,
        COALESCE(mo.vendor_id, po.master_vendor_id) as vendor_id,
        COALESCE(u.name, po.vendor_name) as vendor_name,
        u2.name as submitted_by_name,
        u3.name as approved_by_name
      FROM order_receipts orec
      LEFT JOIN major_orders mo ON orec.order_id = mo.id
      LEFT JOIN purchase_orders po ON orec.purchase_order_id = po.id
      LEFT JOIN users u ON COALESCE(mo.vendor_id, po.master_vendor_id) = u.id
      LEFT JOIN users u2 ON orec.submitted_by = u2.id
      LEFT JOIN users u3 ON orec.approved_by = u3.id
      WHERE orec.id = $1
          `, [receiptId]);

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const itemsResult = await pool.query(`
    SELECT * FROM order_receipt_items
      WHERE receipt_id = $1
      ORDER BY id ASC
          `, [receiptId]);

    res.json({
      receipt: receiptResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update receipt status (approve/reject)
router.put('/order-receipts/:receiptId/status', async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { status, approved_by } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const result = await pool.query(`
      UPDATE order_receipts
      SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    RETURNING *
        `, [status, approved_by || null, receiptId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ receipt: result.rows[0] });
  } catch (error) {
    console.error('Error updating receipt status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get inventory for a company
router.get('/inventory/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(`
    SELECT * FROM inventory
      WHERE company_id = $1
      ORDER BY item_name ASC, last_updated_at DESC
          `, [companyId]);

    res.json({ inventory: result.rows });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get barcode for an order
router.get('/barcodes/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await pool.query(`
    SELECT * FROM barcodes
      WHERE order_id = $1 OR purchase_order_item_id = $1
      ORDER BY exp_date ASC
          `, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barcode not found' });
    }

    // If only one barcode, return single object for backward compatibility
    // If multiple, return array
    if (result.rows.length === 1) {
      res.json({ barcode: result.rows[0] });
    } else {
      res.json({ barcodes: result.rows, count: result.rows.length });
    }
  } catch (error) {
    console.error('Error fetching barcode:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Save barcode for an order
router.post('/barcodes', async (req, res) => {
  try {
    const { order_id, purchase_order_id, purchase_order_item_id, company_id, item_name, hsn, purchased_date, mfg_date, exp_date, barcode_data } = req.body;

    if ((!order_id && !purchase_order_item_id) || !company_id || !item_name || !purchased_date || !barcode_data) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if barcode already exists for this order/PO item and expiry date combination
    let existing;
    if (order_id && order_id !== 'null') {
      if (exp_date) {
        existing = await pool.query(`
          SELECT id FROM barcodes WHERE order_id = $1 AND exp_date = $2
            `, [order_id, exp_date]);
      } else {
        existing = await pool.query(`
          SELECT id FROM barcodes WHERE order_id = $1 AND exp_date IS NULL
            `, [order_id]);
      }
    } else {
      if (exp_date) {
        existing = await pool.query(`
          SELECT id FROM barcodes WHERE purchase_order_item_id = $1 AND exp_date = $2
            `, [purchase_order_item_id, exp_date]);
      } else {
        existing = await pool.query(`
          SELECT id FROM barcodes WHERE purchase_order_item_id = $1 AND exp_date IS NULL
            `, [purchase_order_item_id]);
      }
    }

    let result;
    if (existing.rows.length > 0) {
      // Don't allow update if QR code already exists for this expiry date
      return res.status(400).json({ error: 'QR code already exists for this order with this expiry date and cannot be regenerated' });
    } else {
      // Insert new barcode and generate QR number
      const insertResult = await pool.query(`
        INSERT INTO barcodes(order_id, purchase_order_id, purchase_order_item_id, company_id, item_name, hsn, purchased_date, mfg_date, exp_date, barcode_data)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
          `, [
        (order_id && order_id !== 'null') ? order_id : null,
        (purchase_order_id && purchase_order_id !== 'null') ? purchase_order_id : null,
        (purchase_order_item_id && purchase_order_item_id !== 'null') ? purchase_order_item_id : null,
        company_id,
        item_name,
        hsn || null,
        purchased_date,
        mfg_date,
        exp_date,
        barcode_data
      ]);

      // Generate QR number based on ID
      const qrNumber = `QR${String(insertResult.rows[0].id).padStart(8, '0')
        } `;

      // Extract quantity from barcode_data JSON string to update inventory
      const jsonMatch = barcode_data.match(/JSON Data: ({.*})/);
      let quantity = 1; // Default to 1 if not found
      if (jsonMatch) {
         try {
            const jsonData = JSON.parse(jsonMatch[1]);
            quantity = parseFloat(jsonData.quantity) || 1;
         } catch(e) {
            console.error("Error parsing barcode JSON data inside saveBarcode", e);
         }
      }

      // Inventory is now updated only when the bill is submitted to accounts (receipt submission)
      // to ensure stock is available immediately. Double counting is avoided here.

      // Update with QR number
      result = await pool.query(`
        UPDATE barcodes
        SET qr_number = $1
        WHERE id = $2
    RETURNING *
      `, [qrNumber, insertResult.rows[0].id]);
    }

    res.json({ barcode: result.rows[0] });
  } catch (error) {
    console.error('Error saving barcode:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get barcode by QR number
router.get('/barcodes/qr/:qrNumber', async (req, res) => {
  try {
    const { qrNumber } = req.params;

    const result = await pool.query(`
    SELECT * FROM barcodes
      WHERE qr_number = $1
      `, [qrNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    res.json({ barcode: result.rows[0] });
  } catch (error) {
    console.error('Error fetching barcode by QR number:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get barcodes by item name and company
router.get('/barcodes/item/:itemName/company/:companyId', async (req, res) => {
  try {
    const { itemName, companyId } = req.params;

    const result = await pool.query(`
    SELECT * FROM barcodes
      WHERE item_name = $1 AND company_id = $2
      ORDER BY exp_date ASC
      `, [itemName, companyId]);

    res.json({ barcodes: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching barcodes by item:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update barcode data (to add quantity information)
router.put('/barcodes/:barcodeId', async (req, res) => {
  try {
    const { barcodeId } = req.params;
    const { barcode_data } = req.body;

    if (!barcode_data) {
      return res.status(400).json({ error: 'barcode_data is required' });
    }

    const result = await pool.query(`
      UPDATE barcodes
      SET barcode_data = $1
      WHERE id = $2
    RETURNING *
      `, [barcode_data, barcodeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barcode not found' });
    }

    res.json({ barcode: result.rows[0] });
  } catch (error) {
    console.error('Error updating barcode:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ==================== STORE REQUESTS API ====================

// Create a store request
router.post('/store-requests', async (req, res) => {
  try {
    const { project_id, items, notes, allocated_to_worker_id } = req.body;

    if (!project_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'project_id and items array are required' });
    }

    // Get project details
    const projectResult = await pool.query(
      'SELECT id, name, company_id, assigned_to FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get requester details first
    const requesterResult = await pool.query(
      'SELECT id, name FROM users WHERE id = $1',
      [req.body.requested_by]
    );

    if (requesterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Requester not found' });
    }

    const requester = requesterResult.rows[0];

    // Get project manager details (if assigned, otherwise use requester as PM)
    let projectManager = null;
    if (project.assigned_to) {
      const pmResult = await pool.query(
        'SELECT id, name FROM users WHERE id = $1',
        [project.assigned_to]
      );

      if (pmResult.rows.length === 0) {
        // If PM not found but was assigned, use requester as fallback
        projectManager = requester;
      } else {
        projectManager = pmResult.rows[0];
      }
    } else {
      // If no PM assigned, use the requester as PM
      projectManager = requester;
    }

    // Look up allocated worker details if worker_id was chosen
    let workerId = null;
    let workerName = null;
    if (allocated_to_worker_id) {
      const parsedWorkerId = parseInt(allocated_to_worker_id, 10);
      if (!isNaN(parsedWorkerId)) {
        const workerResult = await pool.query(
          'SELECT id, name FROM users WHERE id = $1',
          [parsedWorkerId]
        );
        if (workerResult.rows.length > 0) {
          workerId = workerResult.rows[0].id;
          workerName = workerResult.rows[0].name;
        }
      }
    }

    // Create store request
    const requestResult = await pool.query(`
      INSERT INTO store_requests
      (project_id, project_name, project_manager_id, project_manager_name, company_id, requested_by, notes, allocated_to_worker_id, allocated_to_worker_name)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
      `, [
      project.id,
      project.name,
      projectManager.id,
      projectManager.name,
      project.company_id,
      req.body.requested_by,
      notes || null,
      workerId,
      workerName
    ]);

    const request = requestResult.rows[0];

    // Add request items
    for (const item of items) {
      // Validate and convert quantity to number
      const quantity = parseFloat(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity for item: ${item.material_name} ` });
      }

      if (!item.material_name || !item.unit) {
        return res.status(400).json({ error: `Missing material_name or unit for item: ${item.material_name || 'unknown'} ` });
      }

      await pool.query(`
        INSERT INTO store_request_items
      (request_id, material_name, quantity, unit, hsn, notes)
    VALUES($1, $2, $3, $4, $5, $6)
      `, [
        request.id,
        item.material_name.trim(),
        quantity,
        item.unit.trim(),
        item.hsn ? item.hsn.trim() : null,
        item.notes ? item.notes.trim() : null
      ]);
    }

    // Get the complete request with items
    const itemsResult = await pool.query(
      'SELECT * FROM store_request_items WHERE request_id = $1 ORDER BY id',
      [request.id]
    );

    // Notify Store Incharge (Role ID 17 or find by role)
    // For now, assuming we notify all store incharge users in the company
    await pool.query(`
      INSERT INTO notifications(user_id, type, title, message, project_id)
      SELECT id, 'stock_request', 'New Stock Request', $1, $2
      FROM users WHERE role = 'store_incharge' AND company_id = $3
      `, [`New stock request for project ${project.name}`, project.id, project.company_id]);

    res.json({
      request: {
        ...request,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Error creating store request:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));

    // Check if it's a table doesn't exist error
    if (error.message && (error.message.includes('does not exist') || error.code === '42P01')) {
      // Try to create tables automatically
      try {
        console.log('Attempting to create missing tables...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS store_requests(
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        project_name VARCHAR(255) NOT NULL,
        project_manager_id INTEGER NOT NULL REFERENCES users(id),
        project_manager_name VARCHAR(255) NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        requested_by INTEGER NOT NULL REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending' CHECK(status IN('pending', 'approved', 'rejected', 'fulfilled')),
        request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        response_date TIMESTAMP,
        responded_by INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS store_request_items(
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES store_requests(id) ON DELETE CASCADE,
        material_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        hsn VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `);
        console.log('Tables created successfully! Retrying request...');
        // Don't retry here, just inform user to try again
        return res.status(500).json({
          error: 'Tables were missing but have been created. Please try your request again.',
          details: error.message
        });
      } catch (createError) {
        console.error('Failed to auto-create tables:', createError);
        return res.status(500).json({
          error: 'Database tables not set up. Please run: node fix-store-tables.js in the backend directory',
          details: error.message
        });
      }
    }

    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get all store requests for a specific project
router.get('/store-requests/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(`
      SELECT sr.*,
      u.name as requested_by_name
      FROM store_requests sr
      LEFT JOIN users u ON sr.requested_by = u.id
      WHERE sr.project_id = $1
      ORDER BY sr.request_date DESC
      `, [projectId]);

    // Get items for each request
    const requestsWithItems = await Promise.all(result.rows.map(async (request) => {
      const itemsResult = await pool.query(
        'SELECT * FROM store_request_items WHERE request_id = $1 ORDER BY id',
        [request.id]
      );
      return {
        ...request,
        items: itemsResult.rows
      };
    }));

    res.json({ requests: requestsWithItems });
  } catch (error) {
    console.error('Error fetching project store requests:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get all store requests for store incharge
router.get('/store-requests/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(`
      SELECT sr.*,
      u.name as requested_by_name
      FROM store_requests sr
      LEFT JOIN users u ON sr.requested_by = u.id
      WHERE sr.company_id = $1
      ORDER BY sr.request_date DESC
      `, [companyId]);

    // Get items for each request
    const requestsWithItems = await Promise.all(result.rows.map(async (request) => {
      const itemsResult = await pool.query(
        'SELECT * FROM store_request_items WHERE request_id = $1 ORDER BY id',
        [request.id]
      );
      return {
        ...request,
        items: itemsResult.rows
      };
    }));

    res.json({ requests: requestsWithItems });
  } catch (error) {
    console.error('Error fetching store requests:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get a specific store request
router.get('/store-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const result = await pool.query(`
      SELECT sr.*,
      u.name as requested_by_name
      FROM store_requests sr
      LEFT JOIN users u ON sr.requested_by = u.id
      WHERE sr.id = $1
      `, [requestId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store request not found' });
    }

    const request = result.rows[0];

    // Get items
    const itemsResult = await pool.query(
      'SELECT * FROM store_request_items WHERE request_id = $1 ORDER BY id',
      [requestId]
    );

    res.json({
      request: {
        ...request,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching store request:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Update store request status
router.put('/store-requests/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, responded_by, notes } = req.body;

    if (!status || !['pending', 'approved', 'rejected', 'fulfilled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const result = await pool.query(`
      UPDATE store_requests
      SET status = $1,
      response_date = CURRENT_TIMESTAMP,
      responded_by = $2,
      notes = COALESCE($3, notes),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    RETURNING *
      `, [status, responded_by || null, notes || null, requestId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store request not found' });
    }

    const request = result.rows[0];

    // Get items
    const itemsResult = await pool.query(
      'SELECT * FROM store_request_items WHERE request_id = $1 ORDER BY id',
      [requestId]
    );

    // Notify Project Manager
    await pool.query(`
      INSERT INTO notifications(user_id, type, title, message, project_id)
    VALUES($1, 'stock_request_update', 'Stock Request Updated', $2, $3)
    `, [request.project_manager_id, `Your stock request for ${request.project_name} has been ${status} `, request.project_id]);

    res.json({
      request: {
        ...request,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Error updating store request status:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get workers by company
router.get('/workers/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE company_id = $1 AND role = $2 ORDER BY name',
      [companyId, 'worker']
    );

    res.json({ workers: result.rows });
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Allocate stock to worker (full allocation)
router.put('/store-requests/:requestId/allocate', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { worker_id, allocated_by, is_partial, item_allocations } = req.body;

    if (!worker_id) {
      return res.status(400).json({ error: 'worker_id is required' });
    }

    // Check if allocation_tasks table exists, if not try to create it
    try {
      await pool.query('SELECT 1 FROM allocation_tasks LIMIT 1');
    } catch (tableError) {
      if (tableError.code === '42P01') { // Table does not exist
        console.log('⚠️  allocation_tasks table does not exist. Attempting to create...');
        try {
          const fs = require('fs');
          const path = require('path');
          const schemaPath = path.join(__dirname, '..', 'database', 'allocation-tasks-schema.sql');

          if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schema);
            console.log('✅ Allocation tables created successfully');
          } else {
            console.error('❌ Schema file not found:', schemaPath);
            return res.status(500).json({
              error: 'Database table not set up',
              details: 'The allocation_tasks table does not exist and could not be created automatically. Please run: cd backend && node setup-allocation-tables.js'
            });
          }
        } catch (createError) {
          console.error('❌ Error creating tables automatically:', createError.message);
          return res.status(500).json({
            error: 'Database table not set up',
            details: 'The allocation_tasks table does not exist. Please run: cd backend && node setup-allocation-tables.js'
          });
        }
      } else {
        throw tableError;
      }
    }

    // Get worker details
    const workerResult = await pool.query(
      'SELECT id, name FROM users WHERE id = $1 AND role = $2',
      [worker_id, 'worker']
    );

    if (workerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const worker = workerResult.rows[0];

    // Get current request and items
    const requestResult = await pool.query(
      'SELECT * FROM store_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Store request not found' });
    }

    const currentRequest = requestResult.rows[0];

    const itemsResult = await pool.query(
      'SELECT * FROM store_request_items WHERE request_id = $1 ORDER BY id',
      [requestId]
    );

    // Prepare allocation items (for QR code generation)
    // Don't update allocated_quantity yet - wait for QR scan confirmation
    const allocationItems = [];
    let itemsToAllocate = [];

    if (is_partial && item_allocations) {
      itemsToAllocate = item_allocations.map(a => {
        const item = itemsResult.rows.find(i => i.id === a.item_id);
        return { ...item, allocated_quantity: a.allocated_quantity };
      });
    } else {
      // Full allocation: Allocate REMAINING quantity
      itemsToAllocate = itemsResult.rows.map(item => {
        const totalQty = parseFloat(item.quantity) || 0;
        const alreadyAllocated = parseFloat(item.allocated_quantity) || 0;
        const remainingToAllocate = Math.max(0, totalQty - alreadyAllocated);
        return { ...item, allocated_quantity: remainingToAllocate };
      }).filter(item => item.allocated_quantity > 0); // Only include items that need allocation
    }

    // Generate unique QR number
    let timestamp = Date.now();
    let random = Math.floor(Math.random() * 10000);
    let qrNumber = `ALLOC${timestamp}${random} `.slice(0, 16);

    // Prepare items for QR code
    for (const item of itemsToAllocate) {
      const qty = parseFloat(item.allocated_quantity) || 0;
      if (qty > 0) {
        allocationItems.push({
          material_name: item.material_name || 'Unknown',
          quantity: qty,
          unit: item.unit || 'pcs',
          hsn: item.hsn || null
        });
      }
    }

    // Validate that we have items to allocate
    if (allocationItems.length === 0) {
      return res.status(400).json({ error: 'No items to allocate. Please select items with quantity > 0' });
    }

    // Create QR code data
    const workerName = worker.name || 'Unknown Worker';
    let qrCodeData = JSON.stringify({
      type: 'allocation_task',
      qr_number: qrNumber,
      store_request_id: requestId,
      worker_id: worker.id,
      worker_name: workerName,
      project_name: currentRequest.project_name || 'N/A',
      items: allocationItems,
      created_at: new Date().toISOString()
    });

    // Create allocation task (status will be 'pending' until QR is scanned)
    // Use a transaction to ensure data consistency
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if QR number already exists (should be unique)
      const existingQR = await client.query(
        'SELECT id FROM allocation_tasks WHERE qr_number = $1',
        [qrNumber]
      );

      if (existingQR.rows.length > 0) {
        // Generate a new QR number if duplicate
        timestamp = Date.now();
        random = Math.floor(Math.random() * 10000);
        qrNumber = `ALLOC${timestamp}${random} `.slice(0, 16);
        // Update qrCodeData with new QR number
        qrCodeData = JSON.stringify({
          type: 'allocation_task',
          qr_number: qrNumber,
          store_request_id: requestId,
          worker_id: worker.id,
          worker_name: workerName,
          project_name: currentRequest.project_name || 'N/A',
          items: allocationItems,
          created_at: new Date().toISOString()
        });
      }

      const taskResult = await client.query(`
        INSERT INTO allocation_tasks
      (store_request_id, worker_id, worker_name, allocation_qr_code, qr_number, allocated_items, status, created_by)
    VALUES($1, $2, $3, $4, $5, $6, 'pending', $7)
    RETURNING *
      `, [
        requestId,
        worker.id,
        workerName,
        qrCodeData,
        qrNumber,
        JSON.stringify(allocationItems),
        allocated_by || null
      ]);

      const allocationTask = taskResult.rows[0];

      // FEFO: Update inventory immediately by deducting from barcodes (nearest expiry first)
      // Create a map to store exp/mfg dates for each item
      const itemDatesMap = {};

      console.log('DEBUG: allocationItems:', JSON.stringify(allocationItems, null, 2));

      for (const item of allocationItems) {
        const materialName = item.material_name;
        console.log(`DEBUG: Processing item: ${materialName}, HSN: ${item.hsn} `);
        const requiredQty = parseFloat(item.quantity) || 0;
        let remainingQty = requiredQty;
        itemDatesMap[materialName] = { exp_date: null, mfg_date: null };

        // Find barcodes matching this material, sorted by expiry date (FEFO)
        const barcodesResult = await client.query(`
          SELECT id, barcode_data, exp_date, mfg_date, item_name, qr_number
          FROM barcodes
          WHERE company_id = $1 AND hsn = $2
          ORDER BY exp_date ASC
        `, [currentRequest.company_id, item.hsn]);

        // Track exp/mfg dates for this item (from first barcode used)
        let itemExpDate = null;
        let itemMfgDate = null;

        // Deduct from barcodes using FEFO (First Expiry First Out)
        for (const barcode of barcodesResult.rows) {
          if (remainingQty <= 0) break;

          // Parse barcode_data to get quantity
          let barcodeQty = 0;
          try {
            const barcodeDataStr = barcode.barcode_data;
            // Try to extract quantity from JSON in barcode_data
            const jsonMatch = barcodeDataStr.match(/JSON Data: ({.*?})/);
            if (jsonMatch) {
              const barcodeJson = JSON.parse(jsonMatch[1]);
              barcodeQty = parseFloat(barcodeJson.quantity) || 0;
            } else {
              // Fallback: try parsing entire barcode_data as JSON
              const barcodeJson = JSON.parse(barcodeDataStr);
              barcodeQty = parseFloat(barcodeJson.quantity) || 0;
            }
          } catch (e) {
            console.warn(`Could not parse quantity from barcode ${barcode.id}: `, e.message);
            continue; // Skip this barcode if we can't parse quantity
          }

          if (barcodeQty <= 0) continue;

          // Calculate how much to deduct from this barcode
          const deductQty = Math.min(remainingQty, barcodeQty);
          const newBarcodeQty = barcodeQty - deductQty;

          // Store barcode allocation details for later confirmation
          if (!itemDatesMap[materialName].barcode_allocations) {
            itemDatesMap[materialName].barcode_allocations = [];
          }
          itemDatesMap[materialName].barcode_allocations.push({
            barcode_id: barcode.id,
            quantity: deductQty,
            barcode_data: barcode.barcode_data // Store original data to update later
          });

          // Store exp/mfg dates from first barcode used (FEFO - nearest expiry)
          if (!itemDatesMap[materialName].exp_date && barcode.exp_date) {
            itemDatesMap[materialName].exp_date = barcode.exp_date;
          }
          if (!itemDatesMap[materialName].mfg_date && barcode.mfg_date) {
            itemDatesMap[materialName].mfg_date = barcode.mfg_date;
          }
          // Store QR code from first barcode used
          if (!itemDatesMap[materialName].qr_code && barcode.qr_number) {
            itemDatesMap[materialName].qr_code = barcode.qr_number;
          }

          remainingQty -= deductQty;
        }

        // Add exp/mfg dates to the allocation item (from first barcode used - FEFO)
        const itemIndex = allocationItems.findIndex(ai => ai.material_name === materialName);
        if (itemIndex >= 0 && itemDatesMap[materialName]) {
          allocationItems[itemIndex].exp_date = itemDatesMap[materialName].exp_date;
          allocationItems[itemIndex].mfg_date = itemDatesMap[materialName].mfg_date;
          allocationItems[itemIndex].qr_code = itemDatesMap[materialName].qr_code;
          allocationItems[itemIndex].barcode_allocations = itemDatesMap[materialName].barcode_allocations;
        }
      }

      // Update allocation_tasks with enriched items (including QR codes and barcode allocations)
      // Re-generate QR code data with enriched items, BUT keep it minimal for QR size limits
      // The full details are stored in the database and can be fetched using the ID/QR Number
      const updatedQrCodeData = JSON.stringify({
        type: 'allocation_task',
        qr_number: qrNumber,
        id: allocationTask.id,
        worker_id: worker.id
      });

      await client.query(`
        UPDATE allocation_tasks
        SET allocated_items = $1, allocation_qr_code = $2
        WHERE id = $3
      `, [JSON.stringify(allocationItems), updatedQrCodeData, allocationTask.id]);

      // Update returned task object
      allocationTask.allocated_items = allocationItems;
      allocationTask.allocation_qr_code = updatedQrCodeData;

      // Notify Worker
      await client.query(`
        INSERT INTO notifications(user_id, type, title, message, project_id)
    VALUES($1, 'allocation', 'Stock Allocated', $2, $3)
      `, [worker.id, `Stock allocated for project ${currentRequest.project_name || 'N/A'}.Please scan QR to confirm.`, currentRequest.project_id]);

      await client.query('COMMIT');
      res.json({
        message: 'Allocation QR generated. Please scan to confirm.',
        allocation_status: 'pending_scan',
        allocation_task: allocationTask,
        items_allocated_info: allocationItems,
        request: currentRequest
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError; // Re-throw to be caught by outer catch
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error allocating stock:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({
      error: 'Server error',
      details: error.message,
      hint: error.hint || 'Check server logs for more details'
    });
  }
});

// Get allocation tasks by company
router.get('/allocation-tasks/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(`
      SELECT at.*,
      sr.project_name,
      sr.project_manager_name
      FROM allocation_tasks at
      LEFT JOIN store_requests sr ON at.store_request_id = sr.id
      WHERE sr.company_id = $1
      ORDER BY at.created_at DESC
      `, [companyId]);

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching company allocation tasks:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get projects assigned to a worker
router.get('/worker/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const result = await pool.query(`
      SELECT DISTINCT p.*, 
      (SELECT COUNT(*)::int FROM store_requests sr 
       JOIN allocation_tasks at ON sr.id = at.store_request_id
       WHERE sr.project_id = p.id AND at.worker_id = $1 AND at.status = 'pending') as pending_collections_count
      FROM projects p
      JOIN project_workers pw ON p.id = pw.project_id
      WHERE pw.worker_id = $1
      ORDER BY p.created_at DESC
    `, [workerId]);
    
    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Error fetching worker projects:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get worker tasks (allocations assigned to worker)
router.get('/allocation-tasks/worker/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;

    const result = await pool.query(`
      SELECT at.*,
      sr.project_name,
      sr.project_manager_name,
      sr.project_id
      FROM allocation_tasks at
      LEFT JOIN store_requests sr ON at.store_request_id = sr.id
      WHERE at.worker_id = $1
      ORDER BY at.created_at DESC
      `, [workerId]);

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching worker tasks:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get allocation task by QR number
router.get('/allocation-tasks/qr/:qrNumber', async (req, res) => {
  try {
    const { qrNumber } = req.params;

    const result = await pool.query(`
      SELECT at.*,
      sr.project_name,
      sr.project_manager_name,
      sr.company_id
      FROM allocation_tasks at
      LEFT JOIN store_requests sr ON at.store_request_id = sr.id
      WHERE at.qr_number = $1
      `, [qrNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Allocation task not found' });
    }

    const task = result.rows[0];

    res.json({
      task: task
    });
  } catch (error) {
    console.error('Error fetching allocation task:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Confirm allocation (when store incharge scans QR code)
router.put('/allocation-tasks/:taskId/confirm', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { taskId } = req.params;
    const { confirmed_by } = req.body;

    // Get task
    const taskResult = await client.query(
      'SELECT * FROM allocation_tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Allocation task not found' });
    }

    const task = taskResult.rows[0];

    if (task.worker_id !== parseInt(confirmed_by, 10)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Validation failed: You are not the worker assigned to collect these items.' });
    }

    if (task.status === 'confirmed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Task already confirmed' });
    }

    // Parse allocated items
    const allocatedItems = typeof task.allocated_items === 'string'
      ? JSON.parse(task.allocated_items)
      : task.allocated_items;

    // Update store_request_items allocated_quantity and deduct from inventory/barcodes
    for (const item of allocatedItems) {
      // 1. Update store_request_items
      const itemResult = await client.query(`
        SELECT sri.* FROM store_request_items sri
        JOIN store_requests sr ON sri.request_id = sr.id
        WHERE sr.id = $1 AND sri.material_name = $2
        LIMIT 1
      `, [task.store_request_id, item.material_name]);

      if (itemResult.rows.length > 0) {
        const requestItem = itemResult.rows[0];
        const currentAllocated = parseFloat(requestItem.allocated_quantity) || 0;
        const newAllocated = currentAllocated + parseFloat(item.quantity);

        await client.query(`
          UPDATE store_request_items
          SET allocated_quantity = $1
          WHERE id = $2
      `, [newAllocated, requestItem.id]);
      }

      // 2. Deduct from Inventory (Aggregated)
      const inventoryItem = await client.query(`
        SELECT id, quantity FROM inventory
        WHERE company_id = (SELECT company_id FROM store_requests WHERE id = $1)
        AND hsn = $2
  `, [task.store_request_id, item.hsn]);

      if (inventoryItem.rows.length > 0) {
        const currentInvQty = parseFloat(inventoryItem.rows[0].quantity) || 0;
        const deductQty = parseFloat(item.quantity);
        const newInvQty = Math.max(0, currentInvQty - deductQty);

        await client.query(`
          UPDATE inventory
          SET quantity = $1, last_updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
  `, [newInvQty, inventoryItem.rows[0].id]);
      }

      // 3. Deduct from Barcodes (using stored barcode_allocations)
      if (item.barcode_allocations && Array.isArray(item.barcode_allocations)) {
        for (const allocation of item.barcode_allocations) {
          // Fetch current barcode data to ensure we have latest state
          const barcodeResult = await client.query(
            'SELECT barcode_data FROM barcodes WHERE id = $1',
            [allocation.barcode_id]
          );

          if (barcodeResult.rows.length > 0) {
            let updatedBarcodeData = barcodeResult.rows[0].barcode_data;
            const deductQty = parseFloat(allocation.quantity);

            // Update JSON in barcode_data
            try {
              const jsonMatch = updatedBarcodeData.match(/JSON Data: ({.*?})/);
              if (jsonMatch) {
                const barcodeJson = JSON.parse(jsonMatch[1]);
                const currentQty = parseFloat(barcodeJson.quantity) || 0;
                barcodeJson.quantity = Math.max(0, currentQty - deductQty);

                updatedBarcodeData = updatedBarcodeData.replace(
                  /JSON Data: {.*?}/,
                  `JSON Data: ${JSON.stringify(barcodeJson)} `
                );
                // Also update the quantity line if it exists
                updatedBarcodeData = updatedBarcodeData.replace(
                  /Quantity: \d+/,
                  `Quantity: ${barcodeJson.quantity} `
                );
              } else {
                // Fallback
                const barcodeJson = JSON.parse(updatedBarcodeData);
                const currentQty = parseFloat(barcodeJson.quantity) || 0;
                barcodeJson.quantity = Math.max(0, currentQty - deductQty);
                updatedBarcodeData = JSON.stringify(barcodeJson);
              }

              // Update barcode
              await client.query(`
                UPDATE barcodes
                SET barcode_data = $1
                WHERE id = $2
  `, [updatedBarcodeData, allocation.barcode_id]);

              // Create allocation_inventory_mapping entry
              await client.query(`
                INSERT INTO allocation_inventory_mapping(allocation_task_id, barcode_id, allocated_quantity)
VALUES($1, $2, $3)
              `, [taskId, allocation.barcode_id, deductQty]);

            } catch (e) {
              console.error(`Error updating barcode ${allocation.barcode_id} during confirmation: `, e);
            }
          }
        }
      }
    }

    // Update task status
    await client.query(`
      UPDATE allocation_tasks
      SET status = 'confirmed',
  confirmed_at = CURRENT_TIMESTAMP,
  confirmed_by = $1
      WHERE id = $2
  `, [confirmed_by, taskId]);

    // Check if all items in the request are fully allocated
    const requestItemsResult = await client.query(`
SELECT * FROM store_request_items
      WHERE request_id = $1
  `, [task.store_request_id]);

    let allFullyAllocated = true;
    let anyPartiallyAllocated = false;

    for (const item of requestItemsResult.rows) {
      const totalQty = parseFloat(item.quantity) || 0;
      const allocatedQty = parseFloat(item.allocated_quantity) || 0;
      if (allocatedQty < totalQty) {
        allFullyAllocated = false;
        if (allocatedQty > 0) {
          anyPartiallyAllocated = true;
        }
      }
    }

    // Update store request status
    let newStatus = 'partially_allocated';
    if (allFullyAllocated) {
      newStatus = 'fulfilled';
    } else if (anyPartiallyAllocated) {
      newStatus = 'partially_allocated';
    }

    await client.query(`
      UPDATE store_requests
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newStatus, task.store_request_id]);

    // Notify Project Manager
    const requestResult = await client.query(
      'SELECT project_manager_id, project_name, project_id FROM store_requests WHERE id = $1',
      [task.store_request_id]
    );
    if (requestResult.rows.length > 0) {
      const pmId = requestResult.rows[0].project_manager_id;
      const projectName = requestResult.rows[0].project_name;
      const projectId = requestResult.rows[0].project_id;
      if (pmId) {
        await client.query(`
          INSERT INTO notifications(user_id, type, title, message, project_id)
          VALUES($1, 'collection', 'Materials Collected', $2, $3)
        `, [
          pmId,
          `Worker ${task.worker_name} has successfully collected items for project "${projectName}".`,
          projectId
        ]);
      }
    }

    await client.query('COMMIT');

    // Get updated task
    const updatedTaskResult = await client.query(
      'SELECT * FROM allocation_tasks WHERE id = $1',
      [taskId]
    );

    res.json({
      task: updatedTaskResult.rows[0],
      message: 'Allocation confirmed successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming allocation:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  } finally {
    client.release();
  }
});

// Send material usage report to accounts
router.post('/material-usage', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if table exists, create if not
    await client.query(`
      CREATE TABLE IF NOT EXISTS material_usage_reports(
    id SERIAL PRIMARY KEY,
    project_id INTEGER,
    project_name VARCHAR(255),
    sent_by INTEGER NOT NULL,
    sent_by_name VARCHAR(255),
    accountant_id INTEGER NOT NULL,
    accountant_name VARCHAR(255),
    materials JSONB NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK(status IN('pending', 'reviewed', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sent_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(accountant_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

    const {
      project_id,
      project_name,
      sent_by,
      sent_by_name,
      accountant_id,
      materials,
      notes
    } = req.body;

    if (!project_id || !sent_by || !accountant_id || !materials || !Array.isArray(materials) || materials.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields: project_id, sent_by, accountant_id, and materials array' });
    }

    // Verify accountant exists
    const accountantResult = await client.query('SELECT id, name, email FROM users WHERE id = $1 AND role = $2', [accountant_id, 'accountant']);
    if (accountantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Accountant not found' });
    }

    // Fetch unit prices from materials_detail for each material
    const materialsWithPrices = await Promise.all(materials.map(async (material) => {
      let unitPrice = 0;
      let gstRate = 18; // Default GST rate
      let hsn = null; // HSN code

      if (material.material_name) {
        try {
          // Get user's company_id first
          const userResult = await client.query('SELECT company_id FROM users WHERE id = $1', [sent_by]);
          const companyId = userResult.rows[0]?.company_id;

          if (companyId) {
            // Try to find material in materials_detail by item_name
            const materialResult = await client.query(`
              SELECT unit_price, hsn 
              FROM materials_detail 
              WHERE company_id = $1 
              AND LOWER(REPLACE(item_name, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
              ORDER BY created_at DESC
              LIMIT 1
  `, [companyId, material.material_name]);

            if (materialResult.rows.length > 0) {
              unitPrice = parseFloat(materialResult.rows[0].unit_price) || 0;
              hsn = materialResult.rows[0].hsn || null;
            }
          }
        } catch (err) {
          console.error('Error fetching material price:', err);
        }
      }

      const quantity = parseFloat(material.quantity_used) || 0;
      const basePrice = unitPrice * quantity;
      const gstAmount = (basePrice * gstRate) / 100;
      const totalPrice = basePrice + gstAmount;

      return {
        ...material,
        unit_price: unitPrice,
        hsn: hsn,
        gst_rate: gstRate,
        base_price: basePrice,
        gst_amount: gstAmount,
        total_price: totalPrice
      };
    }));

    // Create material usage report
    const usageResult = await client.query(`
      INSERT INTO material_usage_reports
  (project_id, project_name, sent_by, sent_by_name, accountant_id, accountant_name, materials, notes, status, created_at)
VALUES($1, $2, $3, $4, $5, $6, $7, $8, 'pending', CURRENT_TIMESTAMP)
RETURNING *
  `, [
      project_id,
      project_name,
      sent_by,
      sent_by_name,
      accountant_id,
      accountantResult.rows[0].name,
      JSON.stringify(materialsWithPrices),
      notes
    ]);

    await client.query('COMMIT');

    const usageReport = usageResult.rows[0];

    // Create notification for accountant
    try {
      await client.query(`
        INSERT INTO notifications
  (user_id, type, title, message, related_id, created_at)
VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        accountant_id,
        'material_usage_received',
        'Material Usage Report Received',
        `${sent_by_name || 'Project Manager'} sent a material usage report for project: ${project_name || 'N/A'} `,
        usageReport.id
      ]);
    } catch (notifError) {
      console.error('Error creating notification (non-critical):', notifError);
      // Continue even if notification fails
    }

    await client.query('COMMIT');

    res.json({
      message: 'Material usage report sent to accounts successfully',
      report: usageReport
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating material usage report:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Server error', details: error.message });
  } finally {
    client.release();
  }
});

// Get material usage reports for accountant
router.get('/material-usage/accountant/:accountantId', async (req, res) => {
  try {
    const { accountantId } = req.params;

    // Get accountant's company_id
    const accountantResult = await pool.query('SELECT company_id FROM users WHERE id = $1', [accountantId]);
    if (accountantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Accountant not found' });
    }
    const companyId = accountantResult.rows[0].company_id;

    let allReports = [];

    // 1. Fetch Store Requests (as fallback/supplement)
    try {
      // Check if store_requests table exists
      const srTableCheck = await pool.query(`
        SELECT EXISTS(
  SELECT FROM information_schema.tables 
          WHERE table_name = 'store_requests'
);
`);

      if (srTableCheck.rows[0].exists) {
        const storeRequestsResult = await pool.query(`
          SELECT sr.*, u.name as requester_name 
          FROM store_requests sr
          LEFT JOIN users u ON sr.requested_by = u.id
          WHERE sr.company_id = $1
          ORDER BY sr.request_date DESC
        `, [companyId]);

        const storeRequests = await Promise.all(storeRequestsResult.rows.map(async (sr) => {
          const itemsRes = await pool.query('SELECT * FROM store_request_items WHERE request_id = $1', [sr.id]);
          const materials = itemsRes.rows.map(item => ({
            material_name: item.material_name,
            quantity_used: item.quantity, // Show requested quantity
            unit: item.unit,
            hsn: item.hsn,
            base_price: 0,
            gst_amount: 0,
            total_price: 0,
            notes: `Allocated: ${item.allocated_quantity || 0} `
          }));

          return {
            id: `req_${sr.id} `, // String ID to distinguish
            project_id: sr.project_id,
            project_name: sr.project_name,
            sent_by: sr.requested_by,
            sent_by_name: sr.requester_name || sr.project_manager_name,
            accountant_id: null,
            materials: materials,
            notes: `Store Request(${sr.status}) - ${sr.notes || ''} `,
            created_at: sr.request_date,
            totals: { base_price: 0, gst_amount: 0, total_price: 0 },
            is_store_request: true
          };
        }));
        allReports = [...allReports, ...storeRequests];
      }
    } catch (err) {
      console.error('Error fetching store requests for reports:', err);
    }

    // 2. Fetch Material Usage Reports
    const tableCheck = await pool.query(`
      SELECT EXISTS(
  SELECT FROM information_schema.tables 
        WHERE table_name = 'material_usage_reports'
);
`);

    if (tableCheck.rows[0].exists) {
      // Fetch all reports where the sender belongs to the same company
      // OR where the accountant_id matches (for backward compatibility)
      const result = await pool.query(`
        SELECT mur.*
  FROM material_usage_reports mur
        JOIN users u ON mur.sent_by = u.id
        WHERE u.company_id = $1 OR mur.accountant_id = $2
        ORDER BY mur.created_at DESC
  `, [companyId, accountantId]);

      // Parse materials JSON and calculate totals
      const reports = result.rows.map(report => {
        const materials = typeof report.materials === 'string'
          ? JSON.parse(report.materials)
          : report.materials;

        const totalBasePrice = materials.reduce((sum, m) => sum + (parseFloat(m.base_price) || 0), 0);
        const totalGstAmount = materials.reduce((sum, m) => sum + (parseFloat(m.gst_amount) || 0), 0);
        const totalPrice = materials.reduce((sum, m) => sum + (parseFloat(m.total_price) || 0), 0);

        return {
          ...report,
          materials: materials,
          totals: {
            base_price: totalBasePrice,
            gst_amount: totalGstAmount,
            total_price: totalPrice
          },
          is_store_request: false
        };
      });
      allReports = [...allReports, ...reports];
    }

    // Sort combined reports by date descending
    allReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ reports: allReports });
  } catch (error) {
    console.error('Error fetching material usage reports:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Check stock availability for materials
router.post('/check-stock', async (req, res) => {
  try {
    const { company_id, materials } = req.body; // materials is array of { material_name, unit }

    if (!company_id || !materials || !Array.isArray(materials)) {
      return res.status(400).json({ error: 'Missing company_id or materials array' });
    }

    const stockInfo = [];

    for (const material of materials) {
      const materialName = material.material_name;
      const materialUnit = material.unit || 'pcs';

      try {
        // Query the dedicated inventory table for the most accurate current stock levels
        const inventoryResult = await pool.query(`
          SELECT quantity, unit, item_name
          FROM inventory
          WHERE company_id = $1 AND LOWER(TRIM(item_name)) = LOWER(TRIM($2))
        `, [company_id, materialName]);

        let totalStock = 0;
        let unit = materialUnit;

        if (inventoryResult.rows.length > 0) {
          totalStock = parseFloat(inventoryResult.rows[0].quantity) || 0;
          unit = inventoryResult.rows[0].unit || materialUnit;
        }

        stockInfo.push({
          material_name: materialName,
          unit: unit,
          available_quantity: totalStock,
          in_stock: totalStock > 0
        });
      } catch (error) {
        console.error(`Error checking inventory for ${materialName}:`, error);
        stockInfo.push({
          material_name: materialName,
          unit: materialUnit,
          available_quantity: 0,
          in_stock: false
        });
      }
    }

    res.json({ stock_info: stockInfo });
  } catch (error) {
    console.error('Error checking stock:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});



// ==================== NOTIFICATION ROUTES ====================

// Get notifications for a user
router.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Create notifications table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

    const result = await pool.query(`
SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC
  `, [userId]);

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await pool.query(`
      UPDATE notifications 
      SET read = TRUE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
RETURNING *
  `, [notificationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification: result.rows[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// ==================== REQUIREMENTS ROUTES ====================

// Create requirement (send to accountant)
router.post('/requirements', async (req, res) => {
  try {
    const { title, priority, items, created_by, sent_to, project_id } = req.body;

    if (!title || !items || !Array.isArray(items) || items.length === 0 || !created_by || !sent_to) {
      return res.status(400).json({ error: 'Missing required fields: title, items, created_by, sent_to' });
    }

    // Create requirements table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requirements(
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sent_to INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

    // Create requirement_items table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requirement_items(
  id SERIAL PRIMARY KEY,
  requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  serial_number INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  quantity VARCHAR(100),
  hsn VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

    // Insert requirement
    const requirementResult = await pool.query(`
      INSERT INTO requirements(title, priority, created_by, sent_to, project_id, status)
VALUES($1, $2, $3, $4, $5, 'pending')
RETURNING *
  `, [title, priority, created_by, sent_to, project_id]);

    const requirement = requirementResult.rows[0];

    // Insert requirement items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await pool.query(`
        INSERT INTO requirement_items(requirement_id, serial_number, item_name, quantity, hsn)
VALUES($1, $2, $3, $4, $5)
  `, [requirement.id, i + 1, item.item_name, item.quantity, item.hsn]);
    }

    // Notify Accountant
    await pool.query(`
      INSERT INTO notifications(user_id, type, title, message, project_id)
VALUES($1, 'requirement_received', 'New Requirement Received', $2, $3)
    `, [sent_to, `New requirement "${title}" received.`, project_id]);

    // Create notifications table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

    // Create notification for accountant
    try {
      await pool.query(
        `INSERT INTO notifications(user_id, title, message, project_id)
VALUES($1, $2, $3, $4)`,
        [
          sent_to,
          'New Requirements Received',
          `You have received new requirements: ${title} `,
          project_id || null
        ]
      );
    } catch (notifError) {
      console.error('Error sending notification for requirement:', notifError);
    }

    res.status(201).json({ requirement, message: 'Requirement sent successfully' });
  } catch (error) {
    console.error('Error creating requirement:', error);
    console.error('FULL ERROR OBJECT:', JSON.stringify(error, null, 2));
    // Force reload for debug
    res.status(500).json({ error: 'Server error', details: error.message, fullError: error });
  }
});

// Update requirement status (by accountant)
router.put('/requirements/:requirementId/status', async (req, res) => {
  try {
    const { requirementId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await pool.query(
      'UPDATE requirements SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, requirementId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    const requirement = result.rows[0];
    console.log('Requirement status updated:', requirement);
    console.log('Attempting to send notification to user:', requirement.created_by);

    // Notify the NPD user who created the requirement
    try {
      const notifResult = await pool.query(
        `INSERT INTO notifications(user_id, title, message, project_id)
VALUES($1, $2, $3, $4) RETURNING * `,
        [
          requirement.created_by,
          `Requirement ${status === 'approved' ? 'Approved' : 'Rejected'} `,
          `Your requirement "${requirement.title}" has been ${status}.`,
          requirement.project_id || null
        ]
      );
      console.log('Notification sent successfully:', notifResult.rows[0]);
    } catch (notifError) {
      console.error('Error sending notification for requirement status update:', notifError);
    }

    res.json({ requirement });
  } catch (error) {
    console.error('Error updating requirement status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEBUG: Get all notifications to verify insertion
router.get('/debug/all-notifications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Get all users to verify IDs
router.get('/debug/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Get requirement details to verify created_by
router.get('/debug/requirements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM requirements WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==================== ATTENDANCE ROUTES ====================

// Get attendance records for a company (optionally filtered by date)
router.get('/attendance/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { date } = req.query; // Optional: YYYY-MM-DD format

    let query = `
      SELECT 
        a.id,
        a.user_id,
        a.login_time,
        a.logout_time,
        a.date,
        u.name as employee_name,
        u.email as employee_email,
        u.role as employee_role
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.company_id = $1
    `;
    const params = [companyId];

    if (date) {
      query += ` AND a.date = $2`;
      params.push(date);
    }

    query += ` ORDER BY a.date DESC, a.login_time DESC`;

    const result = await pool.query(query, params);
    res.json({ attendance: result.rows });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET project workers
router.get('/:projectId/workers', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(`
      SELECT pw.*, u.name, u.email
      FROM project_workers pw
      JOIN users u ON pw.worker_id = u.id
      WHERE pw.project_id = $1
      ORDER BY u.name
    `, [projectId]);
    res.json({ workers: result.rows });
  } catch (error) {
    console.error('Error fetching project workers:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// ADD worker to project
router.post('/:projectId/workers', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { workerId } = req.body;
    if (!workerId) {
      return res.status(400).json({ error: 'workerId is required' });
    }
    await pool.query(`
      INSERT INTO project_workers (project_id, worker_id)
      VALUES ($1, $2)
      ON CONFLICT (project_id, worker_id) DO NOTHING
    `, [projectId, workerId]);
    res.json({ success: true, message: 'Worker added to project' });
  } catch (error) {
    console.error('Error adding project worker:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// REMOVE worker from project
router.delete('/:projectId/workers/:workerId', async (req, res) => {
  try {
    const { projectId, workerId } = req.params;
    await pool.query(`
      DELETE FROM project_workers
      WHERE project_id = $1 AND worker_id = $2
    `, [projectId, workerId]);
    res.json({ success: true, message: 'Worker removed from project' });
  } catch (error) {
    console.error('Error removing project worker:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Reports Upload Configuration
const reportsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'report-' + Date.now() + path.extname(file.originalname));
  }
});

const reportsUpload = multer({ 
  storage: reportsStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Upload internal report
router.post('/:projectId/internal-reports', authenticateToken, reportsUpload.single('report'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { phase_name, report_index } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!phase_name || !report_index) {
      return res.status(400).json({ error: 'phase_name and report_index are required' });
    }

    const fileName = req.file.originalname;
    const filePath = `/uploads/${req.file.filename}`;

    // Insert or update report
    const query = `
      INSERT INTO project_internal_reports (project_id, phase_name, report_index, file_name, file_path, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (project_id, phase_name, report_index) 
      DO UPDATE SET 
        file_name = EXCLUDED.file_name,
        file_path = EXCLUDED.file_path,
        uploaded_by = EXCLUDED.uploaded_by,
        uploaded_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      projectId,
      phase_name,
      parseInt(report_index),
      fileName,
      filePath,
      userId
    ]);

    res.json({ success: true, report: result.rows[0] });
  } catch (error) {
    console.error('Error uploading internal report:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get all internal reports for a project
router.get('/:projectId/internal-reports', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(`
      SELECT pir.*, u.name as uploaded_by_name
      FROM project_internal_reports pir
      LEFT JOIN users u ON pir.uploaded_by = u.id
      WHERE pir.project_id = $1
      ORDER BY pir.phase_name, pir.report_index
    `, [parseInt(projectId)]);
    res.json({ reports: result.rows });
  } catch (error) {
    console.error('Error fetching internal reports:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// --- JOB WORK SECTION ---

const jobWorkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'jobwork-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const jobWorkUpload = multer({ 
  storage: jobWorkStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Submit a new Job Work Request (Project Manager)
router.post('/job-work/submit', authenticateToken, jobWorkUpload.array('images', 10), async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      project_id, 
      job_work_type, 
      purpose, 
      loaded_vehicle_weight, 
      unloaded_vehicle_weight, 
      actual_vehicle_weight, 
      store_incharge_id,
      vehicle_no,
      items
    } = req.body;

    if (!project_id || !job_work_type || !loaded_vehicle_weight || !unloaded_vehicle_weight || !store_incharge_id) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const itemsList = JSON.parse(items || '[]');

    await client.query('BEGIN');

    // Generate unique Job ID: JW-YYYY-XXXX
    const year = new Date().getFullYear();
    const countRes = await client.query(`
      SELECT COUNT(*) FROM job_work_requests 
      WHERE job_id LIKE $1
    `, [`JW-${year}-%`]);
    const nextIndex = parseInt(countRes.rows[0].count) + 1;
    const paddedIndex = String(nextIndex).padStart(4, '0');
    const jobId = `JW-${year}-${paddedIndex}`;

    // Insert request without accountant_id (will be set when Store Incharge uploads challan)
    const requestInsert = await client.query(`
      INSERT INTO job_work_requests (
        job_id, project_id, company_id, job_work_type, purpose, 
        loaded_vehicle_weight, unloaded_vehicle_weight, actual_vehicle_weight, 
        store_incharge_id, vehicle_no, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      jobId,
      parseInt(project_id),
      req.user.company_id,
      job_work_type,
      purpose || null,
      parseFloat(loaded_vehicle_weight),
      parseFloat(unloaded_vehicle_weight),
      parseFloat(actual_vehicle_weight),
      parseInt(store_incharge_id),
      vehicle_no || null,
      req.user.id
    ]);

    const jobWorkId = requestInsert.rows[0].id;

    // Insert items
    for (const item of itemsList) {
      await client.query(`
        INSERT INTO job_work_items (job_work_id, material_name, hsn, quantity, unit)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        jobWorkId,
        item.material_name,
        item.hsn || null,
        parseFloat(item.quantity),
        item.unit
      ]);
    }

    // Insert images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = file.originalname;
        const filePath = `/uploads/${file.filename}`;
        await client.query(`
          INSERT INTO job_work_images (job_work_id, file_path, file_name)
          VALUES ($1, $2, $3)
        `, [jobWorkId, filePath, fileName]);
      }
    }

    // Automatically record a Status History log for the Project
    const notes = `Dispatched for Job Work (${job_work_type}) under Job ID ${jobId}`;
    await client.query(`
      INSERT INTO project_status_history (project_id, old_status, new_status, changed_by, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      parseInt(project_id),
      'Fabrication', // previous step in flow
      'Job Work',
      req.user.id,
      notes
    ]);

    await client.query('COMMIT');
    res.json({ success: true, jobWorkId, jobId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting job work:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  } finally {
    client.release();
  }
});

// Fetch all Job Work Requests for a Company (External Job Works only)
router.get('/job-work/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Get all external_job_work projects for this company
    const requestsRes = await pool.query(`
      SELECT 
        p.id,
        p.name as project_name,
        p.po_number as poen_number,
        p.project_type,
        p.description,
        p.status,
        p.po_number,
        p.created_at,
        p.created_by
      FROM projects p
      WHERE p.company_id = $1 AND p.project_type = 'external_job_work'
      ORDER BY p.created_at DESC
    `, [parseInt(companyId)]);

    const requests = requestsRes.rows;
    res.json({ requests });
  } catch (error) {
    console.error('Error fetching job work list:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Fetch Job Work Requests assigned to a specific Store Incharge
router.get('/job-work/store-incharge/:storeInchargeId', authenticateToken, async (req, res) => {
  try {
    const { storeInchargeId } = req.params;

    const requestsRes = await pool.query(`
      SELECT jwr.*, 
             p.name as project_name, 
             uc.name as creator_name, 
             usi.name as store_incharge_name,
             ua.name as accountant_name
      FROM job_work_requests jwr
      LEFT JOIN projects p ON jwr.project_id = p.id
      LEFT JOIN users uc ON jwr.created_by = uc.id
      LEFT JOIN users usi ON jwr.store_incharge_id = usi.id
      LEFT JOIN users ua ON jwr.accountant_id = ua.id
      WHERE jwr.company_id = $1 AND jwr.store_incharge_id = $2
      ORDER BY jwr.created_at DESC
    `, [req.user.company_id, parseInt(storeInchargeId)]);

    const requests = requestsRes.rows;

    // Fetch items and images for each request
    for (const reqObj of requests) {
      const itemsRes = await pool.query(`
        SELECT * FROM job_work_items WHERE job_work_id = $1
      `, [reqObj.id]);
      reqObj.items = itemsRes.rows;

      const imagesRes = await pool.query(`
        SELECT * FROM job_work_images WHERE job_work_id = $1
      `, [reqObj.id]);
      reqObj.images = imagesRes.rows;
    }

    res.json({ requests });
  } catch (error) {
    console.error('Error fetching store incharge job work list:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Accountant Upload Challan & Send to Vendor
router.put('/job-work/:id/challan', authenticateToken, jobWorkUpload.single('challan'), async (req, res) => {
  const { id } = req.params;
  const { vendor_email, accountant_id } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No challan file uploaded' });
  }

  const fileName = req.file.originalname;
  const filePath = `/uploads/${req.file.filename}`;

  try {
    const updateRes = await pool.query(`
      UPDATE job_work_requests
      SET challan_file_name = $1,
          challan_file_path = $2,
          vendor_email = $3,
          accountant_id = $4,
          status = 'challan_uploaded'
      WHERE id = $5
      RETURNING *
    `, [fileName, filePath, vendor_email || null, accountant_id ? parseInt(accountant_id) : null, parseInt(id)]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job work request not found' });
    }

    const jobDetails = updateRes.rows[0];

    const itemsRes = await pool.query(`
      SELECT * FROM job_work_items WHERE job_work_id = $1
    `, [jobDetails.id]);

    const items = itemsRes.rows;

    if (vendor_email) {
      try {
        await sendJobWorkChallanEmail(vendor_email, jobDetails, items, filePath, fileName);
      } catch (emailErr) {
        console.error('Error sending vendor email:', emailErr);
      }
    }

    res.json({ success: true, jobWork: jobDetails });
  } catch (error) {
    console.error('Error uploading challan:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Fetch Job Work Requests assigned to Accountant (only those with challan uploaded AND accountant explicitly assigned)
router.get('/job-work/accountant/:accountantId', authenticateToken, async (req, res) => {
  try {
    const { accountantId } = req.params;
    const parsedAccountantId = parseInt(accountantId);
    const loggedInUserId = req.user.id;

    // Security: Ensure logged-in user can only fetch their own assigned job works
    // Unless they are an Admin, they cannot fetch job works for other accountants
    if (loggedInUserId !== parsedAccountantId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized: You can only view job works assigned to you' });
    }

    // CRITICAL FILTER: Only return job works that are EXPLICITLY assigned to THIS accountant
    // 1. accountant_id MUST match AND be NOT NULL
    // 2. Status MUST be 'challan_uploaded'
    // 3. Challan file MUST exist
    // Anything else is a security violation and must return empty
    
    const requestsRes = await pool.query(`
      SELECT jwr.*, 
             p.name as project_name, 
             uc.name as creator_name, 
             usi.name as store_incharge_name,
             ua.name as accountant_name
      FROM job_work_requests jwr
      LEFT JOIN projects p ON jwr.project_id = p.id
      LEFT JOIN users uc ON jwr.created_by = uc.id
      LEFT JOIN users usi ON jwr.store_incharge_id = usi.id
      LEFT JOIN users ua ON jwr.accountant_id = ua.id
      WHERE jwr.company_id = $1 
        AND jwr.accountant_id = $2
        AND jwr.accountant_id IS NOT NULL
        AND jwr.status = 'challan_uploaded'
        AND jwr.challan_file_path IS NOT NULL
      ORDER BY jwr.created_at DESC
    `, [req.user.company_id, parsedAccountantId]);

    const requests = requestsRes.rows;

    // Fetch items and images for each request
    for (const reqObj of requests) {
      const itemsRes = await pool.query(`
        SELECT * FROM job_work_items WHERE job_work_id = $1
      `, [reqObj.id]);
      reqObj.items = itemsRes.rows;

      const imagesRes = await pool.query(`
        SELECT * FROM job_work_images WHERE job_work_id = $1
      `, [reqObj.id]);
      reqObj.images = imagesRes.rows;
    }

    // Return ONLY assigned job works - if none found, return empty array
    res.json({ requests: requests || [] });
  } catch (error) {
    console.error('Error fetching accountant job work list:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
