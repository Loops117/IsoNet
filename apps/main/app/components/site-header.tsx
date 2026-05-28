import Link from "next/link";

import { SiteNavMenus } from "./site-nav-menus";

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

        <SiteNavMenus variant="header" />
      </div>
    </header>
  );
}
