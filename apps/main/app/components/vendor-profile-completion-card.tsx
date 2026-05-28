"use client";

import { useState } from "react";

import {
  getVendorProfileCompletion,
  type VendorProfileCompletion,
} from "../../lib/vendor-profile-completion";
import type { VendorProfile } from "../../lib/vendor";

type VendorProfileCompletionCardProps = {
  profile: VendorProfile | null;
  socialLinkCount: number;
  compact?: boolean;
  defaultCollapsed?: boolean;
};

function CompletionBar({ percent }: { percent: number }) {
  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function VendorProfileCompletionCard({
  profile,
  socialLinkCount,
  compact = false,
  defaultCollapsed = false,
}: VendorProfileCompletionCardProps) {
  const completion: VendorProfileCompletion = getVendorProfileCompletion(
    profile,
    socialLinkCount,
  );
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const missingRequired = completion.requiredItems.filter((item) => !item.complete);

  return (
    <article className="rounded-sm border border-white/10 bg-black/12 p-4">
      <div className={compact ? "border-b border-white/10 pb-4" : ""}>
        {compact ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
              Profile completion
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {completion.percent}% required fields
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {completion.completedRequired} of {completion.requiredTotal} required items complete
              {completion.optionalTotal > 0
                ? ` · ${completion.completedOptional} of ${completion.optionalTotal} optional extras`
                : ""}
            </p>
            <CompletionBar percent={completion.percent} />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="flex w-full items-center justify-between rounded-sm border border-white/10 bg-white/4 px-3 py-2 text-left"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
                Profile completion
              </span>
              <span className="text-sm font-semibold text-[var(--accent)]">
                {completion.percent}%
              </span>
            </button>
            <p className="mt-2 text-xs text-slate-500">
              {collapsed ? "Expand to review all fields." : "Collapse to show missing items only."}
            </p>
            <CompletionBar percent={completion.percent} />
            {collapsed ? (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Missing required items
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {missingRequired.length > 0
                    ? missingRequired.map((item) => item.label).join(", ")
                    : "All required items complete."}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {!compact && !collapsed ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Required
            </p>
            <ul className="mt-2 space-y-2">
              {completion.requiredItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-white/4 px-3 py-2 text-sm"
                >
                  <span className="text-slate-200">{item.label}</span>
                  <span
                    className={[
                      "text-[10px] font-semibold uppercase tracking-[0.16em]",
                      item.complete ? "text-emerald-300" : "text-slate-500",
                    ].join(" ")}
                  >
                    {item.complete ? "Done" : "Missing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {completion.optionalItems.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Optional ({completion.optionalPercent}%)
              </p>
              <ul className="mt-2 space-y-2">
                {completion.optionalItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-white/4 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-200">{item.label}</span>
                    <span
                      className={[
                        "text-[10px] font-semibold uppercase tracking-[0.16em]",
                        item.complete ? "text-emerald-300" : "text-slate-500",
                      ].join(" ")}
                    >
                      {item.complete ? "Done" : "Missing"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function getProfileCompletionPercent(
  profile: VendorProfile | null,
  socialLinkCount: number,
) {
  return getVendorProfileCompletion(profile, socialLinkCount).percent;
}
