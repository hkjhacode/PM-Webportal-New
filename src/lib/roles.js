/**
 * RBAC utilities
 * Traceability: FR-02 (role-based access restrictions)
 */
export function hasRole(user, role) {
    if (!user)
        return false;
    return (user.roles || []).some((r) => r.role === role);
}
export function inStateBranch(user, state, branch) {
    if (!user)
        return false;
    return ((state ? user.state === state : true) &&
        (branch ? user.branch === branch : true));
}
