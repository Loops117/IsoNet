"use client";

import { useEffect, useMemo, useState } from "react";

import {
  badgeMonthOptions,
  badgeTierOptions,
  type BadgeGlobalSettings,
  type BadgeLayerAsset,
  type BadgeLayerType,
} from "../../lib/badge-settings";

type ApiResponse = {
  settings: BadgeGlobalSettings | null;
  assets: BadgeLayerAsset[];
};

const currentYear = new Date().getUTCFullYear();
const yearOptions = Array.from({ length: 8 }, (_, index) => currentYear - 2 + index);

function groupedAssets(assets: BadgeLayerAsset[], layerType: BadgeLayerType) {
  return assets.filter((asset) => asset.layer_type === layerType);
}

export function GlobalBadgeSettings() {
  const [settings, setSettings] = useState<BadgeGlobalSettings | null>(null);
  const [assets, setAssets] = useState<BadgeLayerAsset[]>([]);
  const [loadPending, setLoadPending] = useState(true);
  const [uploadPending, setUploadPending] = useState<Record<BadgeLayerType, boolean>>({
    base: false,
    tier: false,
    month: false,
    year: false,
  });
  const [savePending, setSavePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [defaultBaseAssetId, setDefaultBaseAssetId] = useState<string | null>(null);
  const [defaultTier, setDefaultTier] = useState(1);
  const [defaultMonth, setDefaultMonth] = useState(1);
  const [defaultYear, setDefaultYear] = useState(currentYear);

  const baseAssets = useMemo(() => groupedAssets(assets, "base"), [assets]);
  const tierAssets = useMemo(() => groupedAssets(assets, "tier"), [assets]);
  const monthAssets = useMemo(() => groupedAssets(assets, "month"), [assets]);
  const yearAssets = useMemo(() => groupedAssets(assets, "year"), [assets]);

  async function loadSettings() {
    setLoadPending(true);
    setError(null);

    const response = await fetch("/api/admin/settings/global");
    const body = (await response.json().catch(() => null)) as
      | ({ error?: string } & Partial<ApiResponse>)
      | null;

    if (!response.ok) {
      setError(body?.error ?? "Unable to load global badge settings.");
      setLoadPending(false);
      return;
    }

    const nextSettings = body?.settings ?? null;
    const nextAssets = body?.assets ?? [];
    setSettings(nextSettings);
    setAssets(nextAssets);
    setDefaultBaseAssetId(nextSettings?.base_asset_id ?? null);
    setDefaultTier(nextSettings?.default_homepage_tier ?? 1);
    setDefaultMonth(nextSettings?.default_homepage_month ?? 1);
    setDefaultYear(nextSettings?.default_homepage_year ?? currentYear);
    setLoadPending(false);
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function uploadLayer(layerType: BadgeLayerType, files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setUploadPending((current) => ({ ...current, [layerType]: true }));
    setError(null);
    setMessage(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("layerType", layerType);
        formData.append("file", file);

        const response = await fetch("/api/admin/settings/global/upload", {
          method: "POST",
          body: formData,
        });
        const body = (await response.json().catch(() => null)) as
          | { error?: string; asset?: BadgeLayerAsset }
          | null;

        if (!response.ok) {
          throw new Error(body?.error ?? `Unable to upload ${file.name}.`);
        }

        if (body?.asset) {
          setAssets((current) => [body.asset as BadgeLayerAsset, ...current]);
        }
      }

      setMessage("Badge asset upload complete.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploadPending((current) => ({ ...current, [layerType]: false }));
    }
  }

  async function patchAsset(
    assetId: string,
    payload: { tierNumber?: number | null; monthNumber?: number | null; yearNumber?: number | null },
  ) {
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/admin/settings/global/assets/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as
      | { error?: string; asset?: BadgeLayerAsset }
      | null;

    if (!response.ok || !body?.asset) {
      setError(body?.error ?? "Unable to update badge assignment.");
      return;
    }

    setAssets((current) =>
      current.map((asset) => (asset.id === assetId ? (body.asset as BadgeLayerAsset) : asset)),
    );
    setMessage("Layer assignment updated.");
  }

  async function saveHomepageDefaults() {
    setSavePending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/settings/global", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseAssetId: defaultBaseAssetId,
        defaultHomepageTier: defaultTier,
        defaultHomepageMonth: defaultMonth,
        defaultHomepageYear: defaultYear,
      }),
    });

    const body = (await response.json().catch(() => null)) as
      | { error?: string; settings?: BadgeGlobalSettings }
      | null;

    if (!response.ok || !body?.settings) {
      setError(body?.error ?? "Unable to save homepage badge defaults.");
      setSavePending(false);
      return;
    }

    setSettings(body.settings);
    setMessage("Global badge defaults saved.");
    setSavePending(false);
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
          Settings
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Global badge settings</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-300">
          Upload badge layer assets and configure default homepage badge composition.
        </p>
      </header>

      {error ? (
        <div className="rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-4 text-sm leading-7 text-rose-100">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-sm border border-emerald-300/30 bg-emerald-200/10 px-4 py-4 text-sm leading-7 text-emerald-100">
          {message}
        </div>
      ) : null}

      <section className="rounded-sm border border-white/10 bg-black/12 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
          Base image upload
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Upload one or more base layers. Select which one should be used for default homepage badge rendering.
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center rounded-sm border border-white/12 bg-white/4 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition-colors hover:bg-white/8">
          {uploadPending.base ? "Uploading..." : "Upload base image(s)"}
          <input
            type="file"
            accept="image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => void uploadLayer("base", event.target.files)}
            disabled={uploadPending.base}
          />
        </label>
      </section>

      <section className="rounded-sm border border-white/10 bg-black/12 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
          Tier layer upload (up to 5)
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Upload tier layers and assign each image to a tier number.
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center rounded-sm border border-white/12 bg-white/4 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition-colors hover:bg-white/8">
          {uploadPending.tier ? "Uploading..." : "Upload tier image(s)"}
          <input
            type="file"
            accept="image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => void uploadLayer("tier", event.target.files)}
            disabled={uploadPending.tier}
          />
        </label>
      </section>

      <section className="rounded-sm border border-white/10 bg-black/12 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
          Month layer upload
        </h3>
        <label className="mt-4 inline-flex cursor-pointer items-center rounded-sm border border-white/12 bg-white/4 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition-colors hover:bg-white/8">
          {uploadPending.month ? "Uploading..." : "Upload month image(s)"}
          <input
            type="file"
            accept="image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => void uploadLayer("month", event.target.files)}
            disabled={uploadPending.month}
          />
        </label>
      </section>

      <section className="rounded-sm border border-white/10 bg-black/12 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
          Year layer upload
        </h3>
        <label className="mt-4 inline-flex cursor-pointer items-center rounded-sm border border-white/12 bg-white/4 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition-colors hover:bg-white/8">
          {uploadPending.year ? "Uploading..." : "Upload year image(s)"}
          <input
            type="file"
            accept="image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => void uploadLayer("year", event.target.files)}
            disabled={uploadPending.year}
          />
        </label>
      </section>

      <section className="rounded-sm border border-white/10 bg-black/12 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
          Uploaded layer assets
        </h3>
        {loadPending ? (
          <p className="mt-3 text-sm text-slate-300">Loading assets...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm text-slate-200">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-2 py-2 text-left">Preview</th>
                  <th className="px-2 py-2 text-left">Image Name</th>
                  <th className="px-2 py-2 text-left">Layer</th>
                  <th className="px-2 py-2 text-left">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-white/5">
                    <td className="px-2 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.public_url} alt={asset.display_name} className="h-12 w-12 rounded-sm border border-white/10 object-contain bg-slate-950/70" />
                    </td>
                    <td className="px-2 py-2">{asset.display_name}</td>
                    <td className="px-2 py-2 uppercase">{asset.layer_type}</td>
                    <td className="px-2 py-2">
                      {asset.layer_type === "tier" ? (
                        <select
                          className="admin-input"
                          value={asset.tier_number ?? ""}
                          onChange={(event) =>
                            void patchAsset(asset.id, { tierNumber: Number(event.target.value) || null })
                          }
                        >
                          <option value="">Unassigned</option>
                          {badgeTierOptions.map((value) => (
                            <option key={value} value={value}>
                              Tier {value}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {asset.layer_type === "month" ? (
                        <select
                          className="admin-input"
                          value={asset.month_number ?? ""}
                          onChange={(event) =>
                            void patchAsset(asset.id, { monthNumber: Number(event.target.value) || null })
                          }
                        >
                          <option value="">Unassigned</option>
                          {badgeMonthOptions.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {asset.layer_type === "year" ? (
                        <select
                          className="admin-input"
                          value={asset.year_number ?? ""}
                          onChange={(event) =>
                            void patchAsset(asset.id, { yearNumber: Number(event.target.value) || null })
                          }
                        >
                          <option value="">Unassigned</option>
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {asset.layer_type === "base" ? <span className="text-slate-400">N/A</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-sm border border-white/10 bg-black/12 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
          Homepage default badge
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Choose the default layer combination shown on the public homepage badge section.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2">
            <span className="admin-field-label">Base image</span>
            <select
              className="admin-input"
              value={defaultBaseAssetId ?? ""}
              onChange={(event) => setDefaultBaseAssetId(event.target.value || null)}
            >
              <option value="">No base selected</option>
              {baseAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="admin-field-label">Tier</span>
            <select
              className="admin-input"
              value={defaultTier}
              onChange={(event) => setDefaultTier(Number(event.target.value))}
            >
              {badgeTierOptions.map((tier) => (
                <option key={tier} value={tier}>
                  Tier {tier}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="admin-field-label">Month</span>
            <select
              className="admin-input"
              value={defaultMonth}
              onChange={(event) => setDefaultMonth(Number(event.target.value))}
            >
              {badgeMonthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="admin-field-label">Year</span>
            <select
              className="admin-input"
              value={defaultYear}
              onChange={(event) => setDefaultYear(Number(event.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="admin-primary-button"
            onClick={() => void saveHomepageDefaults()}
            disabled={savePending}
          >
            {savePending ? "Saving" : "Save global defaults"}
          </button>
          <button type="button" className="admin-ghost-button" onClick={() => void loadSettings()}>
            Refresh from server
          </button>
        </div>
        {settings ? (
          <p className="mt-3 text-xs text-slate-400">Last saved: {new Date(settings.updated_at).toLocaleString()}</p>
        ) : null}
      </section>

      <section className="rounded-sm border border-white/10 bg-black/12 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
          Badge URL preview
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Homepage default badge URL: <code>/badges/homepage</code>
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-300">
          Vendor badge URL pattern: <code>/badges/vendor/&lt;vendor_user_id&gt;</code>
        </p>
      </section>
    </div>
  );
}
