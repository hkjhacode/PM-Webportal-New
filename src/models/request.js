import { Schema, model, models } from 'mongoose';
/**
 * WorkflowRequest Model
 * Traceability: FR-04 (create), FR-05 (propagate), FR-06/07 (filter, approve/reject), FR-12-14 (deadlines, alerts, escalation)
 */
const HistorySchema = new Schema({
    action: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
}, { _id: false });
const TargetsSchema = new Schema({
    states: { type: [String], default: [] },
    branches: { type: [String], default: [] },
    domains: { type: [String], default: [] },
}, { _id: false });
const WorkflowRequestSchema = new Schema({
    title: { type: String, required: true },
    infoNeed: { type: String, required: true, maxlength: 500 },
    timeline: { type: Date, required: true },
    deadline: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'approved', 'rejected', 'closed'],
        default: 'open',
    },
    targets: { type: TargetsSchema, required: true },
    history: { type: [HistorySchema], default: [] },
    currentAssigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const WorkflowRequest = models.WorkflowRequest || model('WorkflowRequest', WorkflowRequestSchema);
