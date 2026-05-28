import { siteNavMainLinks, siteNavSubLinks } from "../../lib/site-nav";
import { SiteNavAnchor } from "./site-nav-link";

type SiteNavMenusProps = {
  id?: string;
  variant?: "header" | "hero";
  mainLinkClassName?: string;
  subLinkClassName?: string;
  className?: string;
};

export function SiteNavMenus({
  id,
  variant = "header",
  mainLinkClassName,
  subLinkClassName,
  className,
}: SiteNavMenusProps) {
  const isHero = variant === "hero";

  const wrapperClassName = [
    "site-nav-menus",
    isHero ? "home-hero-nav" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const mainClassName =
    mainLinkClassName ??
    (isHero ? "isonet-link home-hero-nav__link home-hero-nav__link--main" : "site-header__link");

  const subClassName =
    subLinkClassName ??
    (isHero
      ? "isonet-link home-hero-nav__link home-hero-nav__link--sub"
      : "site-header__link site-header__link--sub");

  return (
    <div id={id} className={wrapperClassName}>
      <nav
        aria-label="Primary navigation"
        className={[
          "site-nav-menus__row",
          "site-nav-menus__row--main",
          isHero ? "home-hero-nav__row home-hero-nav__row--main" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {siteNavMainLinks.map((link) => (
          <SiteNavAnchor key={link.href} link={link} className={mainClassName} />
        ))}
      </nav>
      <nav
        aria-label="Secondary navigation"
        className={[
          "site-nav-menus__row",
          "site-nav-menus__row--sub",
          isHero ? "home-hero-nav__row home-hero-nav__row--sub" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {siteNavSubLinks.map((link) => {
          const linkClassName = [
            subClassName,
            link.accent
              ? isHero
                ? "home-hero-nav__link--accent"
                : "site-header__link--sub-accent"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return <SiteNavAnchor key={link.href} link={link} className={linkClassName} />;
        })}
      </nav>
    </div>
  );
}
