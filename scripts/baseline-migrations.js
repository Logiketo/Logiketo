#!/usr/bin/env node
/**
 * One-time script to baseline existing Railway database.
 * Run: railway run node scripts/baseline-migrations.js
 * 
 * Marks all migrations EXCEPT 20250212100000_add_ownership_created_by_id as applied.
 * After running, prisma migrate deploy will only run the new ownership migration.
 */
const { execSync } = require('child_process');

const MIGRATIONS_TO_BASELINE = [
  '20250909190111_initial_schema',
  '20250916190330_add_vehicle_enhanced_fields',
  '20250916194110_add_order_enhanced_fields',
  '20250916200600_remove_volume_field',
  '20250918180013_add_units_model',
  '20250919183523_add_documents_field',
  '20250924162356_add_documents_field_to_orders',
  '20250924193656_remove_returned_status',
  '20250924193843_restore_returned_status',
  '20250924204030_replace_value_with_loadpay_driverpay',
  '20251103173000_fix_order_status_enum_type',
];

console.log('Baselining existing migrations (marking as already applied)...\n');

for (const name of MIGRATIONS_TO_BASELINE) {
  try {
    execSync(`npx prisma migrate resolve --applied "${name}"`, {
      stdio: 'inherit',
    });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  - ${name} (skipped: ${err.message || err})`);
  }
}

console.log('\nDone. Run prisma migrate deploy to apply remaining migrations.');
