import { NextResponse } from "next/server";

import { getAdminSessionCookieOptions } from "../../../../lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const sessionCookie = getAdminSessionCookieOptions();

  response.cookies.set({
    ...sessionCookie,
    value: "",
    maxAge: 0,
  });

  return response;
}
