import Link from "next/link";

import { siteNavLinks } from "../../lib/site-nav";
import { SiteNavAnchor } from "./site-nav-link";

type SiteHeaderProps = {
  floating?: boolean;
  visible?: boolean;
};

export function SiteHeader({ floating = false, visible = true }: SiteHeaderProps) {
  return (
    <header
      className={[
        "site-header",
        floating ? "site-header--floating" : "",
        visible ? "site-header--visible" : "site-header--hidden",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!visible}
    >
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__brand-title">The Isopod Network</span>
          <span className="site-header__brand-subtitle">IsoNet</span>
        </Link>

        <nav className="site-header__nav" aria-label="Site navigation">
          {siteNavLinks.map((link) => (
            <SiteNavAnchor
              key={link.href}
              link={link}
              className="site-header__link"
            />
          ))}
        </nav>
      </div>
    </header>
  );
}
