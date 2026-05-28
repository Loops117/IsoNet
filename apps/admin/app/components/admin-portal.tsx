"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  defaultHomepagePanels,
  type HomepagePanel,
} from "../../lib/homepage-panels";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import {
  formatAdminVendorStatus,
  type AdminVendorSummary,
} from "../../lib/vendor-management";
import { VendorManagementSection } from "./vendor-management-section";

type TopLevelSection =
  | "dashboard"
  | "vendors"
  | "customers"
  | "sales"
  | "settings";

type SettingsSection = "home-page-settings";
type SidebarMode = "main" | "settings";

const paneMenu = [
  { id: "why-isonet", label: "Why IsoNet" },
  { id: "directory", label: "Directory" },
  { id: "reviews", label: "Reviews" },
  { id: "standards", label: "Standards" },
];

const dashboardActivity = [
  {
    title: "Homepage timeline and trust sections updated",
    detail: "Public content and progress tracking were refreshed for launch preparation.",
    timestamp: "Today",
  },
  {
    title: "Admin portal authentication enabled",
    detail: "Administrators sign in with Supabase Auth accounts linked in admin_users.",
    timestamp: "Today",
  },
  {
    title: "Supabase homepage panel schema prepared",
    detail: "Migration is ready for live settings storage once applied to the project.",
    timestamp: "Ready",
  },
];

const placeholderContent: Record<
  Exclude<TopLevelSection, "settings">,
  { title: string; description: string; bullets: string[] }
> = {
  dashboard: {
    title: "Admin dashboard",
    description:
      "The dashboard is the operational home for analytics, new vendor visibility, platform activity, and status summaries.",
    bullets: [
      "Platform analytics and health",
      "Recent activity and moderation events",
      "New vendor and onboarding visibility",
    ],
  },
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

type AdminPortalProps = {
  isAuthenticated: boolean;
  adminEmail: string | null;
  adminAuthConfigured: boolean;
};

export function AdminPortal({
  isAuthenticated,
  adminEmail,
  adminAuthConfigured,
}: AdminPortalProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [panels, setPanels] = useState<HomepagePanel[]>(defaultHomepagePanels);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("main");
  const [activeSection, setActiveSection] = useState<TopLevelSection>("dashboard");
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSection | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [selectedPaneId, setSelectedPaneId] = useState("why-isonet");
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [vendorSummaries, setVendorSummaries] = useState<AdminVendorSummary[]>([]);
  const [vendorStats, setVendorStats] = useState({
    total: 0,
    pendingApproval: 0,
    approved: 0,
    inGoodStanding: 0,
    openDisputes: 0,
  });
  const [vendorListLoading, setVendorListLoading] = useState(false);
  const [vendorListError, setVendorListError] = useState<string | null>(null);
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
    void loadPanels();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAuthPending(true);
    setAuthError(null);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setAuthError(body?.error ?? "Unable to sign in.");
      setAuthPending(false);
      return;
    }

    router.refresh();
    setAuthPending(false);
  }

  async function handleSignOut() {
    setAuthPending(true);
    setIsAccountMenuOpen(false);
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
    setAuthPending(false);
  }

  async function handleSavePane() {
    if (!supabase) {
      setSettingsError(
        "Supabase browser configuration is missing. Add the public URL and anon key first.",
      );
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
    };

    const { error } = await supabase
      .from("site_homepage_panels")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      setSettingsError(
        "Unable to save to Supabase yet. Apply the migration and provision the admin database access step before using live settings saves.",
      );
      setSavePending(false);
      return;
    }

    setSettingsMessage("Homepage pane settings saved.");
    setSavePending(false);
  }

  const loadVendorSummaries = useCallback(async () => {
    setVendorListLoading(true);
    setVendorListError(null);

    const response = await fetch("/api/admin/vendors");
    const body = (await response.json().catch(() => null)) as
      | {
          error?: string;
          vendors?: AdminVendorSummary[];
          stats?: typeof vendorStats;
        }
      | null;

    if (!response.ok) {
      setVendorListError(body?.error ?? "Unable to load vendor approvals.");
      setVendorListLoading(false);
      return;
    }

    const vendors = body?.vendors ?? [];
    setVendorSummaries(vendors);
    setVendorStats(
      body?.stats ?? {
        total: vendors.length,
        pendingApproval: vendors.filter((vendor) =>
          ["not_approved", "pending_review"].includes(vendor.account_status),
        ).length,
        approved: vendors.filter((vendor) => vendor.account_status === "approved").length,
        inGoodStanding: vendors.filter(
          (vendor) => vendor.account_status === "in_good_standing",
        ).length,
        openDisputes: vendors.reduce((sum, vendor) => sum + vendor.dispute_count, 0),
      },
    );
    setVendorListLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void loadVendorSummaries();
  }, [isAuthenticated, loadVendorSummaries]);

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

  function navigateToSection(section: TopLevelSection) {
    setActiveSection(section);
    setSidebarMode("main");
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
  }

  function openSettingsMenu() {
    setSidebarMode("settings");
    setIsAccountMenuOpen(false);
  }

  function closeSettingsMenu() {
    setSidebarMode("main");
    setIsAccountMenuOpen(false);
  }

  function selectSettingsSection(section: SettingsSection) {
    setActiveSection("settings");
    setActiveSettingsSection(section);
    setSidebarMode("settings");
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
  }

  const currentPanelLabel =
    paneMenu.find((pane) => pane.id === selectedPaneId)?.label ?? "Home Page Settings";
  const pendingApprovalVendors = vendorSummaries.filter((vendor) =>
    ["not_approved", "pending_review"].includes(vendor.account_status),
  );
  const currentDashboardMetrics = [
    {
      label: "Pending vendor approvals",
      value: String(vendorStats.pendingApproval),
      note: "Accounts waiting for admin review",
    },
    {
      label: "Approved vendors",
      value: String(vendorStats.approved),
      note: "Accounts approved but not yet promoted",
    },
    {
      label: "In good standing",
      value: String(vendorStats.inGoodStanding),
      note: "Vendors with live post-approval activity",
    },
    {
      label: "Open vendor disputes",
      value: String(vendorStats.openDisputes),
      note: "Review disputes that still need admin attention",
    },
  ];

  const currentViewLabel =
    activeSection === "dashboard"
      ? "Dashboard"
      : activeSection === "vendors"
        ? "Vendor Management"
      : activeSection === "settings"
        ? `Settings / ${currentPanelLabel}`
        : placeholderContent[activeSection].title;

  if (!isAuthenticated) {
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

              {!adminAuthConfigured ? (
                <div className="mt-6 rounded-sm border border-amber-300/30 bg-amber-200/10 px-4 py-4 text-sm leading-7 text-amber-100">
                  This app is missing `NEXT_PUBLIC_SUPABASE_URL` and
                  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so admin sign-in cannot start yet.
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
                  disabled={authPending || !adminAuthConfigured}
                  className="w-full rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authPending ? "Signing In" : "Sign In"}
                </button>
              </form>

              <p className="mt-5 text-xs leading-6 text-slate-400">
                Use the email and password for your administrator account. Access
                is granted only to users listed in the Supabase admin_users table.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center px-4 py-4 sm:px-5 sm:py-5 lg:h-screen lg:overflow-hidden">
      <section className="admin-shell grid w-full max-w-7xl gap-0 overflow-hidden lg:h-[calc(100vh-2rem)] lg:min-h-0 lg:grid-cols-[250px_1fr]">
        {isMobileMenuOpen ? (
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-30 bg-slate-950/65 backdrop-blur-[2px] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 flex w-[18rem] max-w-[86vw] flex-col border-r border-white/10 bg-[rgba(7,17,33,0.98)] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.4)] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:max-w-none lg:border-r lg:bg-transparent lg:p-4 lg:shadow-none",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "overflow-hidden lg:min-h-0 lg:border-b-0",
          ].join(" ")}
        >
          <div className="border-b border-white/10 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  IsoNet Admin
                </p>
                <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">
                  Control Portal
                </h1>
                <div className="relative mt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Signed in as
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((current) => !current)}
                    className="admin-account-button mt-2"
                  >
                    <span className="min-w-0 truncate text-[11px] leading-5 text-slate-200">
                      {adminEmail ?? "Administrator"}
                    </span>
                    <span className="admin-account-caret">
                      {isAccountMenuOpen ? "^" : "v"}
                    </span>
                  </button>

                  {isAccountMenuOpen ? (
                    <div className="admin-account-menu">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={authPending}
                        className="admin-account-menu-item"
                      >
                        {authPending ? "Signing out" : "Sign out"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                aria-label="Close menu"
                className="admin-icon-button lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="admin-close-icon" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
            <section
              className={[
                "min-h-0 overflow-hidden rounded-sm border border-white/10 bg-black/12 transition-all duration-200",
                sidebarMode === "main"
                  ? "flex-[9] opacity-100"
                  : "pointer-events-none flex-[0.0001] border-transparent bg-transparent opacity-0",
              ].join(" ")}
              aria-hidden={sidebarMode !== "main"}
            >
              <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 isonet-scrollbar">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Overview
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => navigateToSection("dashboard")}
                      className={[
                        "admin-nav-button w-full text-left",
                        activeSection === "dashboard" ? "admin-nav-button-active" : "",
                      ].join(" ")}
                    >
                      Dashboard
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Management
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {(["vendors", "customers", "sales"] as const).map((section) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => navigateToSection(section)}
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

              </div>
            </section>

            <section
              className={[
                "min-h-0 overflow-hidden rounded-sm border border-white/10 bg-black/12 transition-all duration-200",
                sidebarMode === "main" ? "flex-[1]" : "flex-1",
              ].join(" ")}
            >
              {sidebarMode === "main" ? (
                <div className="flex h-full items-center p-3">
                  <button
                    type="button"
                    onClick={openSettingsMenu}
                    className={[
                      "admin-nav-button w-full text-left",
                      activeSection === "settings" ? "admin-nav-button-active" : "",
                    ].join(" ")}
                  >
                    Settings
                  </button>
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Settings
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Choose a settings area to open.
                    </p>
                  </div>

                  <div className="mt-4 space-y-1.5 overflow-y-auto isonet-scrollbar">
                    <button
                      type="button"
                      onClick={() => selectSettingsSection("home-page-settings")}
                      className={[
                        "admin-subnav-button w-full text-left",
                        activeSection === "settings" &&
                        activeSettingsSection === "home-page-settings"
                          ? "admin-subnav-button-active"
                          : "",
                      ].join(" ")}
                    >
                      Home Page Settings
                    </button>
                  </div>

                  <div className="mt-auto border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={closeSettingsMenu}
                      className="admin-ghost-button w-full"
                    >
                      Back to main menu
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </aside>

        <div className="p-4 sm:p-5 lg:min-h-0 lg:overflow-y-auto">
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <button
              type="button"
              className="admin-icon-button"
              aria-label="Open navigation menu"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="admin-menu-icon" />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Admin View
              </p>
              <p className="truncate text-sm font-semibold text-white">
                {currentViewLabel}
              </p>
            </div>
          </div>

          {activeSection === "dashboard" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Dashboard
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Administrative overview
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  This dashboard is the operating home for platform activity,
                  vendor pipeline visibility, and quick analytics while the
                  broader management tools are being built out.
                </p>
              </header>

              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {currentDashboardMetrics.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-sm border border-white/10 bg-black/12 p-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {metric.label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                      {metric.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {metric.note}
                    </p>
                  </article>
                ))}
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <article className="rounded-sm border border-white/10 bg-black/12 p-4">
                  <div className="border-b border-white/10 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      Recent activity
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Latest platform updates
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {dashboardActivity.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-sm border border-white/10 bg-white/4 p-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">
                            {item.title}
                          </p>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-sm border border-white/10 bg-black/12 p-4">
                  <div className="border-b border-white/10 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      New vendors
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Pipeline snapshot
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {vendorListError ? (
                      <div className="rounded-sm border border-rose-300/30 bg-rose-200/10 p-3 text-sm leading-6 text-rose-100">
                        {vendorListError}
                      </div>
                    ) : vendorListLoading ? (
                      <div className="rounded-sm border border-white/10 bg-white/4 p-3 text-sm leading-6 text-slate-300">
                        Loading vendor approval queue...
                      </div>
                    ) : pendingApprovalVendors.length > 0 ? (
                      pendingApprovalVendors.slice(0, 4).map((vendor) => (
                        <button
                          key={vendor.user_id}
                          type="button"
                          onClick={() => setActiveSection("vendors")}
                          className="w-full rounded-sm border border-white/10 bg-white/4 p-3 text-left transition-colors hover:bg-white/6"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">
                              {vendor.company_name}
                            </p>
                            <span className="rounded-sm border border-white/10 bg-white/6 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                              {formatAdminVendorStatus(vendor.account_status)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {vendor.owner_name} Â· {vendor.email}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-sm border border-white/10 bg-white/4 p-3 text-sm leading-6 text-slate-300">
                        No vendors are currently waiting for approval.
                      </div>
                    )}
                  </div>
                </article>
              </section>
            </div>
          ) : activeSection === "vendors" ? (
            <VendorManagementSection />
          ) : activeSection === "settings" &&
            activeSettingsSection === "home-page-settings" ? (
              <div className="space-y-4">
                <header className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                    Settings
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Home page settings
                  </h2>
                  <p className="max-w-3xl text-sm leading-7 text-slate-300">
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

                <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <section className="rounded-sm border border-white/10 bg-black/12 p-4">
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                        Editing
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-white">
                        {paneMenu.find((pane) => pane.id === selectedPaneId)?.label}
                      </h3>
                    </div>

                    <div className="mt-4 space-y-4">
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

                    <div className="mt-4 flex flex-wrap gap-3">
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

                  <section className="rounded-sm border border-white/10 bg-black/12 p-4">
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                        Live preview
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-white">
                        Homepage panel preview
                      </h3>
                    </div>

                    <article className="mt-4 rounded-sm border border-[var(--accent)]/30 bg-white/5 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                        {activePanel.eyebrow}
                      </p>
                      <h4 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                        {activePanel.title}
                      </h4>
                      <p className="mt-4 text-sm leading-6 text-slate-300">
                        {activePanel.description}
                      </p>

                      <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
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
          ) : activeSection !== "settings" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  {activeSection}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {placeholderContent[activeSection].title}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  {placeholderContent[activeSection].description}
                </p>
              </header>

              <section className="grid gap-3 md:grid-cols-3">
                {placeholderContent[activeSection].bullets.map((item) => (
                  <article
                    key={item}
                    className="rounded-sm border border-white/10 bg-black/12 p-4"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-100">
                      {item}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Placeholder content only for now. This panel will be
                      connected to real admin tools in a later step.
                    </p>
                  </article>
                ))}
              </section>
            </div>
          ) : null
          }
        </div>
      </section>
    </main>
  );
}
