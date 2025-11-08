import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, requireRoles } from '@/lib/auth';
import { sendEmail, sendSMS } from '@/lib/notifications';
/**
 * /api/notifications
 * Traceability: FR-12/FR-13/FR-14 — manual trigger for alerts and escalations
 */
export async function POST(req) {
    const user = await authenticateRequest(req);
    if (!requireRoles(user, ['PMO Viewer', 'CEO NITI', 'Super Admin'])) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const Schema = z.object({
        type: z.enum(['email', 'sms']),
        to: z.string(),
        subject: z.string().optional(),
        message: z.string(),
    });
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success)
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    if (parsed.data.type === 'email') {
        const r = await sendEmail(parsed.data.to, parsed.data.subject || 'HierarchyFlow Notification', parsed.data.message);
        return NextResponse.json(r);
    }
    const r = await sendSMS(parsed.data.to, parsed.data.message);
    return NextResponse.json(r);
}
