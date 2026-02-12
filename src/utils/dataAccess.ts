/**
 * Admin/staff see all data. Regular users see only data they created (ownership).
 */
export function canSeeAllData(role: string): boolean {
  return ['ADMIN', 'MANAGER', 'DISPATCHER'].includes(role)
}
