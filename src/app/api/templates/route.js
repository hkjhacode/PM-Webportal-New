import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { authenticateRequest, requireRoles } from '@/lib/auth';
import { Template } from '@/models/template';
/**
 * /api/templates
 * Traceability: FR-08 — load template; FR-09 — create custom template (Super Admin)
 */
export async function GET(req) {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    await connectDB();
    if (!mode) {
        const list = await Template.find({}).limit(50);
        return NextResponse.json(list);
    }
    const tpl = await Template.findOne({ mode, isDefault: true });
    if (!tpl)
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    return NextResponse.json(tpl);
}
export async function POST(req) {
    const user = await authenticateRequest(req);
    if (!requireRoles(user, ['Super Admin'])) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const Schema = z.object({ mode: z.string(), name: z.string(), version: z.string(), schemaJson: z.record(z.any()), isDefault: z.boolean().optional() });
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success)
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    await connectDB();
    const doc = await Template.create(Object.assign(Object.assign({}, parsed.data), { createdBy: user._id }));
    return NextResponse.json({ id: String(doc._id) });
}
