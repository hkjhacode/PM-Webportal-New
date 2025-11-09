// Dev-only demo data seeder for dashboards/forms
// Uses local schemas to avoid TS import issues
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  roles: [{ role: String, state: String, branch: String }],
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const TemplateSchema = new mongoose.Schema(
  {
    mode: String,
    name: String,
    version: String,
    schemaJson: mongoose.Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
const Template = mongoose.models.Template || mongoose.model('Template', TemplateSchema);

const WorkflowRequestSchema = new mongoose.Schema(
  {
    title: String,
    infoNeed: String,
    timeline: Date,
    deadline: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'open' },
    targets: { states: [String], branches: [String], domains: [String] },
    history: [
      { action: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: Date, notes: String },
    ],
    currentAssigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
const WorkflowRequest =
  mongoose.models.WorkflowRequest || mongoose.model('WorkflowRequest', WorkflowRequestSchema);

const FormSubmissionSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowRequest' },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    templateMode: String,
    branch: String,
    state: String,
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    data: mongoose.Schema.Types.Mixed,
    attachments: [{ filename: String, storageRef: String, size: Number }],
    status: { type: String, default: 'submitted' },
    audit: [
      { action: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, ts: Date, notes: String },
    ],
  },
  { timestamps: true }
);
const FormSubmission =
  mongoose.models.FormSubmission || mongoose.model('FormSubmission', FormSubmissionSchema);

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hierarchyflow';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB for demo seed');

  // Pick a Super Admin if exists, else any user
  let admin = await User.findOne({ 'roles.role': 'Super Admin' });
  if (!admin) admin = await User.findOne({});
  if (!admin) throw new Error('No users found. Please seed users first.');

  // Create default templates if not present
  const energyTpl = await Template.findOne({ mode: 'Energy', isDefault: true });
  const tourismTpl = await Template.findOne({ mode: 'Tourism', isDefault: true });
  const tplDocs = [];
  if (!energyTpl) {
    tplDocs.push({
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
    });
  }
  if (!tourismTpl) {
    tplDocs.push({
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
    });
  }
  const createdTemplates = tplDocs.length ? await Template.insertMany(tplDocs) : [];
  const energyTemplateId = (energyTpl || createdTemplates.find((t) => t.mode === 'Energy'))?._id;
  const tourismTemplateId = (tourismTpl || createdTemplates.find((t) => t.mode === 'Tourism'))?._id;

  // Create a sample request
  const existingReq = await WorkflowRequest.findOne({ title: 'Andaman Energy Data Collection' });
  const request =
    existingReq ||
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

  // Create a sample form submission linked to the request
  const existingForm = await FormSubmission.findOne({ requestId: request._id });
  if (!existingForm && energyTemplateId) {
    await FormSubmission.create({
      requestId: request._id,
      templateId: energyTemplateId,
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
    });
  }

  console.log('Demo data seeded: templates, request, and form.');
  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('Demo seed failed:', err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});

