import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { authenticateRequest, requireRoles } from '@/lib/auth';
import { CreateRequestSchema } from '@/lib/validation';
import { WorkflowRequest } from '@/models/request';
/**
 * /api/workflows
 * Traceability: FR-04 (create), FR-05 (propagate), FR-06 (filter tasks), FR-07 (approve/reject)
 */
export async function POST(req) {
    const user = await authenticateRequest(req);
    if (!requireRoles(user, ['PMO Viewer', 'CEO NITI'])) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const json = await req.json();
    const parsed = CreateRequestSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    const { title, infoNeed, timeline, targets } = parsed.data;
    const now = new Date();
    const minDate = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
    if (timeline <= minDate) {
        return NextResponse.json({ error: 'timeline must be at least 3 days in the future' }, { status: 400 });
    }
    await connectDB();
    const doc = await WorkflowRequest.create({
        title,
        infoNeed,
        timeline,
        deadline: new Date(timeline.getTime() - 3 * 24 * 3600 * 1000), // FR-12 default deadline
        createdBy: user._id,
        targets,
        history: [{ action: 'created', userId: user._id, timestamp: new Date(), notes: '' }],
    });
    return NextResponse.json({ id: String(doc._id) });
}
export async function GET(req) {
    const user = await authenticateRequest(req);
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const state = url.searchParams.get('state') || undefined;
    const q = {};
    if (status)
        q.status = status;
    if (state)
        q['targets.states'] = state;
    const items = await WorkflowRequest.find(q).sort({ timeline: 1 }).limit(50);
    return NextResponse.json(items);
}
export async function PATCH(req) {
    const user = await authenticateRequest(req);
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const UpdateSchema = z.object({ id: z.string(), action: z.enum(['approve', 'reject']), notes: z.string().max(1000).optional() });
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success)
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    const { id, action, notes } = parsed.data;
    await connectDB();
    const doc = await WorkflowRequest.findById(id);
    if (!doc)
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    doc.history.push({ action, userId: user._id, timestamp: new Date(), notes });
    doc.status = action === 'approve' ? 'approved' : 'rejected';
    await doc.save();
    return NextResponse.json({ ok: true });
}
