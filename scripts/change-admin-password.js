import bcrypt from 'bcryptjs';
import readline from 'readline';
import { pool, query } from '../config/db.js';

async function main() {
  console.log('\n=============================================================');
  console.log('       THE EVERGREEN EXPRESS — UPDATE ADMIN PASSWORD         ');
  console.log('=============================================================\n');

  const newPasswordArg = process.argv[2];

  if (newPasswordArg) {
    await updatePassword(newPasswordArg.trim());
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter new Administrator Password (min 8 chars): ', async (answer) => {
    rl.close();
    if (!answer || answer.trim().length < 8) {
      console.error('\n❌ Password must be at least 8 characters long.\n');
      process.exit(1);
    }
    await updatePassword(answer.trim());
  });
}

async function updatePassword(newPassword) {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const res = await query(
      `UPDATE administrators 
       SET password_hash = $1, updated_at = NOW() 
       WHERE username = 'admin'
       RETURNING username, updated_at`
    );

    if (res.rowCount === 0) {
      console.log('No administrator named "admin" found. Creating account...');
      await query(
        `INSERT INTO administrators (username, email, password_hash, role)
         VALUES ('admin', 'admin@college.edu', $1, 'admin')`,
        [passwordHash]
      );
    }

    console.log('\n✅ SUCCESS! Administrator password updated in Supabase.');
    console.log('   Username: admin');
    console.log('   Timestamp: ' + new Date().toISOString() + '\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Failed to update admin password:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

