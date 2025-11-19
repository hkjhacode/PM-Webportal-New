import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/user'
import { authenticateRequest, requireRoles } from '@/lib/auth'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateRequest(req)
  if (!requireRoles(user, ['Super Admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  
  try {
    await connectDB()
    
    // Check if MongoDB is actually connected
    if (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
      if (mongoose.connection.readyState !== 1) {
        return NextResponse.json({ error: 'Database not available' }, { status: 503 })
      }
    }
    
    const deleted = await User.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.log('✅ User deleted from MongoDB:', id)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error deleting user:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => ({}))
  const action = body?.action
  const user = await authenticateRequest(req)
  if (!requireRoles(user, ['Super Admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (action !== 'reset-password') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: 'Not implemented in demo mode' }, { status: 501 })
  }
  const { id } = await params
  const temp = randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const hash = await bcrypt.hash(temp, 10)
  await connectDB()
  await User.findByIdAndUpdate(id, { passwordHash: hash })
  return NextResponse.json({ ok: true, tempPassword: temp })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await authenticateRequest(req)
  if (!requireRoles(actor, ['Super Admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const roles = Array.isArray(body?.roles) ? body.roles : []
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: 'Not implemented in demo mode' }, { status: 501 })
  }
  await connectDB()
  const mapped = roles.map((r: any) => ({ role: r.role, state: r.state, branch: r.division }))
  const updated = await User.findByIdAndUpdate(id, { roles: mapped, status: 'active' }, { new: true })
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    user: {
      id: String(updated._id),
      name: updated.name,
      email: updated.email,
      roles: (updated.roles || []).map((r: any) => ({ role: r.role, state: r.state, division: r.branch })),
      avatarUrl: updated.avatarUrl || 'https://picsum.photos/seed/100/100',
      status: updated.status || 'active',
    },
  })
}