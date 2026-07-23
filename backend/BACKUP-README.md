# Database Backup Guide

## Creating a Complete Database Backup

This guide explains how to create a complete backup of all tables and data in the GST Management System database.

### Quick Start

Run the backup script:

```bash
node create-full-backup.js
```

The backup will be automatically saved to `backend/backups/` folder with a timestamp.

### What Gets Backed Up

- **51 Tables** - All database tables and their schemas
- **All Data** - Complete data from all tables
- **Metadata** - Table constraints, defaults, and data types
- **Timestamps** - ISO date format for all records

### Backup File Format

The backup file is a complete PostgreSQL SQL dump that contains:

1. **Header** - Metadata about when and from which database
2. **Schema Reset** - Drops and recreates the public schema
3. **Table Definitions** - CREATE TABLE statements with column definitions
4. **Data Inserts** - INSERT statements with all data rows

### Sample Data

Each backup includes data from these key tables:

- **Users** (21 rows) - Employee accounts and login credentials
- **Companies** (5 rows) - Organization units
- **Projects** (20 rows) - Active projects
- **Purchase Orders** (10 rows) - Vendor orders
- **Notifications** (262 rows) - System notifications
- **Attendance** (463 rows) - Employee attendance logs
- **External Job Work** - Job work tracking and materials
- **Inventory** - Stock and material tracking
- **And 42 more tables...**

### Restoring from Backup

To restore the database from a backup file:

#### Option 1: Using psql command line

```bash
psql -U postgres -d gst_management -f gst_management_backup_YYYY-MM-DD.sql
```

#### Option 2: Using pgAdmin

1. Open pgAdmin
2. Right-click on "gst_management" database
3. Select "Restore"
4. Choose the backup SQL file
5. Click "Restore"

#### Option 3: Using Node.js (via Express API)

```javascript
const fs = require('fs');
const pool = require('./config/database');

const backupContent = fs.readFileSync('backup.sql', 'utf-8');
const statements = backupContent.split(';').filter(s => s.trim());

for (const statement of statements) {
  await pool.query(statement);
}
```

### Backup Location

All backups are stored in: `backend/backups/`

Example files:
- `gst_management_backup_2026-07-23T07-00-47.sql` - Full backup with timestamp
- `gst_management_backup_142107-05-2026_4053.sql` - Previous backup
- `gst_management_migration.sql` - Schema-only migration

### File Size

Current backup: **0.26 MB**
- With 51 tables
- ~1000+ rows of data
- Fully compressed and optimized

### Automated Backups (Optional)

To set up daily automated backups, add this to your Node.js schedule:

```javascript
const schedule = require('node-schedule');
const { execSync } = require('child_process');

// Run backup every day at 2 AM
schedule.scheduleJob('0 2 * * *', () => {
  try {
    execSync('node create-full-backup.js', { cwd: __dirname });
    console.log('✅ Scheduled backup completed');
  } catch (error) {
    console.error('❌ Backup failed:', error);
  }
});
```

### Troubleshooting

**Error: "Connection refused"**
- Make sure PostgreSQL is running
- Check DB_HOST, DB_PORT in `.env`

**Error: "Permission denied"**
- Ensure database user has proper permissions
- Check DB_USER and DB_PASSWORD in `.env`

**Error: "Database does not exist"**
- Verify DB_NAME in `.env`
- Database must be created before backup

### Database Tables Included

The backup includes all 51 tables:

**Core Management**
- users, companies, projects, requirements

**Materials & Inventory**
- master_materials, master_vendors, barcodes, inventory
- materials_detail, purchase_orders, purchase_order_items

**Orders & Receipts**
- order_receipts, order_receipt_items
- major_orders, minor_orders, minor_order_bids

**Job Work**
- job_work_requests, job_work_items, job_work_images
- external_job_work, external_job_work_items, external_job_work_history
- external_jobwork_challans, external_jobwork_inventory
- external_jobwork_material_notifications
- external_jobwork_outstock_requests, external_jobwork_outstock_transactions

**Tracking & History**
- project_status_history, project_workers, project_internal_reports
- allocation_tasks, allocation_inventory_mapping
- store_requests, store_request_items
- external_material_collections

**Admin & System**
- notifications, attendance, password_reset_tokens
- enquiries, vendor_demands, bid_items

### Security Notes

⚠️ **Important:**
- Backups contain sensitive data (passwords are hashed but still included)
- Store backups in a secure location
- Don't commit backups with real production data to public repositories
- Use `.gitignore` to exclude backups from version control

### See Also

- Setup Guide: `backend/SETUP-GUIDE.md`
- Quick Start: `backend/QUICK-START.md`
- Database Schema: `backend/archived/setup-migrations/schema.sql`
