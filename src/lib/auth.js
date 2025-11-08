import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '@/models/user';
import { connectDB } from './db';
/**
 * Auth Helpers
 * Traceability: FR-01 (login), FR-02 (RBAC), FR-03 (logout/blacklist + refresh)
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret';
export async function hashPassword(plain) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plain, salt);
}
export async function verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
}
export function signAccessToken(user) {
    const payload = {
        sub: String(user._id),
        roles: user.roles,
        state: user.state,
        branch: user.branch,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
export function signRefreshToken(user) {
    const payload = { sub: String(user._id) };
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_SECRET);
}
// Simple in-memory blacklist fallback if Redis not configured.
const memoryBlacklist = new Map();
export async function blacklistToken(token, ttlSeconds = 24 * 3600) {
    const until = Date.now() + ttlSeconds * 1000;
    memoryBlacklist.set(token, until);
}
export function isTokenBlacklisted(token) {
    const until = memoryBlacklist.get(token);
    if (!until)
        return false;
    if (Date.now() > until) {
        memoryBlacklist.delete(token);
        return false;
    }
    return true;
}
export async function authenticateRequest(req) {
    var _a;
    const authHeader = req.headers.get('authorization');
    const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))
        ? authHeader.substring(7)
        : undefined;
    const cookieToken = (_a = req.cookies.get('accessToken')) === null || _a === void 0 ? void 0 : _a.value;
    const t = token || cookieToken;
    if (!t)
        return null;
    if (isTokenBlacklisted(t))
        return null;
    try {
        const decoded = verifyAccessToken(t);
        await connectDB();
        const user = await User.findById(decoded.sub);
        return user || null;
    }
    catch (_b) {
        return null;
    }
}
export function requireRoles(user, allowedRoles) {
    if (!user)
        return false;
    const roles = (user.roles || []).map((r) => r.role);
    return allowedRoles.some((ar) => roles.includes(ar));
}
