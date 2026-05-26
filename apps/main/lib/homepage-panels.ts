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
    title: "The hobby deserves a recognizable standard.",
    compact: "A public trust signal for vendors and hobbyists alike.",
    description:
      "Reliable vendors should be easier to find, and poor practices should be easier to identify. IsoNet is being structured to support both goals through clear standards, documented feedback, and a public trust signal customers can understand at a glance.",
    points: [
      "Create a visible standard customers can rely on.",
      "Reward vendors who consistently operate responsibly.",
      "Make accountability part of the hobby's normal expectations.",
    ],
    sort_order: 1,
  },
  {
    id: "directory",
    eyebrow: "Directory",
    title: "Find vendors the community can trust.",
    compact: "A public list of sellers that meet the network standard.",
    description:
      "IsoNet will maintain a public list of approved vendors who agree to follow shared standards for listings, shipping, communication, and issue resolution.",
    points: [
      "Publicly list vendors in good standing.",
      "Help hobbyists compare sellers with more confidence.",
      "Give trusted vendors a clearer mark of credibility.",
    ],
    sort_order: 2,
  },
  {
    id: "reviews",
    eyebrow: "Reviews",
    title: "Give hobbyists one place to verify a seller.",
    compact: "Centralized reviews and pattern tracking for customer safety.",
    description:
      "Reviews, documented experiences, and pattern tracking will help customers make informed decisions and help vendors protect their reputation through consistent service.",
    points: [
      "Centralize review visibility for buyers.",
      "Identify recurring issues before they become widespread.",
      "Preserve fair reputations through documented experiences.",
    ],
    sort_order: 3,
  },
  {
    id: "standards",
    eyebrow: "Standards",
    title: "Raise the baseline for the hobby.",
    compact: "Formal expectations around care, honesty, and service.",
    description:
      "The network is being built to formalize expectations around care, ethics, honesty in listings, and the customer experience so reputable vendors can stand apart.",
    points: [
      "Set clear standards for conduct and communication.",
      "Support ethical sales and more consistent care expectations.",
      "Separate dependable vendors from low-effort operators.",
    ],
    sort_order: 4,
  },
];
