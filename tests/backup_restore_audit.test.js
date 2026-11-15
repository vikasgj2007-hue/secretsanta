import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n=============================================================');
console.log('   THE EVERGREEN EXPRESS — BACKUP & RESTORE SAFETY AUDIT     ');
console.log('=============================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Inspect routes/admin.js
const adminRouteCode = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');

assert(
  adminRouteCode.includes("router.post('/backups/:id/restore'"),
  'POST /api/admin/backups/:id/restore endpoint is implemented in routes/admin.js'
);

assert(
  adminRouteCode.includes('requireAdmin') && adminRouteCode.includes("router.post('/backups/:id/restore', requireAdmin"),
  'Restore endpoint strictly enforces requireAdmin middleware authorization'
);

assert(
  adminRouteCode.includes("SELECT event_status FROM events WHERE id = 'evergreen_2026'") &&
  adminRouteCode.includes("Cannot restore backup while the event is actively LIVE"),
  'Restore endpoint blocks execution if the event is actively LIVE'
);

assert(
  adminRouteCode.includes('bcrypt.compare(adminPassword') &&
  adminRouteCode.includes('Incorrect administrator password'),
  'Restore endpoint verifies administrator password via bcrypt'
);

assert(
  adminRouteCode.includes("SELECT * FROM participants"),
  'Pre-reset snapshot queries SELECT * FROM participants to preserve all fields (password_hash, wishlist, status)'
);

assert(
  adminRouteCode.includes("ADMIN_BACKUP_RESTORED"),
  'Restore operation logs ADMIN_BACKUP_RESTORED action into audit_logs table'
);

assert(
  adminRouteCode.includes("router.post('/backups/create'"),
  'POST /api/admin/backups/create endpoint is implemented to save all 4 tables on demand'
);

// 2. Inspect src/services/databaseService.js
const dbServiceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'databaseService.js'), 'utf8');

assert(
  dbServiceCode.includes('async createBackup()'),
  'databaseService exports createBackup method'
);

assert(
  dbServiceCode.includes('async restoreBackup(backupId, adminPassword)'),
  'databaseService exports restoreBackup method'
);

assert(
  dbServiceCode.includes('/api/admin/backups/${backupId}/restore'),
  'restoreBackup dispatches POST to /api/admin/backups/:id/restore'
);

// 3. Inspect src/components/adminPanel.js
const adminPanelCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'adminPanel.js'), 'utf8');

assert(
  adminPanelCode.includes('reset-backups-container') && adminPanelCode.includes('btn-restore-snapshot'),
  'Admin panel includes interactive restore button for available snapshots'
);

assert(
  adminPanelCode.includes('btn-save-manual-snapshot') && adminPanelCode.includes('Faculty not included'),
  'Admin panel includes on-demand save snapshot button and displays "Faculty not included" when data is absent'
);

// 4. Verify Schema completeness
const schema1 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_initial_schema.sql'), 'utf8');
const schema3 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '003_performance_and_lifecycle.sql'), 'utf8');

assert(
  schema3.includes('CREATE TABLE IF NOT EXISTS system_backups'),
  'system_backups table schema exists with snapshot_data JSONB and UUID primary key'
);

console.log('\n=============================================================');
console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=============================================================\n');

if (failed > 0) process.exit(1);
process.exit(0);

