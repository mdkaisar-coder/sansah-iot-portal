const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com',
  port: 4000,
  user: '2oe2n2WBpYP4161.root',
  password: 'ejwmcCSnxp2PA9uk',
  database: 'sys',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false // Skip verification just in case of local cert bundle mismatch
  }
};

async function main() {
  console.log('Connecting to TiDB Cloud...');
  const conn = await mysql.createConnection(config);
  console.log('Connected to TiDB!');

  console.log('Creating database iot_portal...');
  await conn.query('CREATE DATABASE IF NOT EXISTS iot_portal');
  await conn.query('USE iot_portal');
  console.log('✅ Using database iot_portal.');

  const dumpPath = 'C:\\Users\\KHAIRUDDIN\\OneDrive\\Documents\\dumps\\Dump20260619.sql';
  console.log(`Reading SQL dump from: ${dumpPath}`);
  const sqlContent = fs.readFileSync(dumpPath, 'utf8');

  console.log('Parsing and executing queries...');
  const lines = sqlContent.split('\n');
  let currentQuery = '';
  let queryCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip comments and empty lines
    if (line.startsWith('--') || line.startsWith('/*') || line === '') {
      continue;
    }

    currentQuery += '\n' + lines[i];

    if (line.endsWith(';')) {
      const queryToRun = currentQuery.trim();
      currentQuery = '';

      // Skip locks and keys disables that are not required or supported in TiDB
      if (queryToRun.toUpperCase().startsWith('LOCK TABLES') || 
          queryToRun.toUpperCase().startsWith('UNLOCK TABLES') ||
          queryToRun.toUpperCase().startsWith('ALTER TABLE') && queryToRun.toUpperCase().includes('DISABLE KEYS') ||
          queryToRun.toUpperCase().startsWith('ALTER TABLE') && queryToRun.toUpperCase().includes('ENABLE KEYS')) {
        continue;
      }

      try {
        await conn.query(queryToRun);
        queryCount++;
      } catch (err) {
        console.error(`❌ Error executing query at line ${i + 1}:`, err.message);
        console.error('Query preview:', queryToRun.substring(0, 150) + '...');
      }
    }
  }

  console.log(`\n🎉 Import completed. Executed ${queryCount} queries successfully.`);

  // Verify tables list
  const [tables] = await conn.query('SHOW TABLES');
  console.log('\n--- Deployed Tables ---');
  console.table(tables);

  await conn.end();
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
