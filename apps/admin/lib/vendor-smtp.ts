import "server-only";

import nodemailer from "nodemailer";

export function hasVendorSmtpEnv() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD?.trim() &&
      (process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim()),
  );
}

function getSmtpFromAddress() {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "noreply@theisopodnetwork.com"
  );
}

function getSmtpFromName() {
  return process.env.SMTP_FROM_NAME?.trim() || "IsoNet";
}

export async function sendVendorSmtpEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!hasVendorSmtpEnv()) {
    return {
      ok: false as const,
      error:
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in the admin app environment.",
    };
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const secure = process.env.SMTP_SECURE?.trim() === "true" || port === 465;
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASSWORD!.trim();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"${getSmtpFromName()}" <${getSmtpFromAddress()}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to send email via SMTP.",
    };
  }
}
