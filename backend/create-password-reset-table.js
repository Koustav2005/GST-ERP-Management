const pool = require('./config/database');

async function createPasswordResetTokensTable() {
    try {
        console.log('Creating password_reset_tokens table...');

        // Create the password_reset_tokens table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('✅ password_reset_tokens table created successfully');

        // Create index on token for faster lookups
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
      ON password_reset_tokens(token)
    `);

        console.log('✅ Index created on token column');

        // Create index on user_id
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
      ON password_reset_tokens(user_id)
    `);

        console.log('✅ Index created on user_id column');

        console.log('\n✅ Migration completed successfully!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating password_reset_tokens table:', error);
        await pool.end();
        process.exit(1);
    }
}

createPasswordResetTokensTable();
