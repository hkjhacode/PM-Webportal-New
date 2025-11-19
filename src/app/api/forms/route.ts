import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const parsed = FormSubmitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  await connectDB();
  const tpl = await Template.findById(parsed.data.templateId);
  if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  const check = validateAgainstTemplate(tpl.schemaJson, parsed.data.data);
  if (!check.valid) return NextResponse.json({ error: check.errors }, { status: 400 });
  const doc = await FormSubmission.create({ ...parsed.data, submittedBy: user!._id });
  
  // If Division YP submits form, assign workflow back to their Division HOD for review
  const userRoles = (user.roles || []).map((r: any) => r.role);
  if (userRoles.includes('Division YP')) {
    const { WorkflowRequest } = await import('@/models/request');
    const { User } = await import('@/models/user');
    const request = await WorkflowRequest.findById(parsed.data.requestId);
    if (request) {
      const state = parsed.data.state;
      const division = parsed.data.branch;
      if (state && division) {
        // Find this division's assignment
        const divisionAssignment = request.divisionAssignments?.find((a: any) => 
          a.division === division && String(a.divisionYPId) === String(user._id)
        );
        
        if (divisionAssignment) {
          // Update assignment status
          divisionAssignment.status = 'yp_submitted';
          
          // Assign to this division's HOD
          request.currentAssigneeId = divisionAssignment.divisionHODId;
          request.status = 'in-progress';
          request.history.push({ 
            action: 'form_submitted', 
            userId: user!._id, 
            timestamp: new Date(), 
            notes: `Division YP submitted form for ${division} division` 
          });
          await request.save();
        } else {
          // Fallback to old method if no assignment found
          const divHOD = await User.findOne({ 
            'roles.role': 'Division HOD',
            'roles.state': state,
            'roles.branch': division 
          });
          if (divHOD) {
            request.currentAssigneeId = divHOD._id;
            request.status = 'in-progress';
            request.history.push({ 
              action: 'form_submitted', 
              userId: user!._id, 
              timestamp: new Date(), 
              notes: `Division YP submitted form for ${division} division` 
            });
            await request.save();
          }
        }
      }
    }
  }
  
  return NextResponse.json({ id: String(doc._id) });
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');
  const branch = searchParams.get('branch');
  const state = searchParams.get('state');
  
  const query: any = {};
  if (requestId) {
    const { default: mongoose } = await import('mongoose');
    query.requestId = new mongoose.Types.ObjectId(requestId);
  }
  if (branch) query.branch = branch;
  if (state) query.state = state;
  
  const items = await FormSubmission.find(query).limit(50).sort({ createdAt: -1 });
  return NextResponse.json(items);
}

