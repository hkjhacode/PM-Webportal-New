import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { authenticateRequest, requireRoles } from '@/lib/auth';
import { User } from '@/models/user';
import { Template } from '@/models/template';
import { WorkflowRequest } from '@/models/request';
import { FormSubmission } from '@/models/form';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Dev-only guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Not allowed in production' }, { status: 403 });
  }

  const user = await authenticateRequest(req);
  if (!requireRoles(user, ['Super Admin', 'Admin'])) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  // Pick an admin user to own created docs
  const admin =
    user || (await User.findOne({ 'roles.role': { $in: ['Super Admin', 'Admin'] } })) || (await User.findOne({}));
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'No users found to assign ownership' }, { status: 400 });
  }

  // Ensure default templates
  const upserts = [
    {
      mode: 'Energy',
      name: 'Energy Mode Template',
      version: '1.0',
      isDefault: true,
      createdBy: admin._id,
      schemaJson: {
        sections: [
          { id: 'mw_stats', type: 'table', columns: ['Source', 'CapacityMW', 'Share%'] },
          { id: 'notes', type: 'textarea' },
        ],
      },
    },
    {
      mode: 'Tourism',
      name: 'Tourism Mode Template',
      version: '1.0',
      isDefault: true,
      createdBy: admin._id,
      schemaJson: {
        sections: [
          { id: 'visitor_growth', type: 'chart', series: ['Year', 'Visitors'] },
          { id: 'festivals', type: 'list' },
        ],
      },
    },
  ];

  const templates: any[] = [];
  for (const t of upserts) {
    const existing = await Template.findOne({ mode: t.mode, isDefault: true });
    if (existing) templates.push(existing);
    else templates.push(await Template.create(t));
  }

  const energyTemplate = templates.find((t) => t.mode === 'Energy');

  // Create a demo workflow request
  const request =
    (await WorkflowRequest.findOne({ title: 'Andaman Energy Data Collection' })) ||
    (await WorkflowRequest.create({
      title: 'Andaman Energy Data Collection',
      infoNeed: 'Collect MW capacity and non-fossil shares by source',
      timeline: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdBy: admin._id,
      status: 'open',
      targets: { states: ['Andaman & Nicobar'], branches: ['Energy'], domains: ['Energy'] },
      history: [{ action: 'create', userId: admin._id, timestamp: new Date() }],
    }));

  // Create a demo form submission
  const existingForm = await FormSubmission.findOne({ requestId: request._id });
  if (!existingForm && energyTemplate) {
    await FormSubmission.create({
      requestId: request._id,
      templateId: energyTemplate._id,
      templateMode: 'Energy',
      branch: 'Energy',
      state: 'Andaman & Nicobar',
      submittedBy: admin._id,
      data: {
        mw_stats: [
          { Source: 'Solar', CapacityMW: 25, 'Share%': 12 },
          { Source: 'Wind', CapacityMW: 10, 'Share%': 5 },
        ],
        notes: 'Initial submission for Energy stats.'
      },
      status: 'submitted',
    });
  }

  return NextResponse.json({ ok: true, seeded: true });
}

