import { NextResponse, type NextRequest } from "next/server";

import { hasAdminAuthConfigured } from "../../../../lib/admin-session";
import { createSupabaseRouteHandlerClient } from "../../../../lib/supabase/route-handler";

export async function POST(request: NextRequest) {
  if (!hasAdminAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Admin authentication requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 500 },
    );
  }

  const routeClient = createSupabaseRouteHandlerClient(request);

  if (!routeClient) {
    return NextResponse.json(
      { error: "Supabase authentication is not configured." },
      { status: 500 },
    );
  }

  const { supabase, applyAuthCookies } = routeClient;
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const normalizedEmail = email?.trim() ?? "";
  const normalizedPassword = password ?? "";

  if (!normalizedEmail || !normalizedPassword) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (signInError || !signInData.user) {
    return NextResponse.json(
      { error: "Invalid administrator credentials." },
      { status: 401 },
    );
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", signInData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError || !adminUser) {
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        error:
          "This account is not authorized for the admin portal. Ask an existing administrator to grant access.",
      },
      { status: 403 },
    );
  }

  return applyAuthCookies(NextResponse.json({ ok: true }));
}
