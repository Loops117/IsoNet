import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../../../../lib/admin-session";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../../../lib/supabase-server";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    tierNumber?: number | null;
    monthNumber?: number | null;
    yearNumber?: number | null;
    isActive?: boolean;
  } | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { assetId } = await context.params;
  const supabase = getSupabaseServerClient();

  const updatePayload: Record<string, number | boolean | null> = {};
  if ("tierNumber" in payload) {
    updatePayload.tier_number =
      payload.tierNumber == null ? null : Number(payload.tierNumber);
  }
  if ("monthNumber" in payload) {
    updatePayload.month_number =
      payload.monthNumber == null ? null : Number(payload.monthNumber);
  }
  if ("yearNumber" in payload) {
    updatePayload.year_number =
      payload.yearNumber == null ? null : Number(payload.yearNumber);
  }
  if ("isActive" in payload) {
    updatePayload.is_active = Boolean(payload.isActive);
  }

  const { data, error } = await supabase
    .from("badge_layer_assets")
    .update(updatePayload)
    .eq("id", assetId)
    .select(
      "id, layer_type, display_name, storage_path, tier_number, month_number, year_number, is_active, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const publicUrl = supabase.storage.from("badge-assets").getPublicUrl(data.storage_path).data.publicUrl;
  return NextResponse.json({ asset: { ...data, public_url: publicUrl } });
}
