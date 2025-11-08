import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { FormSubmission } from '@/models/form';
import { GeneratedDoc } from '@/models/doc';
import { renderDocx } from '@/lib/docGen';
/**
 * /api/docs
 * Traceability: FR-10 — document generation and storage
 */
export async function POST(req) {
    const user = await authenticateRequest(req);
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const Schema = z.object({ formId: z.string(), outputFormat: z.enum(['docx', 'pdf']).default('docx') });
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success)
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    await connectDB();
    const form = await FormSubmission.findById(parsed.data.formId);
    if (!form)
        return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    // For MVP, use a simple embedded template; production loads from file/DB.
    const templateBuffer = Buffer.from(`UEsDBAoAAAAAAI8bZ1YAAAAAAAAAAAAAAAAUAAAAd29yZC9kb2N1bWVudC5kb2NcUEsBAh4DCgAAAAAAjxtnVgAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAB3b3JkL2RvY3VtZW50LmRvY1BLBQYAAAAAAQABADYAAAABAAAAAA==`, 'base64');
    const context = form.data || {};
    const buffer = await renderDocx(templateBuffer, context);
    const doc = await GeneratedDoc.create({ formId: form._id, type: 'docx', createdBy: user._id, size: buffer.length, content: buffer });
    return NextResponse.json({ id: String(doc._id), size: buffer.length });
}
export async function GET(req) {
    const user = await authenticateRequest(req);
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id)
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await connectDB();
    const doc = await GeneratedDoc.findById(id);
    if (!doc)
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Simple access control: creator or approver roles
    // In MVP, allow any authenticated user. Strengthen in production.
    return new NextResponse(doc.content, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename=form-${String(doc.formId)}.docx`,
        },
    });
}
