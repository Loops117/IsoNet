import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

const ADMIN_SESSION_COOKIE = "isonet_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSession = {
  email: string;
};

function getAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim() ?? "";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function createSignature(payload: string) {
  return createHmac("sha256", getAdminPassword()).update(payload).digest("hex");
}

function encodePayload(payload: string) {
  return Buffer.from(payload, "utf8").toString("base64url");
}

function decodePayload(payload: string) {
  return Buffer.from(payload, "base64url").toString("utf8");
}

export function hasAdminCredentialsConfigured() {
  return Boolean(getAdminEmail() && getAdminPassword());
}

export function createAdminSessionToken(email: string) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + ADMIN_SESSION_TTL_SECONDS * 1000;
  const payload = `${email}:${expiresAt}`;
  const signature = createSignature(payload);

  return `${encodePayload(payload)}.${signature}`;
}

export function verifyAdminSessionToken(token?: string | null): AdminSession | null {
  if (!token || !hasAdminCredentialsConfigured()) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  const expectedSignature = createSignature(payload);

  if (providedSignature.length !== expectedSignature.length) {
    return null;
  }

  const signaturesMatch = timingSafeEqual(
    Buffer.from(providedSignature, "utf8"),
    Buffer.from(expectedSignature, "utf8"),
  );

  if (!signaturesMatch) {
    return null;
  }

  const [email, expiresAtRaw] = payload.split(":");
  const expiresAt = Number(expiresAtRaw);

  if (!email || email !== getAdminEmail() || !Number.isFinite(expiresAt)) {
    return null;
  }

  if (Date.now() > expiresAt) {
    return null;
  }

  return { email };
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return verifyAdminSessionToken(token);
}

export function getAdminSessionCookieOptions() {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

export function getConfiguredAdminEmail() {
  return getAdminEmail();
}

export function getConfiguredAdminPassword() {
  return getAdminPassword();
}
