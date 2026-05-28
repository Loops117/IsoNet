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
  vendor_badges_live: boolean;
};

const VENDOR_BADGE_ELIGIBLE_STATUSES = new Set([
  "approved",
  "in_good_standing",
  "active",
  "needs_updates",
]);

function isTinyBadgeImage(buffer: Buffer) {
  return buffer.length <= EMPTY_PNG.length + 32;
}

type BadgeCompositionInput = {
  tier: number;
  month: number;
  year: number;
};

const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WHhA6MAAAAASUVORK5CYII=",
  "base64",
);

const PLACEHOLDER_BADGE_SIZE = 512;

let cachedPlaceholderBadge: Buffer | null = null;

const PLACEHOLDER_BADGE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${PLACEHOLDER_BADGE_SIZE}" height="${PLACEHOLDER_BADGE_SIZE}" viewBox="0 0 ${PLACEHOLDER_BADGE_SIZE} ${PLACEHOLDER_BADGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="outerGlow" cx="30%" cy="20%" r="65%">
      <stop offset="0%" stop-color="#9fb2c8" stop-opacity="0.34" />
      <stop offset="100%" stop-color="#9fb2c8" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="outerFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.03" />
    </linearGradient>
    <linearGradient id="innerFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#071121" />
      <stop offset="100%" stop-color="#081427" />
    </linearGradient>
    <radialGradient id="innerGlow" cx="50%" cy="0%" r="75%">
      <stop offset="0%" stop-color="#9fb2c8" stop-opacity="0.16" />
      <stop offset="100%" stop-color="#9fb2c8" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="256" cy="256" r="248" fill="url(#outerGlow)" />
  <circle cx="256" cy="256" r="240" fill="url(#outerFill)" stroke="#9fb2c8" stroke-opacity="0.22" stroke-width="4" />
  <circle cx="256" cy="256" r="206" fill="url(#innerFill)" stroke="#c2d0df" stroke-opacity="0.24" stroke-width="3" />
  <circle cx="256" cy="256" r="206" fill="url(#innerGlow)" />
  <text x="256" y="238" text-anchor="middle" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="700" letter-spacing="3">IsoNet</text>
  <text x="256" y="286" text-anchor="middle" fill="#9fb2c8" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600" letter-spacing="8">BADGE</text>
</svg>`;

export async function renderPlaceholderBadge() {
  if (cachedPlaceholderBadge) {
    return cachedPlaceholderBadge;
  }

  cachedPlaceholderBadge = await sharp(Buffer.from(PLACEHOLDER_BADGE_SVG)).png().toBuffer();
  return cachedPlaceholderBadge;
}

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
        "id, base_asset_id, default_homepage_tier, default_homepage_month, default_homepage_year, vendor_badges_live",
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

  const rawSettings = settingsResult.data as Record<string, unknown> | null;

  return {
    settings: rawSettings
      ? ({
          ...rawSettings,
          vendor_badges_live: Boolean(rawSettings.vendor_badges_live),
        } as BadgeGlobalSettings)
      : null,
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
    return null;
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

export async function areVendorBadgesLive() {
  const { settings } = await loadGlobalConfig();
  return Boolean(settings?.vendor_badges_live);
}

export async function shouldUsePlaceholderBadges() {
  return !(await areVendorBadgesLive());
}

export async function renderHomepageBadge() {
  const configured = await isHomepageBadgeConfigured();

  if (!configured) {
    return renderPlaceholderBadge();
  }

  const { settings, assets } = await loadGlobalConfig();

  if (!settings) {
    return renderPlaceholderBadge();
  }

  try {
    const composed = await composeFromLayers(assets, settings, {
      tier: settings.default_homepage_tier,
      month: settings.default_homepage_month,
      year: settings.default_homepage_year,
    });
    if (!composed || isTinyBadgeImage(composed)) {
      return renderPlaceholderBadge();
    }
    return composed;
  } catch {
    return renderPlaceholderBadge();
  }
}

export async function renderVendorBadge(vendorId: string) {
  if (!hasSupabaseServerEnv()) {
    return renderPlaceholderBadge();
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

  if (!VENDOR_BADGE_ELIGIBLE_STATUSES.has(vendorProfile.account_status)) {
    return null;
  }

  const { settings, assets } = await loadGlobalConfig();

  if (!settings?.vendor_badges_live) {
    return renderPlaceholderBadge();
  }

  const configured = await isHomepageBadgeConfigured();

  if (!configured) {
    return renderPlaceholderBadge();
  }

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const tier = Number(vendorProfile.badge_tier ?? 1) || 1;

  try {
    const composed = await composeFromLayers(assets, settings, { tier, month, year });
    if (!composed || isTinyBadgeImage(composed)) {
      return renderPlaceholderBadge();
    }
    return composed;
  } catch {
    return renderPlaceholderBadge();
  }
}
