import Link from "next/link";

import type { SiteNavLink } from "../../lib/site-nav";

type SiteNavLinkProps = {
  link: SiteNavLink;
  className: string;
};

export function SiteNavAnchor({ link, className }: SiteNavLinkProps) {
  if (link.external) {
    return (
      <a
        href={link.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}
