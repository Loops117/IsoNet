import { NextResponse } from "next/server";

import {
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  getConfiguredAdminEmail,
  getConfiguredAdminPassword,
  hasAdminCredentialsConfigured,
} from "../../../../lib/admin-session";

export async function POST(request: Request) {
  if (!hasAdminCredentialsConfigured()) {
    return NextResponse.json(
      { error: "Admin credentials are not configured in the environment." },
      { status: 500 },
    );
  }

  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const normalizedEmail = email?.trim() ?? "";
  const normalizedPassword = password?.trim() ?? "";

  if (
    normalizedEmail !== getConfiguredAdminEmail() ||
    normalizedPassword !== getConfiguredAdminPassword()
  ) {
    return NextResponse.json(
      { error: "Invalid administrator credentials." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  const sessionCookie = getAdminSessionCookieOptions();

  response.cookies.set({
    ...sessionCookie,
    value: createAdminSessionToken(normalizedEmail),
  });

  return response;
}
