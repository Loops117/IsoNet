import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../../lib/admin-session";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../lib/supabase-server";

const SETTINGS_ID = "default";

export async function GET() {
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

  const supabase = getSupabaseServerClient();
  const [settingsResult, assetsResult] = await Promise.all([
    supabase
      .from("badge_global_settings")
      .select(
        "id, base_asset_id, default_homepage_tier, default_homepage_month, default_homepage_year, vendor_badges_live, created_at, updated_at",
      )
      .eq("id", SETTINGS_ID)
      .maybeSingle(),
    supabase
      .from("badge_layer_assets")
      .select(
        "id, layer_type, display_name, storage_path, tier_number, month_number, year_number, is_active, created_at, updated_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  if (settingsResult.error || assetsResult.error) {
    return NextResponse.json(
      { error: settingsResult.error?.message ?? assetsResult.error?.message ?? "Unable to load badge settings." },
      { status: 500 },
    );
  }

  const assets = (assetsResult.data ?? []).map((asset) => {
    const publicUrl = supabase.storage.from("badge-assets").getPublicUrl(asset.storage_path).data
      .publicUrl;
    return { ...asset, public_url: publicUrl };
  });

  return NextResponse.json({
    settings: settingsResult.data ?? null,
    assets,
  });
}

export async function PATCH(request: Request) {
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
    baseAssetId?: string | null;
    defaultHomepageTier?: number;
    defaultHomepageMonth?: number;
    defaultHomepageYear?: number;
    vendorBadgesLive?: boolean;
  } | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const tier = Number(payload.defaultHomepageTier);
  const month = Number(payload.defaultHomepageMonth);
  const year = Number(payload.defaultHomepageYear);

  if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
    return NextResponse.json({ error: "Homepage tier must be between 1 and 5." }, { status: 400 });
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Homepage month must be between 1 and 12." }, { status: 400 });
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Homepage year must be between 2000 and 2100." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("badge_global_settings")
    .update({
      base_asset_id: payload.baseAssetId ?? null,
      default_homepage_tier: tier,
      default_homepage_month: month,
      default_homepage_year: year,
      vendor_badges_live: Boolean(payload.vendorBadgesLive),
    })
    .eq("id", SETTINGS_ID)
    .select(
      "id, base_asset_id, default_homepage_tier, default_homepage_month, default_homepage_year, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
