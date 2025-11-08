import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { FormSubmitSchema } from '@/lib/validation';
import { FormSubmission } from '@/models/form';
import { Template } from '@/models/template';
import { validateAgainstTemplate } from '@/lib/templateEngine';
/**
 * /api/forms
 * Traceability: FR-08 (submit), FR-09/FR-10 (validate+approve pathways)
 */
export async function POST(req) {
    const user = await authenticateRequest(req);
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const parsed = FormSubmitSchema.safeParse(body);
    if (!parsed.success)
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    await connectDB();
    const tpl = await Template.findById(parsed.data.templateId);
    if (!tpl)
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    const check = validateAgainstTemplate(tpl.schemaJson, parsed.data.data);
    if (!check.valid)
        return NextResponse.json({ error: check.errors }, { status: 400 });
    const doc = await FormSubmission.create(Object.assign(Object.assign({}, parsed.data), { submittedBy: user._id }));
    return NextResponse.json({ id: String(doc._id) });
}
export async function GET() {
    await connectDB();
    const items = await FormSubmission.find({}).limit(50);
    return NextResponse.json(items);
}
