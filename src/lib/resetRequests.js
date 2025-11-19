const mongoose = require('mongoose');

const WorkflowRequestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  infoNeed: { type: String, required: true },
  timeline: { type: Date, required: true },
  deadline: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'in-progress', 'approved', 'rejected', 'closed'], default: 'open' },
  targets: {
    states: { type: [String], default: [] },
    branches: { type: [String], default: [] },
    domains: { type: [String], default: [] },
  },
  history: [{
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
  }],
  currentAssigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const FormSubmissionSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowRequest', required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
  templateMode: { type: String, required: true },
  branch: { type: String },
  state: { type: String },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  attachments: [{
    filename: { type: String, required: true },
    storageRef: { type: String },
    size: { type: Number },
  }],
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected', 'merged'], default: 'submitted' },
  audit: [{
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ts: { type: Date, default: Date.now },
    notes: { type: String },
  }],
}, { timestamps: true });

const WorkflowRequest = mongoose.models.WorkflowRequest || mongoose.model('WorkflowRequest', WorkflowRequestSchema);
const FormSubmission = mongoose.models.FormSubmission || mongoose.model('FormSubmission', FormSubmissionSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitwise';

async function resetRequests() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    // Count existing requests
    const requestCount = await WorkflowRequest.countDocuments({});
    console.log(`📊 Found ${requestCount} workflow requests`);

    // Count existing form submissions
    const formCount = await FormSubmission.countDocuments({});
    console.log(`📊 Found ${formCount} form submissions`);

    if (requestCount === 0 && formCount === 0) {
      console.log('✅ No requests or forms to delete. Database is already clean.');
      await mongoose.connection.close();
      return;
    }

    // Delete all form submissions first (they reference requests)
    if (formCount > 0) {
      const formResult = await FormSubmission.deleteMany({});
      console.log(`🗑️  Deleted ${formResult.deletedCount} form submissions`);
    }

    // Delete all workflow requests
    if (requestCount > 0) {
      const requestResult = await WorkflowRequest.deleteMany({});
      console.log(`🗑️  Deleted ${requestResult.deletedCount} workflow requests`);
    }

    console.log('✅ All requests and related data have been reset successfully!');
    console.log('💡 You can now create new requests from PMO level.');

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error resetting requests:', error);
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(1);
  }
}

resetRequests();

