#!/usr/bin/env node
/**
 * Prepares migrations before deploy: resolves any failed migration so it can be retried.
 * Run before prisma migrate deploy in the start command.
 */
const { execSync } = require('child_process');

const FAILED_MIGRATIONS = [
  '20250212100000_add_ownership_created_by_id',
  '20250306000000_vehicle_license_vin_per_user',
];

for (const name of FAILED_MIGRATIONS) {
  try {
    execSync(`npx prisma migrate resolve --rolled-back "${name}"`, {
      stdio: 'pipe',
    });
    console.log(`  ✓ Marked ${name} as rolled back (will retry)`);
  } catch (err) {
    // Ignore - migration might not be in failed state
  }
}
