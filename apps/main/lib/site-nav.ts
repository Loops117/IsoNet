export type SiteNavLink = {
  label: string;
  href: string;
  external?: boolean;
  /** Inverted background/text for emphasis (e.g. Vendor Access). */
  accent?: boolean;
};

export const facebookGroupUrl =
  "https://www.facebook.com/groups/theisopodnetwork/";

export const siteNavMainLinks: SiteNavLink[] = [
  { label: "Mission", href: "/#mission" },
  { label: "Vendor List", href: "/vendors" },
  { label: "Our Statement", href: "/statement" },
];

export const siteNavSubLinks: SiteNavLink[] = [
  { label: "Forum", href: "/forum" },
  { label: "Community", href: facebookGroupUrl, external: true },
  { label: "Vendor Access", href: "/vendor", accent: true },
];

/** @deprecated Use siteNavMainLinks and siteNavSubLinks */
export const siteNavLinks: SiteNavLink[] = [...siteNavMainLinks, ...siteNavSubLinks];
