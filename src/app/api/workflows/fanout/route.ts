import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { authenticateRequest, requireRoles } from '@/lib/auth'
import { WorkflowRequest } from '@/models/request'
import { User } from '@/models/user'
import mongoose from 'mongoose'

export async function POST(req: NextRequest) {
  const actor = await authenticateRequest(req)
  if (!requireRoles(actor, ['State YP'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const Schema = z.object({ requestId: z.string(), state: z.string(), divisions: z.array(z.string()).optional() })
  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    // Convert Zod error to readable string
    const errorMessages: string[] = [];
    const formatted = parsed.error.format();
    if (formatted.requestId?._errors) errorMessages.push(`Request ID: ${formatted.requestId._errors.join(', ')}`);
    if (formatted.state?._errors) errorMessages.push(`State: ${formatted.state._errors.join(', ')}`);
    if (formatted.divisions?._errors) errorMessages.push(`Divisions: ${formatted.divisions._errors.join(', ')}`);
    return NextResponse.json({ error: errorMessages.length > 0 ? errorMessages.join('; ') : 'Invalid request data' }, { status: 400 })
  }
  
  try {
    await connectDB()
    if (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (mongoose.connection.readyState !== 1) {
        return NextResponse.json({ error: 'Database not available' }, { status: 503 });
      }
    }
    
    const reqDoc = await WorkflowRequest.findById(parsed.data.requestId)
    if (!reqDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
    // If divisions not provided, automatically find all Division HODs for the state
    let divisions: string[] = parsed.data.divisions || [];
    
    if (divisions.length === 0) {
      // Find all Division HODs for this state
      const allDivisionHODs = await User.find({
        'roles.role': 'Division HOD',
        'roles.state': parsed.data.state
      })
      
      // Extract unique divisions from Division HODs
      const divisionSet = new Set<string>();
      allDivisionHODs.forEach((hod: any) => {
        (hod.roles || []).forEach((role: any) => {
          if (role.role === 'Division HOD' && role.state === parsed.data.state && role.branch) {
            divisionSet.add(role.branch);
          }
        });
      });
      divisions = Array.from(divisionSet);
      
      if (divisions.length === 0) {
        return NextResponse.json({ error: `No Division HODs found for ${parsed.data.state}. Please ensure Division HODs are created for this state.` }, { status: 404 });
      }
    }
    
    // Update targets with divisions
    const set = new Set([...(reqDoc.targets?.branches || []), ...divisions])
    reqDoc.targets = reqDoc.targets || { states: [], branches: [], domains: [] }
    reqDoc.targets.branches = Array.from(set)
    
    // Find all Division HODs for the state and divisions, and their corresponding Division YPs
    const divisionHODs = await User.find({
      'roles.role': 'Division HOD',
      'roles.state': parsed.data.state,
      'roles.branch': { $in: divisions }
    })
    
    if (divisionHODs.length === 0) {
      return NextResponse.json({ error: `No Division HODs found for divisions: ${divisions.join(', ')} in ${parsed.data.state}` }, { status: 404 });
    }
    
    // Create division assignments for each division
    const divisionAssignments: any[] = [];
    for (const division of divisions) {
      const hod = divisionHODs.find((h: any) => {
        return (h.roles || []).some((r: any) => r.role === 'Division HOD' && r.state === parsed.data.state && r.branch === division);
      });
      
      if (hod) {
        // Find corresponding Division YP
        const divYP = await User.findOne({
          'roles.role': 'Division YP',
          'roles.state': parsed.data.state,
          'roles.branch': division
        });
        
        // Initialize division assignment with the current request deadline
        divisionAssignments.push({
          division,
          divisionHODId: hod._id,
          divisionYPId: divYP?._id || null,
          status: 'pending',
          deadline: reqDoc.deadline || reqDoc.timeline, // Each division starts with the same deadline, but can be modified independently
        });
      }
    }
    
    // Set division assignments
    reqDoc.divisionAssignments = divisionAssignments;
    
    // Assign to first Division HOD for initial workflow (each HOD will process their own division)
    if (divisionAssignments.length > 0) {
      reqDoc.currentAssigneeId = divisionAssignments[0].divisionHODId;
      console.log(`✅ Fanout: Created ${divisionAssignments.length} division assignments, assigned to first HOD (${divisionHODs[0].email})`);
    }
    
    reqDoc.history.push({ action: 'fanout', userId: actor!._id, timestamp: new Date(), notes: `Fanout to ${divisions.length} divisions in ${parsed.data.state}: ${divisions.join(', ')}` })
    reqDoc.status = 'in-progress'
    await reqDoc.save()
    
    console.log(`✅ Fanout completed: ${divisions.length} divisions (${divisions.join(', ')}), assigned to ${divisionHODs.length} HODs`)
    return NextResponse.json({ ok: true, branches: reqDoc.targets.branches, divisions, assignedHODs: divisionHODs.length, divisionAssignments: divisionAssignments.length })
  } catch (error: any) {
    console.error('❌ Error in fanout:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fanout' }, { status: 500 });
  }
}