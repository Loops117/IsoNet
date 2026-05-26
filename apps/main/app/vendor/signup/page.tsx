import type { Metadata } from "next";

import { VendorAccessPanel } from "../../components/vendor-access-panel";

export const metadata: Metadata = {
  title: "Vendor Signup | The Isopod Network",
  description:
    "Create a vendor account for onboarding, account review, dashboard access, and future subscription management.",
};

export default function VendorSignupPage() {
  return (
    <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
      <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="isonet-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            Vendor Signup
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Apply for your IsoNet vendor account.
          </h1>
          <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
            This dedicated signup page collects the core records needed to open a
            vendor account and prepare your dashboard for account status,
            reviews, analytics, and future subscription tiers.
          </p>
        </article>

        <VendorAccessPanel
          initialMode="signup"
          title="Vendor Access"
          description="Create your account here, or switch to sign-in if you already have a vendor login."
        />
      </section>
    </main>
  );
}
