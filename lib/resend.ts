import { Resend } from "resend";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return null;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "FyMenu <noreply@fymenu.com>",
      to,
      subject,
      html,
    });
    if (error) console.error("Email error:", error);
    return data;
  } catch (err) {
    console.error("Email send failed:", err);
    return null;
  }
}
