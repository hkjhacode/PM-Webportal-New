import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { authenticateRequest, requireRoles } from '@/lib/auth';
import { FormSubmission } from '@/models/form';
import { mergeForms } from '@/lib/mergeEngine';
/**
 * /api/merge
 * Traceability: FR-11 — consolidation of child forms
 */
export async function POST(req) {
    const user = await authenticateRequest(req);
    if (!requireRoles(user, ['Division HOD', 'State Advisor', 'CEO NITI'])) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const Schema = z.object({ parentFormId: z.string(), childFormIds: z.array(z.string()).min(1), strategy: z.record(z.enum(['sum', 'avg', 'max', 'min', 'concat'])) });
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success)
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    await connectDB();
    const children = await FormSubmission.find({ _id: { $in: parsed.data.childFormIds } });
    const mergedData = mergeForms(children, parsed.data.strategy);
    return NextResponse.json({ merged: mergedData });
}
