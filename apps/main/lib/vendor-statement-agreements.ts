export const VENDOR_STATEMENT_AGREEMENT_VERSION = "2026-05-27";

export type VendorStatementAgreementRecord = {
  key: string;
  title: string;
  agreed_at: string;
  statement_version: string;
};

export type VendorStatementAgreement = {
  key: string;
  title: string;
  statementAnchor: string;
  summary: string;
  checkboxLabel: string;
};

export type VendorAgreementPage = {
  step: number;
  eyebrow: string;
  title: string;
  description: string;
  agreements: VendorStatementAgreement[];
};

export const vendorStatementAgreements: VendorStatementAgreement[] = [
  {
    key: "why-isonet-exists",
    title: "Why IsoNet exists",
    statementAnchor: "why-isonet-exists",
    summary:
      "I understand IsoNet exists to raise hobby standards through a visible trust mark, vendor directory, reviews, and clear conduct expectations—not to replace law enforcement, but to help honest vendors stand apart.",
    checkboxLabel:
      "I agree to uphold IsoNet’s purpose and operate as a vendor who supports accountability in the hobby.",
  },
  {
    key: "legal-and-honest-trade",
    title: "Legal import, export, and shipping",
    statementAnchor: "legal-and-honest-trade",
    summary:
      "I will follow applicable laws and carrier rules, avoid illegal “brown boxing” or undeclared imports, and be transparent with customers about lawful sourcing and shipping.",
    checkboxLabel:
      "I agree to legal and ethical trade practices, including honest import, export, and shipping.",
  },
  {
    key: "truth-in-labeling",
    title: "Truth in labeling (WC, CB, CBB)",
    statementAnchor: "truth-in-labeling",
    summary:
      "I will represent species, origin class (WC, CB, CBB, etc.), and morph or line names honestly—not with vague marketing that hides wild-caught stock or misleads buyers.",
    checkboxLabel:
      "I agree to truthful labeling and honest listings for origin, species, and morphs.",
  },
  {
    key: "sanitary-supplies",
    title: "Sanitary botanicals and enclosure materials",
    statementAnchor: "sanitary-supplies",
    summary:
      "I will prepare and disclose how leaf litter, wood, and other botanicals are handled, and avoid shipping materials likely to contaminate a buyer’s colony or container.",
    checkboxLabel:
      "I agree to sanitary botanicals and responsible enclosure product practices.",
  },
  {
    key: "customer-service",
    title: "Timely, professional customer service",
    statementAnchor: "customer-service",
    summary:
      "I will communicate clearly and respond reasonably to inquiries and issues, with transparent policies for live arrival, shipping, and resolution paths.",
    checkboxLabel:
      "I agree to timely, professional customer service before and after sale.",
  },
  {
    key: "no-scams",
    title: "No scams or fraudulent sales",
    statementAnchor: "no-scams",
    summary:
      "I will not engage in fraudulent sales, stolen listings, misrepresented stock, or pressure tactics designed to evade accountability.",
    checkboxLabel:
      "I agree to zero tolerance for scams, stolen listings, and predatory payment practices.",
  },
  {
    key: "genetic-integrity",
    title: "Species identity and clean bloodlines",
    statementAnchor: "genetic-integrity",
    summary:
      "I will provide accurate IDs, honest line history, and clear disclosure when morphs are mixed, new, or not breeding true—and deliver what was advertised.",
    checkboxLabel:
      "I agree to accurate species identity and honest bloodline representation.",
  },
  {
    key: "accountability-and-oversight",
    title: "Accountability & oversight",
    statementAnchor: "our-pledge",
    summary:
      "I accept that IsoNet may document reviews, disputes, and standing changes that can affect badge eligibility, directory visibility, and approval status if I fall short of these standards.",
    checkboxLabel:
      "I agree to IsoNet review, oversight, and accountability when I fall short of these standards.",
  },
];

export const vendorAgreementPages: VendorAgreementPage[] = [
  {
    step: 4,
    eyebrow: "Step 4 · Standards",
    title: "Purpose & legal trade",
    description:
      "Read each item below and confirm your agreement before continuing. You can review the full public statement anytime.",
    agreements: vendorStatementAgreements.filter((item) =>
      ["why-isonet-exists", "legal-and-honest-trade"].includes(item.key),
    ),
  },
  {
    step: 5,
    eyebrow: "Step 5 · Standards",
    title: "Labeling & sanitary products",
    description:
      "These expectations protect buyers from mislabeled stock and contaminated enclosure materials.",
    agreements: vendorStatementAgreements.filter((item) =>
      ["truth-in-labeling", "sanitary-supplies"].includes(item.key),
    ),
  },
  {
    step: 6,
    eyebrow: "Step 6 · Standards",
    title: "Service & fraud",
    description:
      "Professional communication and zero tolerance for scams are required for every IsoNet vendor.",
    agreements: vendorStatementAgreements.filter((item) =>
      ["customer-service", "no-scams"].includes(item.key),
    ),
  },
  {
    step: 7,
    eyebrow: "Step 7 · Standards",
    title: "Genetics & accountability",
    description:
      "Confirm honest genetics practices and that you accept IsoNet oversight if standards are not met.",
    agreements: vendorStatementAgreements.filter((item) =>
      ["genetic-integrity", "accountability-and-oversight"].includes(item.key),
    ),
  },
];

export const VENDOR_SIGNUP_STEP_COUNT = 9;
export const VENDOR_SIGNUP_REVIEW_STEP = 8;
export const VENDOR_SIGNUP_CONFIRM_STEP = 9;
export const VENDOR_SIGNUP_FIRST_AGREEMENT_STEP = 4;
export const VENDOR_SIGNUP_LAST_AGREEMENT_STEP = 7;

export function createEmptyAgreementState() {
  return Object.fromEntries(
    vendorStatementAgreements.map((agreement) => [agreement.key, false]),
  ) as Record<string, boolean>;
}

export function getAgreementPageForStep(step: number) {
  return vendorAgreementPages.find((page) => page.step === step) ?? null;
}

export function buildStatementAgreementRecords(
  agreements: Record<string, boolean>,
  agreedAt: string = new Date().toISOString(),
) {
  return vendorStatementAgreements
    .filter((agreement) => agreements[agreement.key])
    .map((agreement) => ({
      key: agreement.key,
      title: agreement.title,
      agreed_at: agreedAt,
      statement_version: VENDOR_STATEMENT_AGREEMENT_VERSION,
    }));
}

export function allStatementAgreementsAccepted(agreements: Record<string, boolean>) {
  return vendorStatementAgreements.every((agreement) => agreements[agreement.key]);
}
