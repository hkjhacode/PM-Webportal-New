import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { authenticateRequest, requireRoles } from '@/lib/auth';
import { FormSubmission } from '@/models/form';
import { mergeForms, MergeStrategy } from '@/lib/mergeEngine';

/**
 * /api/merge
 * Traceability: FR-11 — consolidation of child forms
 */

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!requireRoles(user, ['Division HOD', 'State YP', 'State Advisor', 'CEO NITI'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const Schema = z.object({ 
    parentFormId: z.string().optional(), 
    requestId: z.string().optional(),
    childFormIds: z.array(z.string()).min(1), 
    strategy: z.record(z.enum(['sum', 'avg', 'max', 'min', 'concat'])).optional() 
  });
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  
  try {
    await connectDB();
    const children = await FormSubmission.find({ _id: { $in: parsed.data.childFormIds } });
    if (children.length === 0) {
      return NextResponse.json({ error: 'No forms found to merge' }, { status: 404 });
    }
    
    // Default strategy: concat text fields, sum numeric fields
    const defaultStrategy: MergeStrategy = parsed.data.strategy || {};
    const mergedData = mergeForms(children, defaultStrategy);
    
    // If requestId is provided and user is State YP, create a merged form submission
    if (parsed.data.requestId && requireRoles(user, ['State YP'])) {
      const requestId = parsed.data.requestId;
      const mergedText = children.map(c => `[${c.branch || 'Unknown Division'}]\n${c.data?.text || ''}`).join('\n\n---\n\n');
      const mergedForm = await FormSubmission.create({
        requestId,
        templateId: children[0].templateId,
        templateMode: 'merged',
        branch: null,
        state: children[0].state,
        submittedBy: user!._id,
        data: { text: mergedText, ...mergedData },
        status: 'merged',
        audit: [{ action: 'merged', userId: user!._id, ts: new Date(), notes: `Merged ${children.length} division submissions` }]
      });
      return NextResponse.json({ merged: mergedData, mergedFormId: String(mergedForm._id) });
    }
    
    return NextResponse.json({ merged: mergedData });
  } catch (error: any) {
    console.error('❌ Error merging forms:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to merge forms' }, { status: 500 });
  }
}

