import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our statement | The Isopod Network",
  description:
    "The Isopod Network's full public statement on legal trade, honest labeling, product integrity, customer service, fraud, and genetic accountability in the invert hobby.",
};

const sections = [
  {
    id: "why-isonet-exists",
    eyebrow: "Purpose",
    title: "Why IsoNet exists",
    paragraphs: [
      "The isopod and broader invert hobby has grown faster than shared rules of the road. Buyers often cannot verify origin, genetics, or product safety before they pay—and when something goes wrong, the cost lands on keepers and on honest vendors competing with corner-cutters.",
      "The Isopod Network (IsoNet) exists to help fix that imbalance: a visible standard, an approved-vendor directory, centralized reviews, and clear expectations for conduct. We are not a replacement for law enforcement or platform policies, but we are a place where the hobby can say, together, what trustworthy selling looks like.",
    ],
  },
  {
    id: "legal-and-honest-trade",
    eyebrow: "Legal & ethical trade",
    title: "Legal import, export, and shipping",
    paragraphs: [
      "Live invertebrates cross borders under strict rules in many countries. Circumventing permits, declarations, and inspection—sometimes called “brown boxing”—is illegal, risks seizure and penalties, and often subjects animals to longer, harsher shipping. It also undercuts vendors who invest in compliance and invites scrutiny on the entire hobby.",
      "IsoNet vendors are expected to follow applicable laws and postal or carrier rules. We promote transparency with customers about lawful sourcing and shipping—not hidden routes that only exist to dodge oversight.",
    ],
  },
  {
    id: "truth-in-labeling",
    eyebrow: "Origin & labels",
    title: "Truth in labeling: WC, CB, CBB, and honest listings",
    paragraphs: [
      "Wild-caught (WC) animals are taken from nature. Captive-born or captive-hatched offspring from WC parents are not the same as long-term captive-bred lines. “Captive bred” (CB) should mean produced from breeding in captivity; “captive bred and born” (CBB) is often used to stress that both the animal and its breeding line are captive-raised—though buyers should always ask sellers to define their terms.",
      "Mislabeling origin or using vague marketing names to hide WC stock harms animal welfare, conservation trust, and the buyer’s ability to plan care. IsoNet expects accurate representation: species, origin class, and morph or line names described honestly—not what sounds best in an ad.",
    ],
  },
  {
    id: "sanitary-supplies",
    eyebrow: "Products & enclosure safety",
    title: "Sanitary botanicals and enclosure materials",
    paragraphs: [
      "Leaf litter, wood, and other botanicals are central to isopod and bioactive husbandry. When these materials are not properly prepared, they can introduce mites, other hitchhikers, or fungal issues into a customer’s colony or vivarium—problems the customer did not cause and may not have the tools to fix quickly.",
      "Vendors should disclose how products are prepared (for example, heat-treated, frozen, or otherwise sanitized when appropriate) and avoid shipping materials that are likely to contaminate a buyer’s setup. IsoNet treats undisclosed or negligently “dirty” botanicals as a serious breach of buyer trust and animal-welfare expectations.",
    ],
  },
  {
    id: "customer-service",
    eyebrow: "Communication",
    title: "Timely, professional customer service",
    paragraphs: [
      "Invertebrates are live goods; questions and problems are normal. Vendors who go silent after payment, delay answers until disputes expire, or dismiss legitimate concerns erode confidence for everyone.",
      "IsoNet expects responsive, courteous communication: clear policies for live arrival, shipping windows, and resolution paths, and reasonable response times to inquiries and issues. Professional service is part of the standard—not an optional add-on.",
    ],
  },
  {
    id: "no-scams",
    eyebrow: "Fraud",
    title: "No scams, stolen listings, or predatory payments",
    paragraphs: [
      "The hobby sees stolen photos, fake inventories, pressure to pay through non-disputable methods, and deals pushed off trusted platforms. These practices steal money from keepers and damage legitimate small businesses.",
      "IsoNet does not tolerate vendors who engage in fraudulent sales, misrepresent stock, or systematically evade accountability. Our review and standing processes are designed to surface patterns that buyers should know about before they send payment.",
    ],
  },
  {
    id: "genetic-integrity",
    eyebrow: "Genetics & identity",
    title: "Species identity and clean bloodlines",
    paragraphs: [
      "Customers regularly pay premium prices for specific species, morphs, or lines. Selling the wrong species, mixing morphs without disclosure, or passing off unstable or “dirty” lines as pure undermines the buyer’s investment and the hobby’s genetic record.",
      "Ethical practice means accurate IDs (including scientific names where possible), honest discussion of line history, and clear disclosure when a morph is new, mixed, or not breeding true. IsoNet vendors are expected to deliver what was advertised—or make it right.",
    ],
  },
  {
    id: "our-pledge",
    eyebrow: "Commitment",
    title: "What IsoNet commits to",
    paragraphs: [
      "We are building a government-clear, public-facing framework: directory, reviews, standards, and a badge that signal vendors who accept these expectations. Admins and community input will help enforce standing over time.",
      "Hobbyists deserve a fair market. Vendors who do the work deserve credit. IsoNet is where those two ideas meet—so the hobby can grow without normalizing the practices that hurt keepers and honest sellers alike.",
    ],
  },
];

export default function StatementPage() {
  return (
    <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-3xl flex-col gap-10">
        <header className="isonet-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            Official statement
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The Isopod Network — public statement of purpose and standards
          </h1>
          <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
            This document describes what IsoNet stands for and the problems in the
            invert hobby we aim to push back against. It guides our directory, reviews,
            vendor expectations, and the trust mark we issue to approved members.
          </p>
          <div className="mt-6">
            <Link href="/" className="isonet-link text-sm font-semibold">
              ← Back to home
            </Link>
          </div>
        </header>

        <nav
          aria-label="Statement sections"
          className="isonet-panel p-5 sm:p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            On this page
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a className="isonet-link" href={`#${s.id}`}>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {sections.map((section) => (
          <article
            key={section.id}
            id={section.id}
            className="isonet-panel scroll-mt-24 p-6 sm:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              {section.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {section.title}
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-8 text-slate-300 sm:text-base">
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
          </article>
        ))}

        <footer className="isonet-panel p-6 text-center sm:p-8">
          <p className="text-sm leading-7 text-slate-300">
            Questions about this statement or vendor eligibility will be addressed
            as our review and application processes go live.
          </p>
          <Link
            href="/"
            className="isonet-button mt-6 inline-flex"
          >
            Return to homepage
          </Link>
        </footer>
      </div>
    </main>
  );
}
