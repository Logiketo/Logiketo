/**
 * All accounts are 100% separated - every user sees only their own account's data.
 * No role (including ADMIN) sees data from other accounts.
 */
export function canSeeAllData(_role: string): boolean {
  return false
}
