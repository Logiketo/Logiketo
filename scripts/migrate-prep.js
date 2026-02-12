#!/usr/bin/env node
/**
 * Prepares migrations before deploy: resolves any failed migration so it can be retried.
 * Run before prisma migrate deploy in the start command.
 */
const { execSync } = require('child_process');

const FAILED_MIGRATION = '20250212100000_add_ownership_created_by_id';

try {
  execSync(`npx prisma migrate resolve --rolled-back "${FAILED_MIGRATION}"`, {
    stdio: 'pipe',
  });
  console.log(`  ✓ Marked ${FAILED_MIGRATION} as rolled back (will retry)`);
} catch (err) {
  // Ignore - migration might not be in failed state
  console.log('  (no failed migration to resolve, continuing)');
}
