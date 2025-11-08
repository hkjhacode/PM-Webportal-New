import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Template Model
 * Traceability: Forms & Document Generation (FR-08, FR-09, FR-10, FR-11)
 */
const TemplateSchema = new Schema(
  {
    mode: { type: String, required: true },
    name: { type: String, required: true },
    version: { type: String, required: true },
    schemaJson: { type: Schema.Types.Mixed, required: true },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export type TemplateDoc = mongoose.InferSchemaType<typeof TemplateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Template = models.Template || model('Template', TemplateSchema);