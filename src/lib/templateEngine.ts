/**
 * Template Engine
 * Traceability: FR-08/FR-09 — validate and apply template schemas to forms.
 */
export function validateAgainstTemplate(schema: any, data: any): { valid: boolean; errors?: string[] } {
  // Minimal validator: ensure required sections exist
  const errors: string[] = [];
  if (!schema || !schema.sections) {
    return { valid: false, errors: ['Invalid schema: missing sections'] };
  }
  const requiredSections = (schema.sections || [])
    .filter((s: any) => s.required)
    .map((s: any) => s.id);

  for (const sec of requiredSections) {
    if (!(sec in data)) errors.push(`Missing required section: ${sec}`);
  }

  return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
}

