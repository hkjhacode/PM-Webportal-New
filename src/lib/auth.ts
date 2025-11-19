import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserDoc } from '@/models/user';
import { connectDB } from './db';
import { USERS } from './data';

/**
 * Auth Helpers
 * Traceability: FR-01 (login), FR-02 (RBAC), FR-03 (logout/blacklist + refresh)
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret';

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(user: UserDoc) {
  const payload = {
    sub: String(user._id),
    roles: user.roles,
    state: user.state,
    branch: user.branch,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function signRefreshToken(user: UserDoc) {
  const payload = { sub: String(user._id) };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as any;
}

// Simple in-memory blacklist fallback if Redis not configured.
const memoryBlacklist = new Map<string, number>();

export async function blacklistToken(token: string, ttlSeconds = 24 * 3600) {
  const until = Date.now() + ttlSeconds * 1000;
  memoryBlacklist.set(token, until);
}

export function isTokenBlacklisted(token: string) {
  const until = memoryBlacklist.get(token);
  if (!until) return false;
  if (Date.now() > until) {
    memoryBlacklist.delete(token);
    return false;
  }
  return true;
}

export async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : undefined;
  const cookieToken = req.cookies.get('accessToken')?.value;
  const t = token || cookieToken;
  if (!t) return null;
  if (isTokenBlacklisted(t)) return null;
  try {
    const decoded = verifyAccessToken(t);
    
    // Try database first
    try {
      await connectDB();
      const user = await User.findById(decoded.sub);
      if (user) return user;
    } catch (error) {
      // DB not available, fall through to mock mode
    }
    
    // Fallback to mock users (for development/demo when DB is not configured)
    const mockUser = USERS.find(u => u.id === decoded.sub);
    if (mockUser) {
      // Return a mock user document structure compatible with UserDoc
      const mockUserDoc = {
        _id: mockUser.id as any,
        name: mockUser.name,
        email: mockUser.email,
        roles: mockUser.roles.map(r => ({
          role: r.role,
          state: r.state,
          branch: r.division,
        })),
        state: mockUser.roles[0]?.state,
        branch: mockUser.roles[0]?.division,
        passwordHash: '', // Not needed for auth check
        avatarUrl: mockUser.avatarUrl,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any as UserDoc;
      console.log('✅ Authenticated mock user:', mockUser.email, 'Roles:', mockUser.roles.map(r => r.role));
      return mockUserDoc;
    }
    
    return null;
  } catch {
    return null;
  }
}

export function requireRoles(user: UserDoc | null, allowedRoles: string[]) {
  if (!user) {
    console.warn('⚠️ requireRoles: No user provided');
    return false;
  }
  const roles = (user.roles || []).map((r: any) => {
    // Handle both object format { role: '...' } and string format
    return typeof r === 'string' ? r : (r?.role || r);
  });
  const hasRole = allowedRoles.some((ar) => roles.includes(ar));
  if (!hasRole) {
    console.warn(`⚠️ requireRoles: User roles [${roles.join(', ')}] do not include any of [${allowedRoles.join(', ')}]`);
  }
  return hasRole;
}