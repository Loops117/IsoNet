"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildVendorBadgeEmbedHtml,
  buildVendorPublicProfileUrl,
} from "../../lib/vendor-badge-embed";

type VendorBadgeEmbedPaneProps = {
  companyName: string;
  vendorUserId: string;
  badgeStartDate: string | null;
};

export function VendorBadgeEmbedPane({
  companyName,
  vendorUserId,
  badgeStartDate,
}: VendorBadgeEmbedPaneProps) {
  const [siteOrigin, setSiteOrigin] = useState<string | undefined>(() =>
    typeof window !== "undefined" ? window.location.origin : undefined,
  );
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  const previewEmbedHtml = useMemo(
    () =>
      buildVendorBadgeEmbedHtml({
        companyName,
        vendorUserId,
        badgeStartDate,
        siteOrigin,
      }),
    [badgeStartDate, companyName, siteOrigin, vendorUserId],
  );

  const copyEmbedHtml = useMemo(
    () =>
      buildVendorBadgeEmbedHtml({
        companyName,
        vendorUserId,
        badgeStartDate,
      }),
    [badgeStartDate, companyName, vendorUserId],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyEmbedHtml);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  const profileUrl = buildVendorPublicProfileUrl(vendorUserId, siteOrigin);

  return (
    <article className="rounded-sm border border-white/10 bg-black/12 p-5">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          Embed on your website
        </p>
        <p className="max-w-3xl text-sm leading-7 text-slate-300">
          Copy this HTML block to your site, blog, or marketplace profile. It includes your badge,
          company name, and a short statement about your IsoNet membership.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="isonet-button" onClick={() => void handleCopy()}>
          {copyState === "copied"
            ? "Copied embed code"
            : copyState === "error"
              ? "Copy failed — select text below"
              : "Copy HTML to clipboard"}
        </button>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="isonet-button-secondary inline-flex"
        >
          Preview public profile
        </a>
      </div>

      <div className="mt-5 rounded-sm border border-white/10 bg-slate-950/50 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Live preview
        </p>
        <div
          className="vendor-badge-embed-preview mt-4 overflow-auto rounded-sm border border-white/10 p-4"
          dangerouslySetInnerHTML={{ __html: previewEmbedHtml }}
        />
      </div>

      <label className="mt-5 block space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          HTML embed code
        </span>
        <textarea
          readOnly
          rows={16}
          value={copyEmbedHtml}
          className="w-full resize-y rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 font-mono text-xs leading-6 text-slate-100"
          onFocus={(event) => event.target.select()}
        />
      </label>
    </article>
  );
}
