import { Schema, model, models } from 'mongoose';
/**
 * GeneratedDoc Model
 * Traceability: FR-10 (document generation), FR-18 (exports)
 * Note: For MVP, storing content buffer in collection; production should use GridFS.
 */
const GeneratedDocSchema = new Schema({
    formId: { type: Schema.Types.ObjectId, ref: 'FormSubmission', required: true },
    type: { type: String, enum: ['docx', 'pdf'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    size: { type: Number },
    storageRef: { type: String },
    content: { type: Buffer },
}, { timestamps: true });
export const GeneratedDoc = models.GeneratedDoc || model('GeneratedDoc', GeneratedDocSchema);
