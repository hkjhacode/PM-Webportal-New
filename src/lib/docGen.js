import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
/**
 * Document Generation
 * Traceability: FR-10 — generate DOCX from form data and templates.
 */
export async function renderDocx(templateBuffer, context) {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });
    doc.setData(context);
    try {
        doc.render();
    }
    catch (error) {
        throw new Error(`Doc generation failed: ${error.message}`);
    }
    const out = doc.getZip().generate({ type: 'nodebuffer' });
    return out;
}
