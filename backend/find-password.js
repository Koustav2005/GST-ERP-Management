const { Client } = require('pg');

const commonPasswords = ['', 'postgres', 'admin', 'root', 'password', '123456'];

async function findPassword() {
  console.log('🔍 Trying to find your PostgreSQL password...\n');

  for (const password of commonPasswords) {
    const displayPassword = password === '' ? '(empty)' : password;
    process.stdout.write(`Trying password: ${displayPassword}... `);

    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: password,
    });

    try {
      await client.connect();
      console.log('✅ SUCCESS!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Your password is: ${displayPassword}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      await client.end();

      // Update .env file
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(__dirname, '.env');
      
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`);
      fs.writeFileSync(envPath, envContent);
      
      console.log('✅ Updated .env file with correct password\n');
      console.log('Now run: npm run setup');
      return;
    } catch (error) {
      console.log('❌');
      await client.end().catch(() => {});
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ Could not find password with common defaults');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Options:');
  console.log('1. Run: node interactive-setup.js (enter password manually)');
  console.log('2. Reset password - see CONNECT-DATABASE.md');
}

findPassword();
