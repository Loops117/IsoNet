import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../../../lib/admin-session";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    vendorId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      {
        error:
          "Vendor management requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the admin app environment.",
      },
      { status: 500 },
    );
  }

  const { vendorId } = await context.params;
  const body = (await request.json()) as { noteBody?: string };
  const noteBody = body.noteBody?.trim();

  if (!noteBody) {
    return NextResponse.json({ error: "A note body is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendor_admin_notes")
    .insert({
      vendor_user_id: vendorId,
      author_email: adminSession.email,
      note_body: noteBody,
    })
    .select("id, vendor_user_id, author_email, note_body, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}
