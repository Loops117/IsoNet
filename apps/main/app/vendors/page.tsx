import type { Metadata } from "next";
import Link from "next/link";

import { SiteNavMenus } from "../components/site-nav-menus";
import { VendorDirectoryList } from "../components/vendor-directory-list";
import { fetchPublicVendorListings } from "../../lib/public-vendors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendor List | The Isopod Network",
  description:
    "Browse IsoNet vendors with approved, in good standing, or needs updates status.",
};

export default async function VendorsPage() {
  let vendors: Awaited<ReturnType<typeof fetchPublicVendorListings>> = [];

  try {
    vendors = await fetchPublicVendorListings();
  } catch {
    vendors = [];
  }

  return (
    <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <header className="isonet-panel p-6 sm:p-8">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              Vendor directory
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              IsoNet vendor list
            </h1>
          </div>
          <Link href="/" className="isonet-link mt-6 inline-flex text-xs font-semibold uppercase tracking-[0.16em]">
            ← Back to home
          </Link>
        </header>

        <section className="isonet-panel p-6 sm:p-8">
          <VendorDirectoryList vendors={vendors} />
        </section>
      </div>
    </main>
  );
}
