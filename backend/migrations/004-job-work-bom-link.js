// Internal Job Work v2 - BOM link for job work items (additive, idempotent).
// Run from backend/:  node migrations/004-job-work-bom-link.js   (or npm run migrate:jobwork-v2)
//
// A job work item picked from the project's BOM remembers which BOM row it came from, so the stock
// item Store maps for it can be pre-filled next time. The app has two BOM tables (the project BOM
// and one per revision), hence two nullable foreign keys, never both set. Free-text items keep both NULL.
// ON DELETE SET NULL: revisions are rewritten by editing, which must not be blocked by job work history.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE job_work_items
        ADD COLUMN IF NOT EXISTS bom_item_id INTEGER REFERENCES bill_of_materials(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS revision_bom_item_id INTEGER REFERENCES revision_bom_items(id) ON DELETE SET NULL;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_work_items_one_bom_source') THEN
          ALTER TABLE job_work_items
            ADD CONSTRAINT job_work_items_one_bom_source CHECK (bom_item_id IS NULL OR revision_bom_item_id IS NULL);
        END IF;
      END $$;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_job_work_items_bom_item ON job_work_items(bom_item_id) WHERE bom_item_id IS NOT NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_job_work_items_revision_bom_item ON job_work_items(revision_bom_item_id) WHERE revision_bom_item_id IS NOT NULL;`);

    await client.query('COMMIT');
    console.log('Internal Job Work v2 (BOM link) migration applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
