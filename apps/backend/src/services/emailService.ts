import nodemailer, { type Transporter } from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM =
  process.env.SMTP_FROM || "CoinRadar <no-reply@coinradar.local>";
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

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  if (process.env.NODE_ENV === "test") {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  } else if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.warn(
      "[emailService] SMTP_* env vars not set - using jsonTransport. Emails will be logged, not delivered.",
    );
  }

  return transporter;
};

interface DispatchArgs {
  to: string;
  subject: string;
  purpose: EmailPurpose;
  text: string;
  html: string;
  token?: string;
}

const dispatch = async (args: DispatchArgs) => {
  const { to, subject, purpose, text, html, token } = args;
  const info = await getTransporter().sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

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
  } else if (!SMTP_HOST) {
    console.info(`[emailService][${purpose}] -> ${to}\n${text}`);
  }

  return info;
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
