import "server-only";

export type VendorAuthEmailType = "recovery" | "signup";

const DEFAULT_VENDOR_REDIRECT = "https://theisopodnetwork.com/vendor";

function getVendorEmailRedirectTo() {
  const configured =
    process.env.VENDOR_AUTH_EMAIL_REDIRECT_TO?.trim() ||
    process.env.NEXT_PUBLIC_MAIN_SITE_URL?.trim().replace(/\/$/, "");

  if (configured) {
    return configured.endsWith("/vendor") ? configured : `${configured}/vendor`;
  }

  return DEFAULT_VENDOR_REDIRECT;
}

function parseAuthErrorMessage(status: number, body: unknown) {
  if (status === 504) {
    return "Supabase timed out while sending email. Check SMTP settings and your mail provider logs.";
  }

  if (status === 429) {
    return "Email rate limit exceeded. Wait a few minutes or verify custom SMTP is enabled.";
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = record.msg ?? record.message ?? record.error_description ?? record.error;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return `Unable to send email (HTTP ${status}).`;
}

export async function sendVendorAuthEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  emailType: VendorAuthEmailType,
) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return { ok: false as const, error: "Vendor email is missing." };
  }

  const redirectTo = getVendorEmailRedirectTo();
  const endpoint =
    emailType === "recovery"
      ? `${supabaseUrl}/auth/v1/recover`
      : `${supabaseUrl}/auth/v1/resend`;

  const body =
    emailType === "recovery"
      ? { email: normalizedEmail, redirect_to: redirectTo }
      : { type: "signup", email: normalizedEmail };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseBody = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      return {
        ok: false as const,
        error: parseAuthErrorMessage(response.status, responseBody),
      };
    }

    const label =
      emailType === "recovery" ? "Password reset" : "Signup confirmation";

    return {
      ok: true as const,
      email: normalizedEmail,
      emailType,
      message: `${label} email requested for ${normalizedEmail}.`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false as const,
        error:
          "Email send timed out after 60 seconds. SMTP may be misconfigured or slow.",
      };
    }

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unable to send email.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
