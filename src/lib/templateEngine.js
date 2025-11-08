/**
 * Template Engine
 * Traceability: FR-08/FR-09 — validate and apply template schemas to forms.
 */
export function validateAgainstTemplate(schema, data) {
    // Minimal validator: ensure required sections exist
    const errors = [];
    if (!schema || !schema.sections) {
        return { valid: false, errors: ['Invalid schema: missing sections'] };
    }
    const requiredSections = (schema.sections || [])
        .filter((s) => s.required)
        .map((s) => s.id);
    for (const sec of requiredSections) {
        if (!(sec in data))
            errors.push(`Missing required section: ${sec}`);
    }
    return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
}
