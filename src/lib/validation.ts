import { z } from 'zod';

/**
 * Common validation schemas aligning to SRS requirements.
 * Traceability: FR-04 (request creation), FR-08 (form submission), FR-12 (deadlines)
 */
export const CreateRequestSchema = z.object({
  title: z.string().min(1).max(200),
  infoNeed: z.string().min(1).max(500),
  timeline: z.string().transform((s) => new Date(s)),
  targets: z.object({
    states: z.array(z.string()).min(1),
    branches: z.array(z.string()).optional().default([]),
    domains: z.array(z.string()).optional().default([]),
  }),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1), // Allow any non-empty password (min 1 char for security)
  action: z.string().optional(),
});

export const FormSubmitSchema = z.object({
  requestId: z.string(),
  templateMode: z.string(),
  templateId: z.string(),
  branch: z.string().optional(),
  state: z.string().optional(),
  data: z.record(z.any()),
  attachments: z.array(
    z.object({ filename: z.string(), storageRef: z.string().optional(), size: z.number().optional() })
  ).optional().default([]),
});