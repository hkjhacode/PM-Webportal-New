import sgMail from '@sendgrid/mail';
import Twilio from 'twilio';
/**
 * Notifications Service
 * Traceability: FR-12 (deadlines), FR-13 (alerts), FR-14 (escalations)
 */
const SENDGRID_KEY = process.env.SENDGRID_API_KEY || '';
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_FROM || '';
if (SENDGRID_KEY)
    sgMail.setApiKey(SENDGRID_KEY);
const twilioClient = TWILIO_SID && TWILIO_TOKEN ? new Twilio(TWILIO_SID, TWILIO_TOKEN) : null;
export async function sendEmail(to, subject, text) {
    if (!SENDGRID_KEY) {
        console.warn('SendGrid not configured; skipping email send');
        return { skipped: true };
    }
    await sgMail.send({ to, from: process.env.SENDGRID_FROM || 'noreply@example.com', subject, text });
    return { ok: true };
}
export async function sendSMS(to, body) {
    if (!twilioClient || !TWILIO_FROM) {
        console.warn('Twilio not configured; skipping SMS send');
        return { skipped: true };
    }
    await twilioClient.messages.create({ from: TWILIO_FROM, to, body });
    return { ok: true };
}
