import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { authenticateRequest, requireRoles } from '@/lib/auth';
import { WorkflowRequest } from '@/models/request';
import { FormSubmission } from '@/models/form';
import mongoose from 'mongoose';

/**
 * DELETE /api/workflows/[id]
 * Delete a workflow request (PMO and CEO NITI only)
 */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only PMO Viewer and CEO NITI can delete requests
  if (!requireRoles(user, ['PMO Viewer', 'CEO NITI'])) {
    return NextResponse.json({ error: 'Forbidden: Only PMO and CEO NITI can delete requests' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectDB();
    if (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (mongoose.connection.readyState !== 1) {
        return NextResponse.json({ error: 'Database not available' }, { status: 503 });
      }
    }

    // Find the request
    const request = await WorkflowRequest.findById(id);
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Delete all associated form submissions first
    const formCount = await FormSubmission.countDocuments({ requestId: id });
    if (formCount > 0) {
      await FormSubmission.deleteMany({ requestId: id });
      console.log(`🗑️  Deleted ${formCount} form submissions for request ${id}`);
    }

    // Delete the request
    await WorkflowRequest.findByIdAndDelete(id);
    console.log(`✅ Request ${id} deleted by ${user.email}`);

    return NextResponse.json({ ok: true, deletedForms: formCount });
  } catch (error: any) {
    console.error('❌ Error deleting request:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to delete request' }, { status: 500 });
  }
}

