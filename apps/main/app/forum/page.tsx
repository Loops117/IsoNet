import type { Metadata } from "next";
import Link from "next/link";

import { facebookGroupUrl } from "../../lib/site-nav";

export const metadata: Metadata = {
  title: "Forum | The Isopod Network",
  description:
    "The Isopod Network forum—community discussion, vendor experiences, husbandry help, and hobby accountability in one place.",
};

const forumCategories = [
  {
    title: "General discussion",
    description:
      "Introduce yourself, share setups, and talk invert keeping with other hobbyists who care about doing it right.",
  },
  {
    title: "Vendor experiences & reviews",
    description:
      "Discuss sellers, share documented experiences, and help others buy with more context—aligned with IsoNet’s accountability goals.",
  },
  {
    title: "Care & husbandry",
    description:
      "Species care, breeding, enclosure builds, and problem-solving—practical help from the community.",
  },
  {
    title: "Standards & accountability",
    description:
      "Questions about IsoNet expectations, the badge, standing, and what trustworthy selling should look like in the hobby.",
  },
  {
    title: "Marketplace watch",
    description:
      "Spot questionable listings, labeling issues, and practices that hurt buyers—so patterns are visible before money changes hands.",
  },
];

export default function ForumPage() {
  return (
    <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-3xl flex-col gap-10">
        <header className="isonet-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            IsoNet forum
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            A home for hobby discussion and accountability
          </h1>
          <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
            We are building a dedicated forum for keepers and vendors—somewhere
            to ask questions, share experiences, and talk about the issues that
            matter to the invert hobby without everything living in scattered DMs
            or platform threads.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/" className="isonet-link text-sm font-semibold">
              ← Back to home
            </Link>
            <a
              href={facebookGroupUrl}
              className="isonet-link text-sm font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join our Facebook group →
            </a>
          </div>
        </header>

        <section className="isonet-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/90">
            In development
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Forum threads are coming soon
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300 sm:text-base">
            Accounts, categories, and posting are not live yet. The layout below
            shows the discussion areas we are planning. Until the forum opens,
            our Facebook group is the best place to connect with the community.
          </p>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Planned categories
          </p>
          <ul className="space-y-4">
            {forumCategories.map((category) => (
              <li key={category.title}>
                <article className="isonet-panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      {category.title}
                    </h3>
                    <span className="rounded-sm border border-white/12 bg-white/4 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Coming soon
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {category.description}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <footer className="isonet-panel p-6 text-center sm:p-8">
          <p className="text-sm leading-7 text-slate-300">
            Want updates when the forum launches? Stay active in our Facebook
            group—we will announce there first.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={facebookGroupUrl}
              className="isonet-button inline-flex"
              target="_blank"
              rel="noopener noreferrer"
            >
              Go to Facebook group
            </a>
            <Link href="/statement" className="isonet-button-secondary inline-flex">
              Read our statement
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
