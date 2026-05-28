import Link from "next/link";

import type { PublicVendorListing } from "../../lib/public-vendors";

type VendorDirectoryListProps = {
  vendors: PublicVendorListing[];
  showViewAllLink?: boolean;
};

function VendorLogo({ vendor }: { vendor: PublicVendorListing }) {
  if (vendor.company_logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={vendor.company_logo_url}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <span className="px-1 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      No logo
    </span>
  );
}

export function VendorDirectoryList({ vendors, showViewAllLink = false }: VendorDirectoryListProps) {
  if (vendors.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-sm border border-white/10 bg-white/4 px-5 py-6 text-sm leading-7 text-slate-300">
          Approved vendors will appear here as they are listed in the directory.
        </div>
        {showViewAllLink ? (
          <Link href="/vendors" className="isonet-link inline-flex text-xs font-semibold uppercase tracking-[0.16em]">
            View full vendor list →
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-white/10 rounded-sm border border-white/10 bg-white/4">
        {vendors.map((vendor) => (
          <li
            key={vendor.user_id}
            className="grid gap-4 px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-slate-950/70">
              <VendorLogo vendor={vendor} />
            </div>

            <div className="min-w-0">
              <Link href={`/vendors/${vendor.user_id}`} className="text-sm font-semibold tracking-tight text-white hover:text-[var(--accent)]">
                {vendor.company_name}
              </Link>
              <p className="mt-1 text-sm leading-6 text-slate-400">{vendor.location_label}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href={`/vendors/${vendor.user_id}`}
                className="isonet-button-secondary inline-flex min-h-0 px-3 py-2 text-[10px]"
              >
                Profile
              </Link>
              {vendor.website_url ? (
                <a
                  href={vendor.website_url}
                  className="isonet-button-secondary inline-flex min-h-0 px-3 py-2 text-[10px]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Website
                </a>
              ) : (
                <span className="rounded-sm border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  No website
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showViewAllLink ? (
        <Link href="/vendors" className="isonet-link inline-flex text-xs font-semibold uppercase tracking-[0.16em]">
          View full vendor list →
        </Link>
      ) : null}
    </div>
  );
}
