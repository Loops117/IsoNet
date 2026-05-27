export type SiteNavLink = {
  label: string;
  href: string;
  external?: boolean;
};

export const facebookGroupUrl =
  "https://www.facebook.com/groups/theisopodnetwork/";

export const siteNavLinks: SiteNavLink[] = [
  { label: "Mission", href: "/#mission" },
  { label: "Forum", href: "/forum" },
  { label: "Our statement", href: "/statement" },
  { label: "Vendor access", href: "/vendor/signup" },
  { label: "Community", href: facebookGroupUrl, external: true },
];
