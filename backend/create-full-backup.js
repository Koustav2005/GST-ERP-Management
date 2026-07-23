const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Function to escape SQL string values
function escapeSqlString(str) {
  if (str === null || str === undefined) {
    return 'NULL';
  }
  if (typeof str === 'boolean') {
    return str ? 'true' : 'false';
  }
  if (typeof str === 'number') {
    return str.toString();
  }
  return "'" + str.toString().replace(/'/g, "''") + "'";
}

// Function to get CREATE TABLE statements
async function getTableSchemas() {
  const query = `
    SELECT table_name, table_schema
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  const result = await pool.query(query);
  return result.rows;
}

// Function to get table columns and their definitions
async function getTableDefinition(tableName) {
  const query = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position;
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

// Function to get table data
async function getTableData(tableName) {
  const query = `SELECT * FROM "${tableName}";`;
  const result = await pool.query(query);
  return result.rows;
}

// Function to get primary keys
async function getPrimaryKey(tableName) {
  const query = `
    SELECT column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY kcu.ordinal_position;
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

// Function to get constraints (UNIQUE, FOREIGN KEY, etc.)
async function getConstraints(tableName) {
  const query = `
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = $1 AND constraint_type != 'PRIMARY KEY'
    ORDER BY constraint_name;
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

// Main backup function
async function createBackup() {
  try {
    console.log('🔄 Starting full database backup...\n');
    
    let sqlContent = '';
    
    // Add header
    sqlContent += `-- ============================================\n`;
    sqlContent += `-- GST Management System - Complete Database Backup\n`;
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n`;
    sqlContent += `-- Database: ${process.env.DB_NAME}\n`;
    sqlContent += `-- ============================================\n\n`;
    
    sqlContent += `-- Drop all tables if they exist\n`;
    sqlContent += `DROP SCHEMA IF EXISTS public CASCADE;\n`;
    sqlContent += `CREATE SCHEMA public;\n\n`;
    
    // Get all tables
    const tables = await getTableSchemas();
    console.log(`📊 Found ${tables.length} tables\n`);
    
    // Create tables and insert data
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`📝 Processing table: ${tableName}`);
      
      try {
        // Get table definition
        const columns = await getTableDefinition(tableName);
        const primaryKeys = await getPrimaryKey(tableName);
        
        // Build CREATE TABLE statement
        let createTableStmt = `CREATE TABLE "${tableName}" (\n`;
        
        const columnDefs = columns.map(col => {
          let def = `  "${col.column_name}" ${col.data_type}`;
          
          if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
          }
          
          if (col.column_default) {
            def += ` DEFAULT ${col.column_default}`;
          }
          
          return def;
        }).join(',\n');
        
        createTableStmt += columnDefs;
        
        // Add primary key if exists
        if (primaryKeys.length > 0) {
          const pkColumns = primaryKeys.map(pk => `"${pk.column_name}"`).join(', ');
          createTableStmt += `,\n  PRIMARY KEY (${pkColumns})`;
        }
        
        createTableStmt += '\n);\n\n';
        sqlContent += createTableStmt;
        
        // Get and insert data
        const rows = await getTableData(tableName);
        
        if (rows.length > 0) {
          console.log(`   ✓ Exporting ${rows.length} rows`);
          
          // Get column names
          const colNames = Object.keys(rows[0]);
          const colNameStr = colNames.map(name => `"${name}"`).join(', ');
          
          // Build INSERT statements
          let insertStmt = `INSERT INTO "${tableName}" (${colNameStr}) VALUES\n`;
          
          const valueStrings = rows.map(row => {
            const values = colNames.map(colName => {
              const value = row[colName];
              return escapeSqlString(value);
            }).join(', ');
            return `(${values})`;
          });
          
          insertStmt += valueStrings.join(',\n') + ';\n\n';
          sqlContent += insertStmt;
        } else {
          console.log(`   ✓ No data`);
        }
        
      } catch (error) {
        console.error(`   ✗ Error processing ${tableName}:`, error.message);
      }
    }
    
    // Add footer
    sqlContent += `-- ============================================\n`;
    sqlContent += `-- Backup completed successfully\n`;
    sqlContent += `-- Total tables: ${tables.length}\n`;
    sqlContent += `-- ============================================\n`;
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `gst_management_backup_${timestamp}.sql`;
    const filepath = path.join(__dirname, 'backups', filename);
    
    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, sqlContent, 'utf-8');
    
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📄 File saved: ${filepath}`);
    console.log(`📦 File size: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run backup
createBackup();
