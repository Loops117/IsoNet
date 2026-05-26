"use client";

import type { Session } from "@supabase/supabase-js";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  defaultHomepagePanels,
  type HomepagePanel,
} from "../../lib/homepage-panels";
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserEnv,
} from "../../lib/supabase";

type AdminProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
};

type TopLevelSection = "vendors" | "customers" | "sales" | "settings";

const paneMenu = [
  { id: "why-isonet", label: "Why IsoNet" },
  { id: "directory", label: "Directory" },
  { id: "reviews", label: "Reviews" },
  { id: "standards", label: "Standards" },
];

const placeholderContent: Record<
  Exclude<TopLevelSection, "settings">,
  { title: string; description: string; bullets: string[] }
> = {
  vendors: {
    title: "Vendor management placeholder",
    description:
      "This section will become the operating area for vendor approvals, standing, compliance checks, and account oversight.",
    bullets: [
      "Application review queue",
      "Approved and suspended vendor lists",
      "Compliance and incident tracking",
    ],
  },
  customers: {
    title: "Customer management placeholder",
    description:
      "This section will eventually hold customer records, issue histories, dispute references, and account-level moderation tools.",
    bullets: [
      "Customer issue history",
      "Review moderation references",
      "Case tracking and support notes",
    ],
  },
  sales: {
    title: "Sales placeholder",
    description:
      "This section is reserved for future sales analytics, transaction reviews, and network-wide activity reporting.",
    bullets: [
      "Sales reporting dashboards",
      "Order oversight and issue flags",
      "Marketplace activity summaries",
    ],
  },
};

function normalizePanels(data: unknown): HomepagePanel[] {
  if (!Array.isArray(data) || data.length === 0) {
    return defaultHomepagePanels;
  }

  const normalized = data
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      return {
        id: String(record.id ?? ""),
        eyebrow: String(record.eyebrow ?? ""),
        title: String(record.title ?? ""),
        compact: String(record.compact ?? ""),
        description: String(record.description ?? ""),
        points: Array.isArray(record.points)
          ? record.points.filter((point): point is string => typeof point === "string")
          : [],
        sort_order:
          typeof record.sort_order === "number" ? record.sort_order : Number(record.sort_order ?? 0),
      };
    })
    .filter(
      (record): record is HomepagePanel =>
        Boolean(record?.id && record.eyebrow && record.title && record.description),
    )
    .sort((left, right) => left.sort_order - right.sort_order);

  return normalized.length > 0 ? normalized : defaultHomepagePanels;
}

function linesToPoints(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AdminPortal() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const supabaseConfigured = hasSupabaseBrowserEnv();

  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [panels, setPanels] = useState<HomepagePanel[]>(defaultHomepagePanels);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<TopLevelSection>("settings");
  const [selectedPaneId, setSelectedPaneId] = useState("why-isonet");
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function loadPanels() {
      const { data, error } = await client
        .from("site_homepage_panels")
        .select("id, eyebrow, title, compact, description, points, sort_order")
        .order("sort_order", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setSettingsError(
          "Homepage pane settings are not available yet. Apply the Supabase migration before editing this section.",
        );
        setPanels(defaultHomepagePanels);
        return;
      }

      const normalized = normalizePanels(data);
      setPanels(normalized);
      setSelectedPaneId((currentPane) =>
        normalized.some((panel) => panel.id === currentPane)
          ? currentPane
          : normalized[0]?.id ?? "why-isonet",
      );
    }

    async function syncSession(nextSession: Session | null) {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setSettingsMessage(null);

      if (!nextSession) {
        setAdminProfile(null);
        setAuthReady(true);
        return;
      }

      const { data, error } = await client
        .from("admin_users")
        .select("user_id, email, full_name, is_active")
        .eq("user_id", nextSession.user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error || !data || !data.is_active) {
        setAdminProfile(null);
        setAuthError(
          error?.message ??
            "Your account is not authorized for the admin portal. Add the user to the admin_users table first.",
        );
        await client.auth.signOut();
        setAuthReady(true);
        return;
      }

      setAdminProfile(data);
      setAuthError(null);
      await loadPanels();
      setAuthReady(true);
    }

    void client.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
        setAuthReady(true);
        return;
      }

      void syncSession(data.session);
    });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setAuthError(
        "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to this admin app first.",
      );
      return;
    }

    setAuthPending(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      setAuthError(error.message);
    }

    setAuthPending(false);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setAuthPending(true);
    await supabase.auth.signOut();
    setAuthPending(false);
  }

  async function handleSavePane() {
    if (!supabase || !session) {
      setSettingsError("You must be signed in before saving settings.");
      return;
    }

    const activePanel =
      panels.find((panel) => panel.id === selectedPaneId) ?? defaultHomepagePanels[0];

    setSavePending(true);
    setSettingsError(null);
    setSettingsMessage(null);

    const payload = {
      id: activePanel.id,
      eyebrow: activePanel.eyebrow.trim(),
      title: activePanel.title.trim(),
      compact: activePanel.compact.trim(),
      description: activePanel.description.trim(),
      points: activePanel.points,
      sort_order: activePanel.sort_order,
      updated_by: session.user.id,
    };

    const { error } = await supabase
      .from("site_homepage_panels")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      setSettingsError(error.message);
      setSavePending(false);
      return;
    }

    setSettingsMessage("Homepage pane settings saved.");
    setSavePending(false);
  }

  function updatePanel(
    panelId: string,
    updater: (panel: HomepagePanel) => HomepagePanel,
  ) {
    setPanels((currentPanels) =>
      currentPanels.map((panel) =>
        panel.id === panelId ? updater(panel) : panel,
      ),
    );
  }

  const activePanel =
    panels.find((panel) => panel.id === selectedPaneId) ?? defaultHomepagePanels[0];

  if (!authReady) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <section className="admin-shell flex w-full max-w-4xl items-center justify-center p-12">
          <div className="space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">
              Administrative Access
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Loading admin portal
            </h1>
            <p className="text-sm leading-7 text-slate-300">
              Checking authentication and configuration.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!session || !adminProfile) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <section className="admin-shell grid w-full max-w-6xl gap-8 overflow-hidden lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-white/10 p-8 lg:border-r lg:border-b-0 lg:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">
              Administrative Access
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              IsoNet Control Portal
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Authorized administrators can sign in here to manage homepage
              content, vendor governance, and future moderation tools for The
              Isopod Network.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                "Vendor governance",
                "Review oversight",
                "Standards administration",
                "Homepage content control",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-sm border border-white/10 bg-white/4 px-4 py-5"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 lg:p-12">
            <div className="rounded-sm border border-white/10 bg-black/15 p-6 shadow-2xl shadow-black/20">
              <div className="border-b border-white/10 pb-5">
                <h2 className="text-2xl font-semibold text-white">
                  Administrator Sign-In
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Email and password sign-in is enabled for authorized admin
                  accounts.
                </p>
              </div>

              {!supabaseConfigured ? (
                <div className="mt-6 rounded-sm border border-amber-300/30 bg-amber-200/10 px-4 py-4 text-sm leading-7 text-amber-100">
                  This app is missing `NEXT_PUBLIC_SUPABASE_URL` and
                  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so live login cannot start yet.
                </div>
              ) : null}

              <form className="mt-6 space-y-5" onSubmit={handleSignIn}>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                    Email Address
                  </span>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="admin@theisopodnetwork.com"
                    className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    autoComplete="email"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                    Password
                  </span>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(event) =>
                      setCredentials((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Enter password"
                    className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    autoComplete="current-password"
                  />
                </label>

                {authError ? (
                  <div className="rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-3 text-sm leading-7 text-rose-100">
                    {authError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={authPending || !supabaseConfigured}
                  className="w-full rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authPending ? "Signing In" : "Sign In"}
                </button>
              </form>

              <p className="mt-5 text-xs leading-6 text-slate-400">
                The account must exist in Supabase Auth and also be present in
                the `admin_users` table to gain access to the portal.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center px-5 py-6 sm:px-6 sm:py-8">
      <section className="admin-shell grid w-full max-w-7xl gap-0 overflow-hidden lg:grid-cols-[290px_1fr]">
        <aside className="border-b border-white/10 p-6 lg:border-r lg:border-b-0">
          <div className="border-b border-white/10 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              IsoNet Admin
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              Control Portal
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Signed in as {adminProfile.full_name || adminProfile.email}
            </p>
          </div>

          <nav className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Management
              </p>
              <div className="mt-3 space-y-2">
                {(["vendors", "customers", "sales"] as const).map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setActiveSection(section)}
                    className={[
                      "admin-nav-button w-full text-left",
                      activeSection === section ? "admin-nav-button-active" : "",
                    ].join(" ")}
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Content Settings
              </p>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("settings");
                    setSettingsExpanded((current) => !current);
                  }}
                  className={[
                    "admin-nav-button w-full text-left",
                    activeSection === "settings" ? "admin-nav-button-active" : "",
                  ].join(" ")}
                >
                  Settings
                </button>

                {settingsExpanded ? (
                  <div className="space-y-2 border-l border-white/10 pl-3">
                    {paneMenu.map((pane) => (
                      <button
                        key={pane.id}
                        type="button"
                        onClick={() => {
                          setActiveSection("settings");
                          setSelectedPaneId(pane.id);
                        }}
                        className={[
                          "admin-subnav-button w-full text-left",
                          selectedPaneId === pane.id && activeSection === "settings"
                            ? "admin-subnav-button-active"
                            : "",
                        ].join(" ")}
                      >
                        {pane.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </nav>

          <div className="mt-8 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authPending}
              className="admin-ghost-button w-full"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="p-6 sm:p-8 lg:p-10">
          {activeSection === "settings" ? (
            <div className="space-y-6">
              <header className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Settings
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  Homepage pane content
                </h2>
                <p className="max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
                  Use this section to control the four expandable panes on the
                  customer-facing homepage. Changes here update the pane label,
                  summary text, full description, and supporting bullet points.
                </p>
              </header>

              {settingsError ? (
                <div className="rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-4 text-sm leading-7 text-rose-100">
                  {settingsError}
                </div>
              ) : null}

              {settingsMessage ? (
                <div className="rounded-sm border border-emerald-300/30 bg-emerald-200/10 px-4 py-4 text-sm leading-7 text-emerald-100">
                  {settingsMessage}
                </div>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-sm border border-white/10 bg-black/12 p-6">
                  <div className="border-b border-white/10 pb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      Editing
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">
                      {paneMenu.find((pane) => pane.id === selectedPaneId)?.label}
                    </h3>
                  </div>

                  <div className="mt-6 space-y-5">
                    <label className="block space-y-2">
                      <span className="admin-field-label">Eyebrow</span>
                      <input
                        type="text"
                        value={activePanel.eyebrow}
                        onChange={(event) =>
                          updatePanel(activePanel.id, (panel) => ({
                            ...panel,
                            eyebrow: event.target.value,
                          }))
                        }
                        className="admin-input"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="admin-field-label">Title</span>
                      <textarea
                        value={activePanel.title}
                        onChange={(event) =>
                          updatePanel(activePanel.id, (panel) => ({
                            ...panel,
                            title: event.target.value,
                          }))
                        }
                        rows={3}
                        className="admin-input min-h-[110px]"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="admin-field-label">Compact summary</span>
                      <textarea
                        value={activePanel.compact}
                        onChange={(event) =>
                          updatePanel(activePanel.id, (panel) => ({
                            ...panel,
                            compact: event.target.value,
                          }))
                        }
                        rows={3}
                        className="admin-input min-h-[110px]"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="admin-field-label">Expanded description</span>
                      <textarea
                        value={activePanel.description}
                        onChange={(event) =>
                          updatePanel(activePanel.id, (panel) => ({
                            ...panel,
                            description: event.target.value,
                          }))
                        }
                        rows={6}
                        className="admin-input min-h-[180px]"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="admin-field-label">Bullet points</span>
                      <textarea
                        value={activePanel.points.join("\n")}
                        onChange={(event) =>
                          updatePanel(activePanel.id, (panel) => ({
                            ...panel,
                            points: linesToPoints(event.target.value),
                          }))
                        }
                        rows={6}
                        className="admin-input min-h-[180px]"
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSavePane}
                      disabled={savePending}
                      className="admin-primary-button"
                    >
                      {savePending ? "Saving" : "Save pane settings"}
                    </button>
                  </div>
                </section>

                <section className="rounded-sm border border-white/10 bg-black/12 p-6">
                  <div className="border-b border-white/10 pb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      Live preview
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">
                      Homepage panel preview
                    </h3>
                  </div>

                  <article className="mt-6 rounded-sm border border-[var(--accent)]/30 bg-white/5 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      {activePanel.eyebrow}
                    </p>
                    <h4 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                      {activePanel.title}
                    </h4>
                    <p className="mt-5 text-sm leading-7 text-slate-300">
                      {activePanel.description}
                    </p>

                    <ul className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm leading-7 text-slate-300">
                      {activePanel.points.map((point) => (
                        <li key={point} className="flex gap-3">
                          <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </section>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <header className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  {activeSection}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  {placeholderContent[activeSection].title}
                </h2>
                <p className="max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
                  {placeholderContent[activeSection].description}
                </p>
              </header>

              <section className="grid gap-4 md:grid-cols-3">
                {placeholderContent[activeSection].bullets.map((item) => (
                  <article
                    key={item}
                    className="rounded-sm border border-white/10 bg-black/12 p-5"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
                      {item}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      Placeholder content only for now. This panel will be
                      connected to real admin tools in a later step.
                    </p>
                  </article>
                ))}
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
