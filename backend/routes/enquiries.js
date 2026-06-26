const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/enquiries');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Temporary filename, will be renamed after enquiry number is generated
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const VALID_PROJECT_TYPES = ['regular', 'external_job_work'];

const ensureProjectTypeColumn = async () => {
    await pool.query(`
        ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'regular'
    `);
    await pool.query(`
        UPDATE projects
        SET project_type = 'regular'
        WHERE project_type IS NULL
    `);
};

// Generate next enquiry number
const getNextEnquiryNumber = async (companyId) => {
    const result = await pool.query(
        'SELECT enquiry_number FROM enquiries WHERE company_id = $1 ORDER BY id DESC LIMIT 1',
        [companyId]
    );

    if (result.rows.length === 0) {
        return 'EN0001';
    }

    const lastNumber = result.rows[0].enquiry_number;
    const numericPart = parseInt(lastNumber.substring(2));
    const nextNumber = numericPart + 1;

    return `EN${String(nextNumber).padStart(4, '0')}`;
};

// Upload PDF and create enquiry
router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const { company_id } = req.user;
        const { notes } = req.body;

        // Generate enquiry number
        const enquiryNumber = await getNextEnquiryNumber(company_id);

        // Rename file with enquiry number
        const oldPath = req.file.path;
        const newFilename = `${enquiryNumber}_${req.file.originalname}`;
        const newPath = path.join(uploadsDir, newFilename);
        fs.renameSync(oldPath, newPath);

        // Save to database
        const result = await pool.query(
            `INSERT INTO enquiries (enquiry_number, company_id, uploaded_by, pdf_filename, pdf_path, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [enquiryNumber, company_id, req.user.id, req.file.originalname, newPath, notes || null]
        );

        res.status(201).json({
            message: 'Enquiry uploaded successfully',
            enquiry: result.rows[0]
        });
    } catch (error) {
        console.error('Error uploading enquiry:', error);
        // Clean up file if database insert fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});


// Send enquiry to specific NPD user
router.post('/:id/send-to-npd', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { company_id } = req.user;
        const { npd_user_id } = req.body;

        console.log(`[DEBUG] Send to NPD: Enquiry ID: ${id}, NPD User ID: ${npd_user_id}, Company: ${company_id}`);

        if (!npd_user_id) {
            return res.status(400).json({ error: 'NPD user ID is required' });
        }

        // Get enquiry details
        const enquiryResult = await pool.query(
            'SELECT * FROM enquiries WHERE id = $1 AND company_id = $2',
            [id, company_id]
        );

        if (enquiryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        const enquiry = enquiryResult.rows[0];

        // Verify NPD user exists and belongs to same company
        const npdUserResult = await pool.query(
            `SELECT id, name FROM users 
             WHERE id = $1 AND company_id = $2 AND role = 'npd'`,
            [npd_user_id, company_id]
        );

        if (npdUserResult.rows.length === 0) {
            return res.status(404).json({ error: 'NPD user not found' });
        }

        const npdUser = npdUserResult.rows[0];

        // Create notification for the selected NPD user
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, $2, $3, $4)`,
            [
                npdUser.id,
                'New Enquiry Assigned',
                `Enquiry ${enquiry.enquiry_number} has been assigned to you for review. File: ${enquiry.pdf_filename}`,
                'enquiry_assigned'
            ]
        );

        // Update enquiry status and assignment
        await pool.query(
            `UPDATE enquiries 
             SET status = 'sent_to_npd', 
                 assigned_to = $1,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [npd_user_id, id]
        );

        res.json({
            message: `Enquiry sent to ${npdUser.name}`,
            npd_user: npdUser
        });
    } catch (error) {
        console.error('Error sending to NPD:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Get enquiries assigned to a specific user
router.get('/assigned/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user is requesting their own assigned enquiries or is management
        if (req.user.id != userId && req.user.role !== 'management') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await pool.query(
            `SELECT e.*, u.name as uploaded_by_name
             FROM enquiries e
             LEFT JOIN users u ON e.uploaded_by = u.id
             WHERE e.assigned_to = $1
             ORDER BY e.updated_at DESC`,
            [userId]
        );

        res.json({ enquiries: result.rows });
    } catch (error) {
        console.error('Error fetching assigned enquiries:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all enquiries for a company
router.get('/company/:companyId', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.params;

        // Verify user belongs to this company
        if (req.user.company_id != companyId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await pool.query(
            `SELECT e.*, u.name as uploaded_by_name
       FROM enquiries e
       LEFT JOIN users u ON e.uploaded_by = u.id
       WHERE e.company_id = $1
       ORDER BY e.created_at DESC`,
            [companyId]
        );

        res.json({ enquiries: result.rows });
    } catch (error) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single enquiry
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT e.*, u.name as uploaded_by_name
       FROM enquiries e
       LEFT JOIN users u ON e.uploaded_by = u.id
       WHERE e.id = $1 AND e.company_id = $2`,
            [id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching enquiry:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Download PDF
router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM enquiries WHERE id = $1 AND company_id = $2',
            [id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        const enquiry = result.rows[0];
        const filePath = enquiry.pdf_path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, enquiry.pdf_filename);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update enquiry
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const result = await pool.query(
            `UPDATE enquiries
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND company_id = $4
       RETURNING *`,
            [status, notes, id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        res.json({ message: 'Enquiry updated successfully', enquiry: result.rows[0] });
    } catch (error) {
        console.error('Error updating enquiry:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete enquiry
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM enquiries WHERE id = $1 AND company_id = $2',
            [id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        const enquiry = result.rows[0];

        // Delete file
        if (fs.existsSync(enquiry.pdf_path)) {
            fs.unlinkSync(enquiry.pdf_path);
        }

        // Delete from database
        await pool.query('DELETE FROM enquiries WHERE id = $1', [id]);

        res.json({ message: 'Enquiry deleted successfully' });
    } catch (error) {
        console.error('Error deleting enquiry:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark enquiry as viewed by NPD
router.put('/:id/mark-viewed', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId, company_id } = req.user;

        if (role !== 'npd') {
            return res.status(403).json({ error: 'Only NPD users can mark enquiries as viewed' });
        }

        const result = await pool.query(
            `UPDATE enquiries 
             SET status = 'viewed', 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND assigned_to = $2 AND company_id = $3 AND status = 'sent_to_npd'
             RETURNING *`,
            [id, userId, company_id]
        );

        if (result.rows.length === 0) {
            // Check if it's already viewed or not assigned to this user
            return res.status(404).json({ message: 'Enquiry not found, not assigned to you, or already viewed' });
        }

        res.json({ message: 'Enquiry marked as viewed', enquiry: result.rows[0] });
    } catch (error) {
        console.error('Error marking enquiry as viewed:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload quotation for enquiry (NPD Only)
router.post('/:id/upload-quotation', authenticateToken, upload.single('quotation'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId, company_id } = req.user;

        if (role !== 'npd') {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Only NPD users can upload quotations' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No quotation file uploaded' });
        }

        // Get enquiry to know the number for naming
        const enquiryCheck = await pool.query(
            'SELECT enquiry_number, uploaded_by, assigned_to FROM enquiries WHERE id = $1 AND assigned_to = $2 AND company_id = $3',
            [id, userId, company_id]
        );

        if (enquiryCheck.rows.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Enquiry not found or not assigned to you' });
        }

        const enquiry = enquiryCheck.rows[0];

        // Rename file with quotation prefix
        const oldPath = req.file.path;
        const newFilename = `QUOT_${enquiry.enquiry_number}_${req.file.originalname}`;
        const newPath = path.join(uploadsDir, newFilename);
        fs.renameSync(oldPath, newPath);

        // Update enquiry with quotation info and status
        const updateResult = await pool.query(
            `UPDATE enquiries 
             SET status = 'quotation_uploaded',
                 quotation_filename = $1,
                 quotation_path = $2,
                 quotation_uploaded_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [req.file.originalname, newPath, id]
        );

        // Notify management
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, $2, $3, $4)`,
            [
                enquiry.uploaded_by,
                'Quotation Uploaded',
                `A quotation has been uploaded for enquiry ${enquiry.enquiry_number} by NPD user ${req.user.name}.`,
                'quotation_uploaded'
            ]
        );

        res.json({
            message: 'Quotation uploaded successfully',
            enquiry: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Error uploading quotation:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Download Quotation
router.get('/:id/download-quotation', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM enquiries WHERE id = $1 AND company_id = $2',
            [id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        const enquiry = result.rows[0];
        const filePath = enquiry.quotation_path;

        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Quotation file not found' });
        }

        res.download(filePath, enquiry.quotation_filename || 'quotation.pdf');
    } catch (error) {
        console.error('Error downloading quotation:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Review quotation (Management Only)
router.put('/:id/review', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const { role, company_id, name: reviewerName } = req.user;

        if (role !== 'management') {
            return res.status(403).json({ error: 'Only management users can review quotations' });
        }

        if (!status || !['completed', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Valid status (completed or rejected) is required' });
        }

        // Get enquiry to notify the correct NPD user
        const enquiryResult = await pool.query(
            'SELECT enquiry_number, assigned_to FROM enquiries WHERE id = $1 AND company_id = $2',
            [id, company_id]
        );

        if (enquiryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        const enquiry = enquiryResult.rows[0];

        // Update enquiry status and notes
        const updateResult = await pool.query(
            `UPDATE enquiries 
             SET status = $1,
                 notes = COALESCE($2, notes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [status, remarks || null, id]
        );

        // Notify NPD user
        if (enquiry.assigned_to) {
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, $4)`,
                [
                    enquiry.assigned_to,
                    `Quotation ${status === 'completed' ? 'Accepted' : 'Rejected'}`,
                    `Management has ${status === 'completed' ? 'accepted' : 'rejected'} your quotation for enquiry ${enquiry.enquiry_number}. ${remarks ? `Remarks: ${remarks}` : ''}`,
                    'quotation_review'
                ]
            );
        }

        res.json({
            message: `Quotation ${status === 'completed' ? 'accepted' : 'rejected'} successfully`,
            enquiry: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Error reviewing quotation:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Upload Purchase Order (PO)
router.post('/:id/upload-po', authenticateToken, upload.single('po'), async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, company_id, role } = req.user;
        const requestedProjectType = req.body.project_type || 'regular';
        const projectType = VALID_PROJECT_TYPES.includes(requestedProjectType) ? requestedProjectType : 'regular';

        if (!req.file) {
            return res.status(400).json({ error: 'No PO file uploaded' });
        }

        await ensureProjectTypeColumn();

        // Check permission: Management or assigned NPD
        const enquiryCheck = await pool.query(
            'SELECT enquiry_number, uploaded_by, assigned_to FROM enquiries WHERE id = $1 AND company_id = $2',
            [id, company_id]
        );

        if (enquiryCheck.rows.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        const enquiry = enquiryCheck.rows[0];
        if (role !== 'management' && enquiry.assigned_to !== userId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Unauthorized to upload PO for this enquiry' });
        }

        // Rename file with PO prefix
        const oldPath = req.file.path;
        const newFilename = `PO_${enquiry.enquiry_number}_${req.file.originalname}`;
        const newPath = path.join(uploadsDir, newFilename);
        fs.renameSync(oldPath, newPath);

        // Update enquiry with PO info
        const updateResult = await pool.query(
            `UPDATE enquiries 
             SET po_filename = $1,
                 po_path = $2,
                 po_uploaded_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [newFilename, newPath, id] // Corrected: use newFilename which exists on disk
        );

        // --- Automate Project Creation ---
        // Get the latest PO number to increment for this company
        const latestPOResult = await pool.query(
            `SELECT po_number FROM projects 
             WHERE company_id = $1 AND po_number LIKE 'PO%' 
             ORDER BY created_at DESC LIMIT 1`,
            [company_id]
        );

        let nextPONumber;
        const poPrefix = `PO${enquiry.enquiry_number}`;
        
        if (latestPOResult.rows.length > 0) {
            const lastPO = latestPOResult.rows[0].po_number;
            const match = lastPO.match(/(\d+)$/);
            if (match) {
                const nextSeq = parseInt(match[1]) + 1;
                nextPONumber = `${poPrefix}${String(nextSeq).padStart(4, '0')}`;
            } else {
                nextPONumber = `${poPrefix}0001`;
            }
        } else {
            nextPONumber = `${poPrefix}0001`;
        }

        const projectName = nextPONumber; // Unified project naming with PO number
        const projectDescription = projectType === 'external_job_work'
            ? `External job work auto-created from Enquiry ${enquiry.enquiry_number}. PO uploaded by ${req.user.name}.`
            : `Auto-created from Enquiry ${enquiry.enquiry_number}. PO uploaded by ${req.user.name}.`;

        console.log(`[DEBUG] Creating project with sequential PO: ${nextPONumber}`);

        // Create project in projects table
        const projectResult = await pool.query(
            `INSERT INTO projects (name, description, company_id, assigned_to, priority, status, po_number, created_by, po_filename, po_path, project_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                projectName,
                projectDescription,
                company_id,
                enquiry.assigned_to || userId,
                'medium',
                'pending',
                nextPONumber,
                userId,
                newFilename,
                newPath,
                projectType
            ]
        );

        const newProject = projectResult.rows[0];

        // Notify NPD user if assigned
        if (enquiry.assigned_to) {
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type, project_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    enquiry.assigned_to,
                    projectType === 'external_job_work' ? 'New External Job Work Created' : 'New Project Created',
                    `A new ${projectType === 'external_job_work' ? 'external job work' : 'project'} ${projectName} has been auto-created for enquiry ${enquiry.enquiry_number} after PO upload.`,
                    'project_created',
                    newProject.id
                ]
            );
        }

        res.json({
            message: 'PO uploaded and project created successfully',
            enquiry: updateResult.rows[0],
            project: newProject
        });
    } catch (error) {
        console.error('Error uploading PO:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Download PO by ID
router.get('/:id/download-po', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM enquiries WHERE id = $1 AND company_id = $2',
            [id, req.user.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        const enquiry = result.rows[0];
        const filePath = enquiry.po_path;

        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'PO file not found' });
        }

        res.download(filePath, enquiry.po_filename || 'po.pdf');
    } catch (error) {
        console.error('Error downloading PO:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Download PO by filename (for projects)
router.get('/download-po-file/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const decodedFilename = decodeURIComponent(filename);

        // Potential directories where the file could be
        const dirs = ['enquiries', 'pos', 'quotations'];
        let filePath = null;
        let foundFileName = null;

        console.log(`[DEBUG] Filename requested: "${filename}"`);
        console.log(`[DEBUG] Decoded filename: "${decodedFilename}"`);

        // Search strategy 1: Exact matches (decoded and raw) in any directory
        for (const dir of dirs) {
            const possibleNames = [decodedFilename, filename];
            for (const nameToTry of possibleNames) {
                const checkPath = path.join(__dirname, '..', 'uploads', dir, nameToTry);
                if (fs.existsSync(checkPath)) {
                    filePath = checkPath;
                    foundFileName = nameToTry;
                    break;
                }
            }
            if (filePath) break;
        }

        // Search strategy 2: Fuzzy match - find any file that contains the requested name
        // (This handles prefixes like PO_EN0001_ and literal %20 encoding on disk)
        if (!filePath) {
            console.log(`[DEBUG] Exact match not found, trying fuzzy match...`);
            for (const dir of dirs) {
                const dirPath = path.join(__dirname, '..', 'uploads', dir);
                if (fs.existsSync(dirPath)) {
                    const files = fs.readdirSync(dirPath);

                    // Possible variations of the name that might be on disk
                    const variations = [
                        decodedFilename,
                        filename,
                        encodeURIComponent(decodedFilename),
                        decodedFilename.replace(/ /g, '%20')
                    ];

                    const match = files.find(f => {
                        const lowerF = f.toLowerCase();
                        return variations.some(v =>
                            f.endsWith(v) || lowerF.includes(v.toLowerCase())
                        );
                    });

                    if (match) {
                        filePath = path.join(dirPath, match);
                        foundFileName = match;
                        console.log(`[DEBUG] Fuzzy match found: "${match}" in ${dir}`);
                        break;
                    }
                }
            }
        }

        if (!filePath) {
            console.error(`[ERROR] PO file not found in any directory: ${decodedFilename}`);
            return res.status(404).json({
                error: 'PO file not found',
                requested: decodedFilename,
                searched_dirs: dirs
            });
        }

        console.log(`[DEBUG] File found at: ${filePath}`);
        // Always suggest the original filename in the download header
        res.download(filePath, foundFileName || decodedFilename);
    } catch (error) {
        console.error('Error downloading PO file:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Customer Review (Final decision)
router.put('/:id/customer-review', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const { company_id } = req.user;

        if (!status || !['accepted_by_customer', 'rejected_by_customer'].includes(status)) {
            return res.status(400).json({ error: 'Valid status is required' });
        }

        const updateResult = await pool.query(
            `UPDATE enquiries 
             SET status = $1,
                 customer_remarks = COALESCE($2, customer_remarks),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND company_id = $4
             RETURNING *`,
            [status, remarks || null, id, company_id]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        // Notify NPD user if assigned
        const enquiryFetch = await pool.query('SELECT enquiry_number, assigned_to FROM enquiries WHERE id = $1', [id]);
        if (enquiryFetch.rows.length > 0 && enquiryFetch.rows[0].assigned_to) {
            const e = enquiryFetch.rows[0];
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, $4)`,
                [
                    e.assigned_to,
                    'Customer Decision Recorded',
                    `Customer final decision for enquiry ${e.enquiry_number}: ${status.replace(/_/g, ' ')}. ${remarks ? `Remarks: ${remarks}` : ''}`,
                    'customer_decision'
                ]
            );
        }

        res.json({
            message: `Customer decision recorded: ${status}`,
            enquiry: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Error recording customer review:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
