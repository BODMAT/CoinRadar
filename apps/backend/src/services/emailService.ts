import nodemailer, { type Transporter } from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM =
  process.env.SMTP_FROM || "CoinRadar <no-reply@coinradar.local>";
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || "http://localhost:4000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export type EmailPurpose =
  | "verify_email"
  | "merge_google"
  | "delete_account"
  | "one_time_password";

export interface SentEmailRecord {
  to: string;
  subject: string;
  purpose: EmailPurpose;
  token?: string;
  otp?: string;
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
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[emailService] SMTP_* env vars not set - using jsonTransport. Emails will be logged, not delivered.",
      );
    }
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
  otp?: string;
}

const dispatch = async (args: DispatchArgs) => {
  const { to, subject, purpose, text, html, token, otp } = args;
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
      ...(otp !== undefined && { otp }),
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

export const sendGoogleMergeConfirmationEmail = async (
  to: string,
  token: string,
) => {
  const link = `${API_PUBLIC_URL}/api/auth/verify-merge?token=${encodeURIComponent(token)}`;
  const subject = "Confirm linking Google to your CoinRadar account";
  const text = `Someone tried to sign in with Google using this email address.

If that was you, confirm the link to attach Google to your existing CoinRadar account:

${link}

The link expires in 1 hour. If it was not you, ignore this email - nothing will change.`;
  const html = wrapHtml(
    "Link Google to your CoinRadar account",
    `<p>Someone tried to sign in with Google using this email address.</p>
<p>If that was you, confirm to attach Google to your existing CoinRadar account. You will still be able to sign in with your password.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;border-radius:8px;text-decoration:none">Link Google</a></p>
<p style="font-size:12px;color:#666">Or open this link:<br/>${link}</p>
<p>The link expires in 1 hour. If it was not you, ignore this email - nothing will change.</p>`,
  );

  return dispatch({ to, subject, purpose: "merge_google", text, html, token });
};

export const sendAccountDeletionEmail = async (to: string, token: string) => {
  const link = `${FRONTEND_URL}?auth=delete_confirm&token=${encodeURIComponent(token)}`;
  const subject = "Confirm deletion of your CoinRadar account";
  const text = `You requested permanent deletion of your CoinRadar account.

Confirm by opening the link below. This is irreversible - all wallets and transactions will be removed:

${link}

The link expires in 1 hour. If you did not request deletion, ignore this email and your account stays intact.`;
  const html = wrapHtml(
    "Confirm account deletion",
    `<p>You requested permanent deletion of your CoinRadar account.</p>
<p><strong>This is irreversible.</strong> All wallets and transactions will be removed.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#b91c1c;color:#fff;border-radius:8px;text-decoration:none">Confirm deletion</a></p>
<p style="font-size:12px;color:#666">Or open this link:<br/>${link}</p>
<p>The link expires in 1 hour. If you did not request deletion, ignore this email and your account stays intact.</p>`,
  );

  return dispatch({
    to,
    subject,
    purpose: "delete_account",
    text,
    html,
    token,
  });
};

export const sendOneTimePasswordEmail = async (to: string, otp: string) => {
  const subject = "Your CoinRadar one-time password";
  const text = `Your temporary CoinRadar password: ${otp}

Use it once to sign in, then change it from your account settings. If you did not request this, ignore this email and consider rotating your account password.`;
  const html = wrapHtml(
    "Your one-time password",
    `<p>Your temporary CoinRadar password:</p>
<p style="font-family:ui-monospace,monospace;font-size:20px;letter-spacing:2px;padding:12px 20px;background:#f4f4f5;border-radius:8px;display:inline-block">${otp}</p>
<p>Use it once to sign in, then change it from your account settings.</p>
<p style="font-size:12px;color:#666">If you did not request this, ignore this email and consider rotating your account password.</p>`,
  );

  return dispatch({
    to,
    subject,
    purpose: "one_time_password",
    text,
    html,
    otp,
  });
};

// Test helpers - only meaningful when NODE_ENV === "test".
// Kept in production builds because tree-shaking is not configured for the backend.
export const __getCapturedEmails = (): readonly SentEmailRecord[] => captured;
export const __resetCapturedEmails = (): void => {
  captured.length = 0;
};
export const __resetTransporterForTests = (): void => {
  transporter = null;
};
