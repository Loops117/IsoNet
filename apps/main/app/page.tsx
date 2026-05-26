import { MissionPanels } from "./components/mission-panels";
import { TimelineProgress } from "./components/timeline-progress";
const timelineSteps = [
  {
    label: "Home Page",
    done: true,
    status: "Done",
    description:
      "The public-facing homepage, mission sections, timeline, badge preview, and vendor-list preview are now live.",
  },
  {
    label: "Vendor Portal",
    done: true,
    status: "Done",
    description:
      "A dedicated vendor signup page and the first vendor dashboard are now live with profile, reviews, analytics, and subscription tracking.",
  },
  {
    label: "Customer Portal",
    done: false,
    description:
      "A customer account area for saved activity, future order tools, reports, and account-specific features.",
  },
  {
    label: "Reviews Home",
    done: false,
    description:
      "The central review hub where hobbyists can browse vendor feedback, patterns, and accountability history.",
  },
  {
    label: "Official Launch",
    done: false,
    description:
      "The point where the platform is considered public-ready, connected, and operational for real users.",
  },
];

const trustPillars = [
  {
    title: "Approved Vendors",
    description:
      "A trusted directory of sellers that meet IsoNet expectations for communication, animal care, and order fulfillment.",
  },
  {
    title: "Reviews and Oversight",
    description:
      "A central place for hobbyists to review experiences and for the network to identify repeat issues before they become the norm.",
  },
  {
    title: "Open Market Standards",
    description:
      "A marketplace framework designed to promote safer sales, clearer expectations, and more reliable transactions.",
  },
];

const accountabilitySteps = [
  "Vendors apply or are invited into the network.",
  "Admins review compliance with the IsoNet standard.",
  "Approved vendors are listed publicly for hobbyists.",
  "Reviews and issue reporting help maintain accountability over time.",
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
                  Building a trusted standard for isopod and invert vendors.
                </p>
              </div>

              <nav className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                <a className="isonet-link" href="#mission">
                  Mission
                </a>
                <a className="isonet-link" href="#directory">
                  Directory
                </a>
                <a className="isonet-link" href="/vendor/signup">
                  Vendor Access
                </a>
                <a className="isonet-link" href="#standards">
                  Standards
                </a>
                <a className="isonet-link" href="#process">
                  Process
                </a>
              </nav>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-10 sm:px-8 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-14">
            <div className="space-y-7">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">
                  Public Home
                </p>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  A formal network for trusted vendors, transparent reviews, and
                  stronger standards.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                  IsoNet is being established as an accountability-driven home
                  for reputable isopod and invert vendors. The goal is simple:
                  help hobbyists identify trustworthy sellers while creating a
                  standard vendors can be proud to uphold.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a className="isonet-button" href="/vendor/signup">
                  Vendor sign up
                </a>
                <a className="isonet-button-secondary" href="/vendor">
                  Open vendor portal
                </a>
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

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="isonet-panel grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="flex justify-center lg:justify-start">
              <div className="badge-placeholder">
                <div className="badge-placeholder__inner">
                  <span className="badge-placeholder__eyebrow">IsoNet</span>
                  <span className="badge-placeholder__title">Badge</span>
                  <span className="badge-placeholder__seal" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                Look for the badge
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                A visible trust mark for approved vendors.
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
                IsoNet-approved vendors will display an official badge so
                hobbyists can quickly identify sellers who meet the network
                standard. This placeholder represents the future approval mark.
              </p>
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
                Browse the approved vendor directory.
              </h2>
              <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
                This pane will become the public entry point for the IsoNet
                vendor list, where hobbyists can verify which sellers are in
                good standing.
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

            <div>
              <a className="isonet-button-secondary" href="#process">
                View vendor list
              </a>
            </div>
          </article>
        </section>

        <section id="mission" className="space-y-6">
          <div className="isonet-panel p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              Mission Overview
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Explore the four public pillars of IsoNet.
            </h2>
            <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
              Hover over any pane below to expand it. The selected panel will
              widen while the others collapse back to equal compact widths, so
              visitors can focus on one part of the public mission at a time.
            </p>
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
              Standards Framework
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Built to encourage responsible selling and better customer care.
            </h2>
            <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
              IsoNet will define shared expectations for listing accuracy,
              packaging, shipping practices, communication, and dispute
              resolution. The goal is not just to list vendors, but to help
              establish what good business should look like in the hobby.
            </p>
          </div>

          <div className="rounded-sm border border-white/10 bg-white/4 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
              Early policy areas
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>Accurate product representation and listing honesty</li>
              <li>Humane handling, care, and shipping expectations</li>
              <li>Clear customer communication before and after sale</li>
              <li>Documented review and accountability procedures</li>
              <li>Consistent vendor standing and approval criteria</li>
            </ul>
          </div>
        </section>

        <section
          id="process"
          className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <article className="isonet-panel p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              Accountability Process
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Public trust should be earned and maintained.
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

          <article className="isonet-panel p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              Public Notice
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              The platform is now under active construction.
            </h2>
            <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
              The customer-facing homepage is live as the first public layer of
              IsoNet. Vendor directories, review systems, standards pages, and
              account features will be connected in the next development stages.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
