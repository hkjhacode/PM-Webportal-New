import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { authenticateRequest, requireRoles } from '@/lib/auth';
import { CreateRequestSchema } from '@/lib/validation';
import { WorkflowRequest } from '@/models/request';
import { FormSubmission } from '@/models/form';
import { mergeForms } from '@/lib/mergeEngine';
import mongoose from 'mongoose';

/**
 * /api/workflows
 * Traceability: FR-04 (create), FR-05 (propagate), FR-06 (filter tasks), FR-07 (approve/reject)
 */

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) {
    console.error('❌ No user authenticated');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userRoles = (user.roles || []).map((r: any) => r.role);
  console.log('🔍 User roles:', userRoles);
  console.log('🔍 User email:', user.email);
  
  if (!requireRoles(user, ['PMO Viewer'])) {
    console.error('❌ User does not have PMO Viewer role. User roles:', userRoles);
    return NextResponse.json({ error: 'Forbidden: PMO Viewer role required' }, { status: 403 });
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
  
  try {
    await connectDB();
    
    // Wait a moment to ensure connection is fully established
    if (mongoose.connection.readyState !== 1) {
      // If not connected, wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 200));
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`MongoDB not connected (readyState: ${mongoose.connection.readyState})`);
      }
    }
    
    // Find CEO NITI to assign the request
    const { User } = await import('@/models/user');
    const ceo = await User.findOne({ 'roles.role': 'CEO NITI' });
    
    const doc = await WorkflowRequest.create({
      title,
      infoNeed,
      timeline,
      deadline: timeline, // Use the selected date as the deadline
      createdBy: user!._id,
      currentAssigneeId: ceo?._id || null, // Assign to CEO NITI if available
      targets,
      status: ceo ? 'in-progress' : 'open',
      history: [{ action: 'created', userId: user!._id, timestamp: new Date(), notes: ceo ? 'Assigned to CEO NITI' : '' }],
    });
    console.log('✅ Request created in MongoDB:', String(doc._id), ceo ? `Assigned to CEO NITI (${ceo.email})` : 'No CEO found');
    return NextResponse.json({ id: String(doc._id) });
  } catch (error: any) {
    console.error('❌ Error creating request:', error.message);
    // In mock mode (DB not available), return a mock ID
    // The request won't persist, but the UI will show success
    if (!process.env.MONGODB_URI || error.message?.includes('buffering') || error.message?.includes('connection') || error.message?.includes('not connected')) {
      const mockId = `REQ-${Date.now()}`;
      console.warn('⚠️ MongoDB not available, returning mock request ID:', mockId);
      console.warn('💡 To use MongoDB, ensure MONGODB_URI is set in .env.local and restart the dev server');
      return NextResponse.json({ id: mockId, mock: true });
    }
    // Re-throw other errors
    return NextResponse.json({ error: error.message || 'Failed to create request' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    await connectDB();
    
    // Wait a moment to ensure connection is fully established
    if (mongoose.connection.readyState !== 1) {
      // If not connected, wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 200));
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`MongoDB not connected (readyState: ${mongoose.connection.readyState})`);
      }
    }
    
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const state = url.searchParams.get('state') || undefined;
    const q: any = {};
    if (status) q.status = status;
    if (state) q['targets.states'] = state;
    
    // Filter by division for Division HOD and Division YP
    const userRoles = (user.roles || []).map((r: any) => r.role);
    const userState = user.state || (user.roles?.[0] as any)?.state;
    const userDivision = user.branch || (user.roles?.[0] as any)?.branch;
    
    if (userRoles.includes('Division HOD') || userRoles.includes('Division YP')) {
      // Filter requests where this division is assigned
      if (userState && userDivision) {
        q['divisionAssignments.division'] = userDivision;
        q['targets.states'] = userState;
      }
    }
    
    const items = await WorkflowRequest.find(q)
      .populate('currentAssigneeId', 'roles email name')
      .populate('createdBy', 'email name roles')
      .populate('history.userId', 'name email roles')
      .populate({
        path: 'divisionAssignments.divisionHODId',
        select: 'email name roles',
        strictPopulate: false
      })
      .populate({
        path: 'divisionAssignments.divisionYPId',
        select: 'email name roles',
        strictPopulate: false
      })
      .sort({ timeline: 1 })
      .limit(50);
    console.log(`✅ Retrieved ${items.length} requests from MongoDB`);
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('❌ Error fetching requests:', error.message);
    // In mock mode (DB not available), return empty array
    // The UI will fall back to showing mock data from src/lib/data.ts
    if (!process.env.MONGODB_URI || error.message?.includes('buffering') || error.message?.includes('connection') || error.message?.includes('not connected')) {
      console.warn('⚠️ MongoDB not available, returning empty array for workflows');
      console.warn('💡 To use MongoDB, ensure MONGODB_URI is set in .env.local and restart the dev server');
      return NextResponse.json([]);
    }
    // Re-throw other errors
    return NextResponse.json({ error: error.message || 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const UpdateSchema = z.object({ 
    id: z.string(), 
    action: z.enum(['approve', 'decline&improve']), 
    notes: z.string().max(1000).optional(),
    revisedDeadline: z.string().optional(), // ISO date string
  });
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  const { id, action, revisedDeadline } = parsed.data;
  let notes: string | undefined = parsed.data.notes;
  
  try {
    await connectDB();
    if (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (mongoose.connection.readyState !== 1) {
        return NextResponse.json({ error: 'Database not available' }, { status: 503 });
      }
    }
    
    const doc = await WorkflowRequest.findById(id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Validate deadline reduction (can only reduce or keep same, never increase)
    // Division YP cannot modify deadlines
    const userRoles = (user.roles || []).map((r: any) => r.role);
    const userState = user.state || (user.roles?.[0] as any)?.state;
    const userDivision = user.branch || (user.roles?.[0] as any)?.branch;
    
    if (userRoles.includes('Division YP') && revisedDeadline) {
      return NextResponse.json({ error: 'Division YP cannot modify deadlines' }, { status: 403 });
    }
    
    if (revisedDeadline) {
      const newDeadline = new Date(revisedDeadline);
      
      // For Division HOD, update the deadline in their division assignment
      if (userRoles.includes('Division HOD') && userDivision && doc.divisionAssignments) {
        const divisionAssignment = doc.divisionAssignments.find((a: any) => 
          a.division === userDivision && String(a.divisionHODId) === String(user._id)
        );
        
        if (divisionAssignment) {
          const currentDivisionDeadline = divisionAssignment.deadline || doc.deadline || doc.timeline;
          if (newDeadline > currentDivisionDeadline) {
            return NextResponse.json({ error: 'Deadline can only be reduced or kept the same, not increased' }, { status: 400 });
          }
          divisionAssignment.deadline = newDeadline;
          // Add note to history about deadline change with division name
          const deadlineNote = `[${userDivision}] Deadline ${newDeadline.getTime() === currentDivisionDeadline.getTime() ? 'kept same' : 'reduced'} from ${new Date(currentDivisionDeadline).toISOString()} to ${newDeadline.toISOString()}`;
          if (!notes || !notes.includes('Deadline')) {
            notes = notes ? `${notes}. ${deadlineNote}` : deadlineNote;
          }
        }
      } else {
        // For other roles, update the main deadline
        const currentDeadline = doc.deadline || doc.timeline;
        if (newDeadline > currentDeadline) {
          return NextResponse.json({ error: 'Deadline can only be reduced or kept the same, not increased' }, { status: 400 });
        }
        doc.deadline = newDeadline;
        // Add note to history about deadline change
        const deadlineNote = `Deadline ${newDeadline.getTime() === currentDeadline.getTime() ? 'kept same' : 'reduced'} from ${new Date(currentDeadline).toISOString()} to ${newDeadline.toISOString()}`;
        if (!notes || !notes.includes('Deadline')) {
          notes = notes ? `${notes}. ${deadlineNote}` : deadlineNote;
        }
      }
    }
    
    // Determine next assignee based on role hierarchy
    let nextAssigneeId = null;
    let nextStatus = doc.status;
    
    if (action === 'approve') {
      // Auto-forward based on role
      if (userRoles.includes('PMO Viewer')) {
        // PMO creates request, goes to CEO NITI
        const ceo = await mongoose.model('User').findOne({ 'roles.role': 'CEO NITI' });
        if (ceo) nextAssigneeId = ceo._id;
        nextStatus = 'in-progress';
      } else if (userRoles.includes('CEO NITI')) {
        // CEO approves, goes to State Advisor for the target state
        const state = doc.targets?.states?.[0];
        if (state) {
          const advisor = await mongoose.model('User').findOne({ 
            'roles.role': 'State Advisor',
            'roles.state': state 
          });
          if (advisor) nextAssigneeId = advisor._id;
        }
        nextStatus = 'in-progress';
      } else if (userRoles.includes('State Advisor')) {
        // State Advisor approves, goes to State YP for the state
        const state = userState || doc.targets?.states?.[0];
        if (state) {
          const stateYP = await mongoose.model('User').findOne({ 
            'roles.role': 'State YP',
            'roles.state': state 
          });
          if (stateYP) nextAssigneeId = stateYP._id;
        }
        nextStatus = 'in-progress';
      } else if (userRoles.includes('State YP')) {
        // State YP approves after merging all division submissions, goes to State Advisor
        const state = userState || doc.targets?.states?.[0];
        if (state) {
          // Merge all division submissions for this request
          const divisionForms = await FormSubmission.find({ 
            requestId: doc._id,
            status: 'approved',
            state: state
          });
          
          if (divisionForms.length > 0) {
            // Merge all division submissions
            const mergedData = mergeForms(divisionForms, {});
            const mergedText = divisionForms.map(f => `[${f.branch || 'Unknown Division'}]\n${f.data?.text || ''}`).join('\n\n---\n\n');
            
            // Create merged form submission
            const mergedForm = await FormSubmission.create({
              requestId: doc._id,
              templateId: divisionForms[0].templateId,
              templateMode: 'merged',
              branch: null,
              state: state,
              submittedBy: user!._id,
              data: { text: mergedText, ...mergedData },
              status: 'merged',
              audit: [{ action: 'merged', userId: user!._id, ts: new Date(), notes: `Merged ${divisionForms.length} division submissions` }]
            });
            
            // Mark division forms as merged
            await FormSubmission.updateMany(
              { _id: { $in: divisionForms.map(f => f._id) } },
              { status: 'merged' }
            );
          }
          
          // Forward to State Advisor
          const advisor = await mongoose.model('User').findOne({ 
            'roles.role': 'State Advisor',
            'roles.state': state 
          });
          if (advisor) nextAssigneeId = advisor._id;
        }
        nextStatus = 'in-progress';
      } else if (userRoles.includes('Division HOD')) {
        // Division HOD logic depends on workflow phase
        const state = userState || doc.targets?.states?.[0];
        const division = user.branch || (user.roles?.[0] as any)?.branch;
        
        // Find this division's assignment
        const divisionAssignment = doc.divisionAssignments?.find((a: any) => 
          a.division === division && String(a.divisionHODId) === String(user._id)
        );
        
        if (!divisionAssignment) {
          return NextResponse.json({ error: 'Division assignment not found for this HOD' }, { status: 403 });
        }
        
        // Check if there are form submissions from Division YP (second pass)
        const { FormSubmission } = await import('@/models/form');
        const formSubmissions = await FormSubmission.find({
          requestId: doc._id,
          branch: division,
          state: state,
          status: { $in: ['submitted', 'approved'] }
        });
        
        if (formSubmissions.length > 0) {
          // SECOND PASS: Form has been submitted, mark this division as approved
          divisionAssignment.status = 'hod_approved_form';
          divisionAssignment.approvedAt = new Date();
          
          // Check if all divisions have approved their forms
          const allApproved = doc.divisionAssignments?.every((a: any) => 
            a.status === 'hod_approved_form' || a.status === 'completed'
          );
          
          if (allApproved && doc.divisionAssignments && doc.divisionAssignments.length > 0) {
            // All divisions approved, forward to State YP for merging
            if (state) {
              const stateYP = await mongoose.model('User').findOne({ 
                'roles.role': 'State YP',
                'roles.state': state 
              });
              if (stateYP) nextAssigneeId = stateYP._id;
            }
          } else {
            // Not all divisions approved yet, keep current assignee (this HOD)
            // But mark this division as complete
            nextAssigneeId = doc.currentAssigneeId;
          }
        } else {
          // FIRST PASS: No form submission yet, forward to this division's Division YP
          // Set currentAssigneeId to this division's YP, but other divisions will still see it via divisionAssignments
          if (divisionAssignment.divisionYPId) {
            nextAssigneeId = divisionAssignment.divisionYPId;
            divisionAssignment.status = 'hod_approved';
            // Note: We set currentAssigneeId to this division's YP, but other Division HODs
            // will still see the request because the GET endpoint filters by divisionAssignments
          }
        }
        nextStatus = 'in-progress';
      } else if (userRoles.includes('Division YP')) {
        // Division YP submits, goes back to their Division HOD for approval
        const state = userState || doc.targets?.states?.[0];
        const division = user.branch || (user.roles?.[0] as any)?.branch;
        if (state && division) {
          const divHOD = await mongoose.model('User').findOne({ 
            'roles.role': 'Division HOD',
            'roles.state': state,
            'roles.branch': division 
          });
          if (divHOD) nextAssigneeId = divHOD._id;
        }
        nextStatus = 'in-progress';
      }
    } else if (action === 'decline&improve') {
      // Decline and improve - send back to previous level with new deadline
      // Note: Division HOD decline&improve is handled via form rejection in /api/forms/[id]
      if (userRoles.includes('State Advisor')) {
        // Send back to State YP
        const state = userState || doc.targets?.states?.[0];
        if (state) {
          const stateYP = await mongoose.model('User').findOne({ 
            'roles.role': 'State YP',
            'roles.state': state 
          });
          if (stateYP) nextAssigneeId = stateYP._id;
        }
      } else if (userRoles.includes('CEO NITI')) {
        // Send back to State Advisor
        const state = doc.targets?.states?.[0];
        if (state) {
          const advisor = await mongoose.model('User').findOne({ 
            'roles.role': 'State Advisor',
            'roles.state': state 
          });
          if (advisor) nextAssigneeId = advisor._id;
        }
      }
      nextStatus = 'in-progress';
    }
    
    if (nextAssigneeId) {
      doc.currentAssigneeId = nextAssigneeId;
    }
    
    doc.status = nextStatus;
    
    // Add division name to notes if this is a division-specific action
    let historyNotes = notes || (revisedDeadline ? `Deadline revised to ${new Date(revisedDeadline).toISOString()}` : '');
    if ((userRoles.includes('Division HOD') || userRoles.includes('Division YP')) && userDivision) {
      const divisionPrefix = `[${userDivision}] `;
      if (historyNotes && !historyNotes.startsWith(divisionPrefix)) {
        historyNotes = divisionPrefix + historyNotes;
      } else if (!historyNotes) {
        historyNotes = divisionPrefix + (action === 'approve' ? 'approved' : action === 'declined&improved' ? 'declined & improved' : 'updated');
      }
    }
    
    doc.history.push({ 
      action: action === 'approve' ? 'approved' : 'declined&improved', 
      userId: user!._id, 
      timestamp: new Date(), 
      notes: historyNotes || undefined
    });
    
    await doc.save();
    console.log(`✅ Request ${action} by ${user.email}, next assignee: ${nextAssigneeId ? 'assigned' : 'none'}`);
    return NextResponse.json({ ok: true, nextAssigneeId: nextAssigneeId ? String(nextAssigneeId) : null });
  } catch (error: any) {
    console.error('❌ Error updating workflow:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to update workflow' }, { status: 500 });
  }
}

