import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LoginSchema } from '@/lib/validation';
import { connectDB } from '@/lib/db';
import { User } from '@/models/user';
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken, blacklistToken } from '@/lib/auth';
import { USERS } from '@/lib/data';
import mongoose from 'mongoose';

/**
 * /api/auth
 * Supports actions: login, logout, refresh
 * Traceability: FR-01, FR-02, FR-03
 */

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  const action = body?.action || 'login';

  if (action === 'login') {
    if (!parsed.success) {
      console.error('❌ Login validation failed:', parsed.error.format());
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    const { email, password } = parsed.data;
    
    // Try database first (prioritize real DB users)
    try {
      await connectDB();
      if (mongoose.connection.readyState === 1) {
        // MongoDB is connected, only use DB users
        const user = await User.findOne({ email });
        if (user) {
          const ok = await verifyPassword(password, user.passwordHash);
          if (ok) {
            console.log('✅ User authenticated from MongoDB:', email);
            const accessToken = signAccessToken(user);
            const refreshToken = signRefreshToken(user);
            const res = NextResponse.json({
              user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                roles: (user.roles || []).map((r: any) => ({ role: r.role, state: r.state, division: r.branch })),
                state: user.state,
                branch: user.branch,
                avatarUrl: user.avatarUrl || 'https://picsum.photos/seed/100/100',
              },
            });
            const isProd = process.env.NODE_ENV === 'production';
            res.cookies.set('accessToken', accessToken, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 24 * 3600 });
            res.cookies.set('refreshToken', refreshToken, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 7 * 24 * 3600 });
            return res;
          } else {
            console.warn('⚠️ Password mismatch for DB user:', email);
          }
        } else {
          console.warn('⚠️ User not found in MongoDB:', email);
        }
        // If DB is connected but user not found, don't fall back to mock
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    } catch (error: any) {
      console.warn('⚠️ MongoDB connection issue, falling back to mock mode:', error.message);
      // DB not available, fall through to mock mode
    }
    
    // Fallback to mock users (ONLY when DB is not available)
    console.log('🔄 Using mock user fallback (DB not available)');
    const mockUser = USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    
    if (mockUser) {
      console.log('✅ Mock user authenticated:', email);
      // Create a mock user document structure for token signing
      const mockUserDoc = {
        _id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        roles: mockUser.roles.map(r => ({
          role: r.role,
          state: r.state,
          branch: r.division,
        })),
        state: mockUser.roles[0]?.state,
        branch: mockUser.roles[0]?.division,
      } as any;
      
      const accessToken = signAccessToken(mockUserDoc);
      const refreshToken = signRefreshToken(mockUserDoc);
      const res = NextResponse.json({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          roles: mockUser.roles.map(r => ({ role: r.role, state: r.state, division: r.division })),
          avatarUrl: mockUser.avatarUrl,
        },
      });
      const isProd = process.env.NODE_ENV === 'production';
      res.cookies.set('accessToken', accessToken, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 24 * 3600 });
      res.cookies.set('refreshToken', refreshToken, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 7 * 24 * 3600 });
      return res;
    }
    
    console.error('❌ Invalid credentials for:', email);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (action === 'logout') {
    const accessToken = req.cookies.get('accessToken')?.value;
    if (accessToken) await blacklistToken(accessToken);
    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set('accessToken', '', { httpOnly: true, secure: isProd, maxAge: 0 });
    res.cookies.set('refreshToken', '', { httpOnly: true, secure: isProd, maxAge: 0 });
    return res;
  }

  if (action === 'refresh') {
    // Simplified: issue new access token if refresh is present; validation handled in lib/auth.
    const refreshToken = req.cookies.get('refreshToken')?.value;
    if (!refreshToken) return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    await connectDB();
    // Using verifyRefreshToken directly omitted for brevity; fetch user by decoded.sub
    // In MVP, just return 401 if not present.
    return NextResponse.json({ error: 'Not Implemented' }, { status: 501 });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

