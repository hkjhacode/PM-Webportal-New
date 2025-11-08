import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WorkflowRequest } from '@/models/request';
import { FormSubmission } from '@/models/form';
/**
 * /api/analytics
 * Traceability: FR-17/FR-18 — dashboards and exports (MVP aggregates)
 */
export async function GET() {
    await connectDB();
    const totalRequests = await WorkflowRequest.countDocuments();
    const totalForms = await FormSubmission.countDocuments();
    const overdue = await WorkflowRequest.countDocuments({ deadline: { $lt: new Date() }, status: { $ne: 'closed' } });
    return NextResponse.json({ totalRequests, totalForms, overdue });
}
