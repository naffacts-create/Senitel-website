import { Resend } from "resend";

// Lazily constructed so the build (which has no env vars) doesn't throw.
let _resend: Resend | null = null;
function client() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendAlertEmail(to: string, subject: string, body: string) {
  const from = process.env.ALERT_FROM_EMAIL ?? "alerts@sentinel.app";
  try {
    const { error } = await client().emails.send({
      from,
      to,
      subject,
      text: body,
    });
    if (error) {
      console.error("Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send alert email:", err);
    return false;
  }
}
