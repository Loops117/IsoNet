import Link from "next/link";

import { facebookGroupUrl, siteNavLinks } from "../lib/site-nav";
import { MissionPanels } from "./components/mission-panels";
import { SiteNavAnchor } from "./components/site-nav-link";
import { TimelineProgress } from "./components/timeline-progress";

const timelineSteps = [
  {
    label: "Home Page",
    done: true,
    status: "Done",
    description:
      "The public homepage now reflects IsoNet’s mission, standards summaries, and links to our full statement.",
  },
  {
    label: "Vendor Portal",
    done: false,
    inProgress: true,
    status: "In-Progress",
    description:
      "Vendor signup, dashboard, and approval workflow are live for members building their profiles.",
  },
  {
    label: "Customer Portal",
    done: false,
    description:
      "A customer account area for saved activity, reports, and future order tools.",
  },
  {
    label: "Reviews Home",
    done: false,
    description:
      "The central review hub where hobbyists browse vendor feedback and accountability history.",
  },
  {
    label: "Official Launch",
    done: false,
    description:
      "Public-ready directory, reviews, and standing tools connected for everyday use.",
  },
];

const trustPillars = [
  {
    title: "The badge",
    description:
      "A visible mark for vendors who meet IsoNet expectations—so keepers know who stands behind the standard.",
  },
  {
    title: "Accountability",
    description:
      "Reviews, admin oversight, and standing status so problems are documented—not buried in private chats.",
  },
  {
    title: "Honest trade",
    description:
      "Legal shipping, truthful labels, clean genetics, and service that respects the customer’s time and money.",
  },
];

const problemAreas = [
  {
    title: "Illegal import & brown boxing",
    summary:
      "Smuggling live inverts through undeclared mail undercuts honest sellers, risks DOAs, and invites enforcement on the whole hobby.",
    href: "/statement#legal-and-honest-trade",
  },
  {
    title: "Mislabeled origin (WC / CB / CBB)",
    summary:
      "Wild-caught, captive-born, and true captive-bred lines are not interchangeable. Vague labels hide health and ethics costs.",
    href: "/statement#truth-in-labeling",
  },
  {
    title: "Dirty botanicals",
    summary:
      "Unsanitized leaf litter and wood can introduce mites, hitchhikers, and fungus into a buyer’s colony or vivarium.",
    href: "/statement#sanitary-supplies",
  },
  {
    title: "Poor customer service",
    summary:
      "Going silent after payment—or ignoring DOA and mis-ship claims—leaves keepers holding the loss.",
    href: "/statement#customer-service",
  },
  {
    title: "Scams & stolen listings",
    summary:
      "Fake photos, off-platform pressure, and non-disputable payments prey on buyers and tarnish legitimate vendors.",
    href: "/statement#no-scams",
  },
  {
    title: "Dirty bloodlines & wrong stock",
    summary:
      "Wrong species, mixed morphs sold as pure, and unstable lines sold as clean genetics cheat customers out of what they paid for.",
    href: "/statement#genetic-integrity",
  },
];

const vendorExpectations = [
  "Follow applicable import, export, and shipping law—no brown boxing.",
  "Label origin, species, morph, and line history honestly.",
  "Ship sanitary botanicals and disclose preparation when it matters.",
  "Respond to customers promptly and resolve issues in good faith.",
  "Never engage in fraud, misrepresentation, or predatory payment tactics.",
  "Deliver the genetics and species advertised—or make it right.",
];

const accountabilitySteps = [
  "Vendors apply and agree to the IsoNet public statement and standards.",
  "Admins review applications and ongoing compliance.",
  "Approved vendors are listed publicly and may display the IsoNet badge.",
  "Reviews, disputes, and standing updates keep accountability visible over time.",
];

const vendorPreviewRows = [
  { name: "Vendor directory opening soon", status: "Pending launch" },
  { name: "Approved vendor records", status: "In preparation" },
  { name: "Public browse tools", status: "Coming next" },
];

export default function Home() {
  return (
    <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-7xl flex-col gap-8">
        <section className="isonet-panel isonet-hero-panel overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4 sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  The Isopod Network
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Setting a standard for the invert hobby—before bad practices
                  become normal.
                </p>
              </div>

              <nav
                id="home-hero-nav"
                aria-label="Homepage navigation"
                className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300"
              >
                {siteNavLinks.map((link) => (
                  <SiteNavAnchor
                    key={link.href}
                    link={link}
                    className="isonet-link"
                  />
                ))}
              </nav>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-10 sm:px-8 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-14">
            <div className="space-y-7">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">
                  Public home
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Protecting hobbyists. Holding vendors accountable.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                  IsoNet is an accountability network for isopod and invert
                  vendors. We exist because mislabeled stock, illegal imports,
                  dirty supplies, scams, and dishonest genetics take advantage of
                  keepers—and hurt vendors who do the work honestly. Our badge,
                  directory, and reviews are built to change that.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link className="isonet-button" href="/statement">
                  Read our full statement
                </Link>
                <Link className="isonet-button-secondary" href="/vendor/signup">
                  Vendor sign up
                </Link>
              </div>
            </div>

            <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {trustPillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-sm border border-white/10 bg-white/5 p-5"
                >
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
                    {pillar.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {pillar.description}
                  </p>
                </article>
              ))}
            </aside>
          </div>
        </section>

        <TimelineProgress steps={timelineSteps} />

        <section
          id="problems"
          className="isonet-panel p-6 sm:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                What hurts the hobby
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                Practices we are built to push back against.
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
                These issues exploit buyers, damage colonies, and make honest
                vendors compete on an uneven field. IsoNet vendors commit to
                the opposite—and accept oversight when they fall short.
              </p>
            </div>
            <Link
              href="/statement"
              className="isonet-button-secondary shrink-0 self-start lg:self-auto"
            >
              Read full statement
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {problemAreas.map((area) => (
              <article
                key={area.title}
                className="flex flex-col rounded-sm border border-white/10 bg-white/4 p-5"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">
                  {area.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-slate-300">
                  {area.summary}
                </p>
                <Link
                  href={area.href}
                  className="isonet-link mt-4 text-xs font-semibold uppercase tracking-[0.18em]"
                >
                  Read more →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="isonet-panel grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="badge-placeholder">
                <div className="badge-placeholder__inner">
                  <div className="badge-placeholder__label-group">
                    <span className="badge-placeholder__label">Badge</span>
                    <span className="badge-placeholder__sublabel">Placeholder</span>
                  </div>
                </div>
              </div>
              <p className="badge-placeholder__caption">
                We&apos;re still working on badge design
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                Look for the badge
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                Trust you can see before you buy.
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
                Approved IsoNet vendors display an official mark meaning they
                accept our statement: legal trade, honest labels, sanitary
                products, responsive service, no scams, and accurate genetics.
                If you do not see the badge, you are not buying under our
                standard.
              </p>
              <Link
                href="/statement#our-pledge"
                className="isonet-link mt-4 inline-block text-sm font-semibold"
              >
                What the badge represents →
              </Link>
            </div>
          </article>

          <article
            id="vendors"
            className="isonet-panel flex flex-col gap-6 p-6 sm:p-8"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                Vendor list
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                Browse vendors in good standing.
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
                The public directory will list sellers who meet IsoNet
                expectations—not everyone with a storefront. Use it to verify
                standing before you send payment.
              </p>
            </div>

            <div className="rounded-sm border border-white/10 bg-white/4">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span>Directory item</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-white/10">
                {vendorPreviewRows.map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 text-sm"
                  >
                    <span className="text-slate-100">{row.name}</span>
                    <span className="rounded-sm border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section id="mission" className="space-y-6">
          <div className="isonet-panel p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              Mission overview
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Directory, reviews, and standards—working together.
            </h2>
            <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
              Hover any pane below to expand it. Each pillar connects to the
              same goal: stop exploitation in the hobby and reward vendors who
              uphold the standard.
            </p>
            <Link
              href="/statement"
              className="isonet-link mt-4 inline-block text-sm font-semibold"
            >
              Read the complete statement →
            </Link>
          </div>

          <div id="directory" className="sr-only">
            Directory section
          </div>
          <MissionPanels />
        </section>

        <section
          id="standards"
          className="isonet-panel grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_0.9fr]"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              Vendor expectations
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              What every IsoNet vendor agrees to uphold.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
              Membership is not a logo on a website—it is a commitment to
              customers and to the hobby. Falling short can affect standing,
              visibility, and badge eligibility.
            </p>
            <Link
              href="/statement"
              className="isonet-button-secondary mt-6 inline-flex"
            >
              Full standards & statement
            </Link>
          </div>

          <div className="rounded-sm border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
              Core requirements
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              {vendorExpectations.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="process"
          className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <article className="isonet-panel p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Trust is earned, reviewed, and maintained.
            </h2>
            <ol className="mt-6 space-y-4">
              {accountabilitySteps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-4 rounded-sm border border-white/10 bg-white/4 p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[var(--accent)]/50 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-7 text-slate-300">{step}</p>
                </li>
              ))}
            </ol>
          </article>

          <article className="isonet-panel flex flex-col justify-between gap-6 p-6 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                For hobbyists & vendors
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                The hobby can do better—and we are building the framework.
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
                Whether you buy or sell, IsoNet is meant to make expectations
                clear and consequences visible. Read our full statement to see
                exactly where we stand on the issues hurting keepers today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/statement" className="isonet-button">
                Read our statement
              </Link>
              <Link href="/vendor/signup" className="isonet-button-secondary">
                Apply as a vendor
              </Link>
              <a
                href={facebookGroupUrl}
                className="isonet-button-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join our Facebook group
              </a>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
