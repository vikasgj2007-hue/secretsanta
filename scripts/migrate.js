import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, getClient, testConnection } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('\n=============================================================');
  console.log('       THE EVERGREEN EXPRESS — DATABASE MIGRATION RUNNER     ');
  console.log('=============================================================\n');

  // 1. Verify connection first with retry mechanism for cloud hosting cold-starts
  let connTest = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    connTest = await testConnection();
    if (connTest.success) break;
    if (attempt < 3) {
      console.warn(`⚠️ Database connection attempt ${attempt}/3 failed (${connTest.error}). Retrying in 3 seconds...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (!connTest || !connTest.success) {
    console.error('❌ Cannot run migration: Database is not connected.');
    console.error(`   Reason: ${connTest ? connTest.error : 'Connection timeout'}`);
    if (connTest && connTest.hint) console.error(`   Hint:   ${connTest.hint}`);
    process.exit(1);
  }

  console.log(`Connected to database "${connTest.database}". Applying migrations...`);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 2. Read and apply all migration files in migrations/ directory
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`✅ Applied migration: ${file}`);
    }

    // 3. Bootstrap default admin if none exists
    const adminCountRes = await client.query('SELECT COUNT(*) FROM administrators');
    const adminCount = parseInt(adminCountRes.rows[0].count, 10);

    if (adminCount === 0) {
      const defaultUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'ChristmasAdmin2026!';
      const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@college.edu';

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      await client.query(
        `INSERT INTO administrators (username, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')`,
        [defaultUsername, defaultEmail, passwordHash]
      );

      console.log(`✅ Default administrator created: "${defaultUsername}"`);
    } else {
      console.log(`ℹ️  Administrator table already has ${adminCount} account(s).`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    console.log('   Tables created: events, administrators, participants, assignments,');
    console.log('                   reveal_records, audit_logs, email_notifications.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed, transaction rolled back.');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

