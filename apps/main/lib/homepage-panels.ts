export type HomepagePanel = {
  id: string;
  eyebrow: string;
  title: string;
  compact: string;
  description: string;
  points: string[];
  sort_order: number;
};

export const defaultHomepagePanels: HomepagePanel[] = [
  {
    id: "why-isonet",
    eyebrow: "Why IsoNet",
    title: "The hobby needs a standard before bad practices become normal.",
    compact: "Accountability for vendors. Confidence for keepers.",
    description:
      "Mislabeled stock, illegal imports, dirty supplies, silent sellers, scams, and wrong genetics all take advantage of buyers. IsoNet exists so honest vendors can be recognized and the hobby can raise its baseline together.",
    points: [
      "Make trust visible with a public badge and directory.",
      "Document reviews and patterns so problems surface early.",
      "Hold members to standards—not just good intentions.",
    ],
    sort_order: 1,
  },
  {
    id: "directory",
    eyebrow: "Directory",
    title: "Find vendors who accept the IsoNet standard.",
    compact: "Approved sellers in good standing—publicly listed.",
    description:
      "The directory will list vendors who meet network expectations for legal trade, honest listings, sanitary products, responsive service, and genetic integrity. Look for the badge before you buy.",
    points: [
      "Verify who is approved and in good standing.",
      "Compare sellers with shared expectations in mind.",
      "Support vendors who invest in doing it right.",
    ],
    sort_order: 2,
  },
  {
    id: "reviews",
    eyebrow: "Reviews",
    title: "One place to verify a seller’s track record.",
    compact: "Centralized feedback and dispute visibility.",
    description:
      "Reviews and documented experiences help hobbyists avoid repeat offenders and give fair vendors a record that speaks for itself. IsoNet is built to surface patterns—not just one-off stars.",
    points: [
      "Read experiences from other keepers in one hub.",
      "See disputes and standing changes over time.",
      "Protect buyers from exploitation and neglect.",
    ],
    sort_order: 3,
  },
  {
    id: "standards",
    eyebrow: "Standards",
    title: "Clear rules for conduct, care, and honesty.",
    compact: "What we expect from every approved vendor.",
    description:
      "Our full statement covers legal shipping, WC/CB/CBB labeling, sanitary botanicals, timely communication, zero tolerance for scams, and accurate species and bloodline representation. Vendors who join agree to be held accountable.",
    points: [
      "No brown boxing or fraudulent sales.",
      "Truth in origin, species, and morph labels.",
      "Professional customer service as part of the deal.",
    ],
    sort_order: 4,
  },
];
