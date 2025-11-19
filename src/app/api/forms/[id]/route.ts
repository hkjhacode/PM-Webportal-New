import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { authenticateRequest, requireRoles } from '@/lib/auth'
import { FormSubmission } from '@/models/form'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  
  // Support both action-based updates and data editing
  if (body.action) {
    // Action-based update (approve/reject)
    const Schema = z.object({ action: z.enum(['approve', 'reject']), notes: z.string().optional() })
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    await connectDB()
    const doc = await FormSubmission.findById(id)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const canApprove = requireRoles(user, ['Division HOD', 'State YP', 'State Advisor', 'CEO NITI'])
    if (!canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    const userRoles = (user.roles || []).map((r: any) => r.role);
    doc.status = parsed.data.action === 'approve' ? 'approved' : 'rejected'
    doc.audit.push({ action: parsed.data.action, userId: user._id, ts: new Date(), notes: parsed.data.notes })
    await doc.save()
    
    // If Division HOD approves form, update division assignment and check if all are approved
    if (userRoles.includes('Division HOD') && parsed.data.action === 'approve') {
      const { WorkflowRequest } = await import('@/models/request');
      const { User } = await import('@/models/user');
      const request = await WorkflowRequest.findById(doc.requestId);
      if (request) {
        const state = doc.state;
        const division = doc.branch;
        
        // Find this division's assignment
        const divisionAssignment = request.divisionAssignments?.find((a: any) => 
          a.division === division && String(a.divisionHODId) === String(user._id)
        );
        
        if (divisionAssignment) {
          divisionAssignment.status = 'hod_approved_form';
          divisionAssignment.approvedAt = new Date();
          
          // Check if all divisions have approved their forms
          const allApproved = request.divisionAssignments?.every((a: any) => 
            a.status === 'hod_approved_form' || a.status === 'completed'
          );
          
          if (allApproved && request.divisionAssignments && request.divisionAssignments.length > 0) {
            // All divisions approved, forward to State YP for merging
            if (state) {
              const stateYP = await User.findOne({ 
                'roles.role': 'State YP',
                'roles.state': state 
              });
              if (stateYP) {
                request.currentAssigneeId = stateYP._id;
                request.status = 'in-progress';
                request.history.push({ 
                  action: 'form_approved', 
                  userId: user._id, 
                  timestamp: new Date(), 
                  notes: `All divisions approved. Forwarding to State YP for merging.` 
                });
                await request.save();
              }
            }
          } else {
            // Not all divisions approved yet, just update the assignment
            request.history.push({ 
              action: 'form_approved', 
              userId: user._id, 
              timestamp: new Date(), 
              notes: `Division HOD approved form for ${division || 'division'}. Waiting for other divisions.` 
            });
            await request.save();
          }
        }
      }
    }
    
    // If Division HOD rejects form, send back to Division YP
    if (userRoles.includes('Division HOD') && parsed.data.action === 'reject') {
      const { WorkflowRequest } = await import('@/models/request');
      const { User } = await import('@/models/user');
      const request = await WorkflowRequest.findById(doc.requestId);
      if (request) {
        const state = doc.state;
        const division = doc.branch;
        
        // Find this division's assignment
        const divisionAssignment = request.divisionAssignments?.find((a: any) => 
          a.division === division && String(a.divisionHODId) === String(user._id)
        );
        
        if (divisionAssignment && divisionAssignment.divisionYPId) {
          // Reset assignment status and send back to Division YP
          divisionAssignment.status = 'yp_submitted'; // Reset to allow resubmission
          request.currentAssigneeId = divisionAssignment.divisionYPId;
          request.status = 'in-progress';
          request.history.push({ 
            action: 'form_rejected', 
            userId: user._id, 
            timestamp: new Date(), 
            notes: `Division HOD rejected form for ${division} - needs improvement` 
          });
          await request.save();
        } else {
          // Fallback to old method
          if (state && division) {
            const divYP = await User.findOne({ 
              'roles.role': 'Division YP',
              'roles.state': state,
              'roles.branch': division 
            });
            if (divYP) {
              request.currentAssigneeId = divYP._id;
              request.status = 'in-progress';
              request.history.push({ 
                action: 'form_rejected', 
                userId: user._id, 
                timestamp: new Date(), 
                notes: `Division HOD rejected form for ${division} - needs improvement` 
              });
              await request.save();
            }
          }
        }
      }
    }
    
    return NextResponse.json({ ok: true })
  } else if (body.data) {
    // Data editing (Division HOD can edit)
    const Schema = z.object({ data: z.any() })
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    await connectDB()
    const doc = await FormSubmission.findById(id)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const canEdit = requireRoles(user, ['Division HOD'])
    if (!canEdit) return NextResponse.json({ error: 'Forbidden: Only Division HOD can edit documents' }, { status: 403 })
    doc.data = parsed.data.data
    doc.audit.push({ action: 'edited', userId: user._id, ts: new Date(), notes: 'Document edited by Division HOD' })
    await doc.save()
    return NextResponse.json({ ok: true })
  } else {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}