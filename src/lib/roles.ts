import type { UserDoc } from '@/models/user';

/**
 * RBAC utilities
 * Traceability: FR-02 (role-based access restrictions)
 */
export function hasRole(user: UserDoc | null, role: string) {
  if (!user) return false;
  return (user.roles || []).some((r) => r.role === role);
}

export function inStateBranch(user: UserDoc | null, state?: string, branch?: string) {
  if (!user) return false;
  return (
    (state ? user.state === state : true) &&
    (branch ? user.branch === branch : true)
  );
}