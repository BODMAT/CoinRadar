const EMAIL_FROM =
  process.env.EMAIL_FROM || "CoinRadar <no-reply@coinradar.local>";
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || "http://localhost:4000";

export type EmailPurpose = "verify_email";

export interface SentEmailRecord {
  to: string;
  subject: string;
  purpose: EmailPurpose;
  token?: string;
  text: string;
  html: string;
  sentAt: Date;
}

const captured: SentEmailRecord[] = [];

interface DispatchArgs {
  to: string;
  subject: string;
  purpose: EmailPurpose;
  text: string;
  html: string;
  token?: string;
}

const parseSender = (from: string): { name: string; email: string } => {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match?.[1] && match?.[2])
    return { name: match[1].trim(), email: match[2].trim() };
  return { name: "CoinRadar", email: from.trim() };
};

const dispatch = async (args: DispatchArgs): Promise<void> => {
  const { to, subject, purpose, text, html, token } = args;

  if (process.env.NODE_ENV === "test") {
    captured.push({
      to,
      subject,
      purpose,
      text,
      html,
      sentAt: new Date(),
      ...(token !== undefined && { token }),
    });
    return;
  }

  if (!BREVO_API_KEY) {
    console.warn(
      `[emailService] BREVO_API_KEY not set - email not sent.\n[${purpose}] -> ${to}\n${text}`,
    );
    return;
  }

  const sender = parseSender(EMAIL_FROM);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API error ${response.status}: ${body}`);
  }
};

const wrapHtml = (title: string, body: string): string => `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<h2 style="margin:0 0 16px">${title}</h2>
${body}
<hr style="margin:32px 0;border:none;border-top:1px solid #eee" />
<p style="font-size:12px;color:#888">CoinRadar - automated message. Do not reply.</p>
</body></html>`;

export const sendVerificationEmail = async (to: string, token: string) => {
  const link = `${API_PUBLIC_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "Confirm your CoinRadar email";
  const text = `Welcome to CoinRadar!

Click the link to confirm your email and activate your account:

${link}

The link expires in 24 hours. If you did not register, ignore this email.`;
  const html = wrapHtml(
    "Confirm your email",
    `<p>Welcome to CoinRadar!</p>
<p>Click the button to confirm your email and activate your account:</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;border-radius:8px;text-decoration:none">Confirm email</a></p>
<p style="font-size:12px;color:#666">Or open this link:<br/>${link}</p>
<p>The link expires in 24 hours. If you did not register, ignore this email.</p>`,
  );

  return dispatch({ to, subject, purpose: "verify_email", text, html, token });
};

// Test helpers - only meaningful when NODE_ENV === "test".
export const __getCapturedEmails = (): readonly SentEmailRecord[] => captured;
export const __resetCapturedEmails = (): void => {
  captured.length = 0;
};
