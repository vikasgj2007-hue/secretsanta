import { query } from '../config/db.js';

async function cleanup() {
  await query("DELETE FROM assignments WHERE event_id = 'evergreen_2026'");
  await query("DELETE FROM reveal_records WHERE event_id = 'evergreen_2026'");
  await query("DELETE FROM participants WHERE email LIKE '%@testcollege.edu' OR email LIKE '%@lifecycle.test'");
  await query(`
    UPDATE events 
    SET registration_status = 'open', 
        event_status = 'pending', 
        draw_generated = FALSE, 
        draw_locked = FALSE, 
        registration_closed_at = NULL, 
        event_started_at = NULL, 
        event_ended_at = NULL, 
        updated_at = NOW() 
    WHERE id = 'evergreen_2026'
  `);
  const pCount = await query("SELECT COUNT(*) as total FROM participants WHERE account_status = 'active'");
  console.log('✅ CLEANUP COMPLETE. Active real participants in database:', pCount.rows[0].total);
}

cleanup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

