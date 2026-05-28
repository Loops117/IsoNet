import type { Metadata } from "next";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";

import { fetchPublicVendorProfile } from "../../../lib/public-vendor-profile";
import { formatVendorDate, formatVendorStatus } from "../../../lib/vendor";

type VendorProfilePageProps = {
  params: Promise<{ vendorId: string }>;
};

export async function generateMetadata({ params }: VendorProfilePageProps): Promise<Metadata> {
  const { vendorId } = await params;
  const data = await fetchPublicVendorProfile(vendorId);

  return {
    title: data ? `${data.profile.company_name} | Vendor | The Isopod Network` : "Vendor | The Isopod Network",
    description: data
      ? `View ${data.profile.company_name} on the IsoNet vendor directory.`
      : "Vendor profile",
  };
}

export default async function VendorProfilePage({ params }: VendorProfilePageProps) {
  const { vendorId } = await params;
  const data = await fetchPublicVendorProfile(vendorId);

  if (!data) {
    return (
      <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
        <div className="isonet-panel w-full max-w-4xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-white">Vendor not found</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            This vendor profile is not publicly available.
          </p>
          <Link href="/vendors" className="isonet-link mt-6 inline-flex text-xs font-semibold uppercase tracking-[0.16em]">
            ← Back to vendor list
          </Link>
        </div>
      </main>
    );
  }

  const { profile, socialLinks, reviews, salesLocationLabels, salesItemLabels } = data;
  const safeAboutUs = sanitizeHtml(profile.about_us_html ?? "", {
    allowedTags: ["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "span", "div"],
    allowedAttributes: {
      "*": ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^center$/, /^right$/],
        "font-family": [/^[\w\s",'-]+$/],
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb/, /^hsl/, /^[a-zA-Z]+$/],
      },
    },
  });

  return (
    <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <header className="isonet-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                Vendor profile
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {profile.company_name}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {profile.owner_name} · {[profile.city, profile.state_province].filter(Boolean).join(", ") || "Location not listed"}
              </p>
            </div>
            <Link href="/vendors" className="isonet-link text-xs font-semibold uppercase tracking-[0.16em]">
              ← Vendor list
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="isonet-panel p-6">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-slate-950/70">
              {profile.company_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.company_logo_url} alt={`${profile.company_name} logo`} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">No logo</span>
              )}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Status", value: formatVendorStatus(profile.account_status) },
                { label: "Website", value: profile.website_url ?? "Not listed" },
                { label: "Rating", value: `${profile.average_rating.toFixed(2)} (${profile.review_count} reviews)` },
                { label: "Badge tier", value: profile.badge_tier ? `Tier ${profile.badge_tier}` : "Not assigned" },
                { label: "Badge start date", value: profile.badge_start_date ? formatVendorDate(profile.badge_start_date) : "Not assigned yet" },
                { label: "Badge URL", value: profile.badge_url ?? "Not assigned yet" },
              ].map((item) => (
                <div key={item.label} className="rounded-sm border border-white/10 bg-white/4 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="isonet-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">About us</p>
            {safeAboutUs ? (
              <div className="vendor-about mt-4 text-sm leading-7 text-slate-200" dangerouslySetInnerHTML={{ __html: safeAboutUs }} />
            ) : (
              <p className="mt-4 text-sm leading-7 text-slate-400">No about section added yet.</p>
            )}
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="isonet-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Sales profile</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-sm border border-white/10 bg-white/4 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Where they sell</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{salesLocationLabels || "Not listed"}</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-white/4 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">What they sell</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{salesItemLabels || "Not listed"}</p>
              </div>
            </div>
          </article>

          <article className="isonet-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Social media</p>
            <div className="mt-4 space-y-2">
              {socialLinks.length > 0 ? socialLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block rounded-sm border border-white/10 bg-white/4 px-3 py-2 text-sm text-slate-200 hover:bg-white/8">
                  {link.platform} — {link.url}
                </a>
              )) : <p className="text-sm text-slate-400">No social links listed.</p>}
            </div>
          </article>
        </section>

        <section className="isonet-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Reviews</p>
          <div className="mt-4 space-y-3">
            {reviews.length > 0 ? reviews.map((review) => (
              <article key={review.id} className="rounded-sm border border-white/10 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-100">{review.title ?? "Community review"}</p>
                  <span className="text-xs font-semibold text-[var(--accent)]">{review.rating}/5</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{review.body ?? "No review text provided."}</p>
                <p className="mt-2 text-xs text-slate-500">{review.reviewer_name} · {formatVendorDate(review.published_at)}</p>
              </article>
            )) : <p className="text-sm text-slate-400">No published reviews yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
