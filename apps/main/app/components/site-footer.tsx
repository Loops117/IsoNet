import { facebookGroupUrl } from "../../lib/site-nav";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__text">
          Join the hobby conversation in our Facebook group.
        </p>
        <a
          href={facebookGroupUrl}
          className="site-footer__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          The Isopod Network on Facebook
        </a>
      </div>
    </footer>
  );
}
