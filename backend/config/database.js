const { Pool, types } = require('pg');
require('dotenv').config();

// Every DATE column (oid 1082) is returned as the plain string 'YYYY-MM-DD'. By default pg builds a JS Date at local
// midnight, which JSON turns into the previous day in India (2026-10-14 became 2026-10-13T18:30:00.000Z).
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
