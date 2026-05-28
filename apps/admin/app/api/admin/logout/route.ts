import { NextResponse, type NextRequest } from "next/server";

import { hasAdminAuthConfigured } from "../../../../lib/admin-session";
import { createSupabaseRouteHandlerClient } from "../../../../lib/supabase/route-handler";

export async function POST(request: NextRequest) {
  if (!hasAdminAuthConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const routeClient = createSupabaseRouteHandlerClient(request);

  if (!routeClient) {
    return NextResponse.json({ ok: true });
  }

  const { supabase, applyAuthCookies } = routeClient;
  await supabase.auth.signOut();

  return applyAuthCookies(NextResponse.json({ ok: true }));
}
