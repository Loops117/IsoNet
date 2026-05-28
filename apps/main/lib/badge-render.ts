import "server-only";

import sharp from "sharp";

import { getSupabaseServerClient, hasSupabaseServerEnv } from "./supabase-server";

type BadgeLayerType = "base" | "tier" | "month" | "year";

type BadgeLayerAsset = {
  id: string;
  layer_type: BadgeLayerType;
  storage_path: string;
  tier_number: number | null;
  month_number: number | null;
  year_number: number | null;
  is_active: boolean;
};

type BadgeGlobalSettings = {
  id: "default";
  base_asset_id: string | null;
  default_homepage_tier: number;
  default_homepage_month: number;
  default_homepage_year: number;
};

type BadgeCompositionInput = {
  tier: number;
  month: number;
  year: number;
};

const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WHhA6MAAAAASUVORK5CYII=",
  "base64",
);

async function fetchStorageAsset(path: string) {
  const supabase = getSupabaseServerClient();
  const url = supabase.storage.from("badge-assets").getPublicUrl(path).data.publicUrl;
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load badge asset at ${path}.`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function loadGlobalConfig() {
  if (!hasSupabaseServerEnv()) {
    return { settings: null as BadgeGlobalSettings | null, assets: [] as BadgeLayerAsset[] };
  }

  const supabase = getSupabaseServerClient();
  const [settingsResult, assetsResult] = await Promise.all([
    supabase
      .from("badge_global_settings")
      .select(
        "id, base_asset_id, default_homepage_tier, default_homepage_month, default_homepage_year",
      )
      .eq("id", "default")
      .maybeSingle(),
    supabase
      .from("badge_layer_assets")
      .select("id, layer_type, storage_path, tier_number, month_number, year_number, is_active")
      .eq("is_active", true),
  ]);

  if (settingsResult.error || assetsResult.error) {
    return { settings: null as BadgeGlobalSettings | null, assets: [] as BadgeLayerAsset[] };
  }

  return {
    settings: (settingsResult.data as BadgeGlobalSettings | null) ?? null,
    assets: (assetsResult.data as BadgeLayerAsset[]) ?? [],
  };
}

function pickLayer(
  assets: BadgeLayerAsset[],
  layerType: BadgeLayerType,
  assignment?: number | string | null,
  baseAssetId?: string | null,
) {
  if (layerType === "base") {
    return (
      assets.find((asset) => asset.layer_type === "base" && asset.id === baseAssetId) ??
      assets.find((asset) => asset.layer_type === "base") ??
      null
    );
  }

  if (layerType === "tier") {
    return (
      assets.find((asset) => asset.layer_type === "tier" && asset.tier_number === assignment) ??
      null
    );
  }

  if (layerType === "month") {
    return (
      assets.find((asset) => asset.layer_type === "month" && asset.month_number === assignment) ??
      null
    );
  }

  return (
    assets.find((asset) => asset.layer_type === "year" && asset.year_number === assignment) ??
    null
  );
}

async function composeFromLayers(
  assets: BadgeLayerAsset[],
  settings: BadgeGlobalSettings | null,
  input: BadgeCompositionInput,
) {
  const baseLayer = pickLayer(assets, "base", null, settings?.base_asset_id ?? null);
  if (!baseLayer) {
    return EMPTY_PNG;
  }

  const tierLayer = pickLayer(assets, "tier", input.tier);
  const monthLayer = pickLayer(assets, "month", input.month);
  const yearLayer = pickLayer(assets, "year", input.year);

  const baseBuffer = await fetchStorageAsset(baseLayer.storage_path);
  const compositeInputs: sharp.OverlayOptions[] = [];

  for (const layer of [tierLayer, monthLayer, yearLayer]) {
    if (!layer) {
      continue;
    }
    compositeInputs.push({
      input: await fetchStorageAsset(layer.storage_path),
      top: 0,
      left: 0,
      blend: "over",
    });
  }

  return sharp(baseBuffer).composite(compositeInputs).png().toBuffer();
}

export async function isHomepageBadgeConfigured() {
  const { settings, assets } = await loadGlobalConfig();

  if (!settings) {
    return false;
  }

  const baseLayer = pickLayer(assets, "base", null, settings.base_asset_id ?? null);

  return Boolean(baseLayer?.storage_path);
}

export async function renderHomepageBadge() {
  const configured = await isHomepageBadgeConfigured();

  if (!configured) {
    return EMPTY_PNG;
  }

  const { settings, assets } = await loadGlobalConfig();

  if (!settings) {
    return EMPTY_PNG;
  }

  return composeFromLayers(assets, settings, {
    tier: settings.default_homepage_tier,
    month: settings.default_homepage_month,
    year: settings.default_homepage_year,
  });
}

export async function renderVendorBadge(vendorId: string) {
  if (!hasSupabaseServerEnv()) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data: vendorProfile, error: profileError } = await supabase
    .from("vendor_profiles")
    .select("account_status, badge_tier")
    .eq("user_id", vendorId)
    .maybeSingle();

  if (profileError || !vendorProfile) {
    return null;
  }

  const activeStatuses = new Set(["approved", "in_good_standing", "active"]);
  if (!activeStatuses.has(vendorProfile.account_status)) {
    return null;
  }

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const tier = Number(vendorProfile.badge_tier ?? 1) || 1;

  const { settings, assets } = await loadGlobalConfig();
  if (!settings) {
    return null;
  }

  return composeFromLayers(assets, settings, { tier, month, year });
}
