import { testConnection } from '../config/db.js';

async function run() {
  console.log('\n=============================================================');
  console.log('       THE EVERGREEN EXPRESS — SUPABASE POSTGRESQL TEST      ');
  console.log('=============================================================');
  console.log('Checking database connection status...\n');

  const result = await testConnection();

  if (result.success) {
    console.log('-------------------------------------------------------------');
    console.log(' STATUS: CONNECTED SUCCESSFULLY! 🎄');
    console.log('-------------------------------------------------------------');
    console.log(` Database:    ${result.database}`);
    console.log(` Server Time: ${result.time}`);
    console.log(` PostgreSQL:  ${result.version.split(',')[0]}`);
    console.log('-------------------------------------------------------------');
    console.log('\nYour Supabase database is connected and ready for migrations!\n');
    process.exit(0);
  } else {
    console.log('-------------------------------------------------------------');
    console.log(' STATUS: NOT CONNECTED YET');
    console.log('-------------------------------------------------------------');
    console.log(` Reason: ${result.error}`);
    console.log('-------------------------------------------------------------');
    if (result.hint) {
      console.log(`\n HINT: ${result.hint}`);
    }
    console.log('\n Follow the instructions to paste your connection string into .env');
    console.log(' Then run: npm run test:db\n');
    process.exit(1);
  }
}

run();

