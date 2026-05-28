import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAdminSession } from "../../../../../../lib/admin-session";
import {
  getSupabaseServerClient,
  hasSupabaseServiceRoleEnv,
} from "../../../../../../lib/supabase-server";
import type { BadgeLayerType } from "../../../../../../lib/badge-settings";

function normalizeLayerType(value: FormDataEntryValue | null): BadgeLayerType | null {
  if (typeof value !== "string") {
    return null;
  }

  if (value === "base" || value === "tier" || value === "month" || value === "year") {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
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

  const formData = await request.formData();
  const file = formData.get("file");
  const layerType = normalizeLayerType(formData.get("layerType"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
  }

  if (!layerType) {
    return NextResponse.json({ error: "Invalid layer type." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const fileExt = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "png" : "png";
  const storagePath = `${layerType}/${randomUUID()}.${fileExt}`;
  const bytes = await file.arrayBuffer();

  const uploadResult = await supabase.storage
    .from("badge-assets")
    .upload(storagePath, bytes, {
      contentType: file.type || "image/png",
      upsert: false,
    });

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 });
  }

  const tierRaw = Number(formData.get("tierNumber"));
  const monthRaw = Number(formData.get("monthNumber"));
  const yearRaw = Number(formData.get("yearNumber"));

  const insertPayload = {
    layer_type: layerType,
    display_name: file.name,
    storage_path: storagePath,
    tier_number: layerType === "tier" && Number.isInteger(tierRaw) ? tierRaw : null,
    month_number: layerType === "month" && Number.isInteger(monthRaw) ? monthRaw : null,
    year_number: layerType === "year" && Number.isInteger(yearRaw) ? yearRaw : null,
  };

  const { data, error } = await supabase
    .from("badge_layer_assets")
    .insert(insertPayload)
    .select(
      "id, layer_type, display_name, storage_path, tier_number, month_number, year_number, is_active, created_at, updated_at",
    )
    .single();

  if (error) {
    await supabase.storage.from("badge-assets").remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const publicUrl = supabase.storage.from("badge-assets").getPublicUrl(storagePath).data.publicUrl;
  return NextResponse.json({ asset: { ...data, public_url: publicUrl } });
}
