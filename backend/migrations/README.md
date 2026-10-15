# Migrations

Standalone, idempotent Node scripts (`CREATE ... IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
Run from `backend/` with the `DB_*` values from `.env`:

```
npm run migrate:jobwork-v2     # migrations/001-internal-job-work-v2.js
```

Back up first, e.g. `pg_dump -U postgres -h localhost -d gst_management -f backups/pre-migration.sql`.

## TODO before deployment

`backend/setup-database.js` is broken: it reads `backend/database/schema.sql`, which was moved to
`backend/archived/setup-migrations/` in commit `bf760c7`. A fresh install therefore cannot be
built with `npm run setup`. Fix it (point it at the archived schema, or fold the schema and these
migrations into one ordered runner) before deploying.

## External Job Work v2

```
npm run migrate:ejw-v2      # 008 customers, 009 doc sequences, 010 core tables, 011 link columns
npm test                    # internal suite + the external Phase 1 suite
```

Each migration is idempotent (run it twice; the schema dump is identical). Back up first, e.g.
`pg_dump -U postgres -h localhost -d gst_management -f backups/pre-<name>.sql`.
Document numbers (DC, IN, WO, INV) come only from `utils/numbering.js`.

Migration 012 (receipts, typed numbers, customer DC rule) is part of `npm run migrate:ejw-v2`.
Server setting `LEGACY_EXTERNAL_FLOW=1` (environment) re-enables the old challan-based external routes; the app side is
`SHOW_LEGACY_EXTERNAL_FLOW` in `src/config/features.js`. Test suites: `npm run test:jobwork-dcs`, `npm run test:ejw`, `npm run test:ejw2`.
