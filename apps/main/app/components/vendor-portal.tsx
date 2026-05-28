"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "../../lib/supabase";
import {
  ensureVendorProfileProvisioned,
  formatVendorDate,
  formatVendorStatus,
  type VendorProfile,
  type VendorReview,
  type VendorReviewDispute,
  type VendorSocialLink,
  type VendorSubscription,
} from "../../lib/vendor";
import { VendorAccessPanel } from "./vendor-access-panel";
import { VendorForumActivity } from "./vendor-forum-activity";
import { VendorForumActivitySummary } from "./vendor-forum-activity-summary";
import { VendorProfileEditor } from "./vendor-profile-editor";
import {
  getProfileCompletionPercent,
  VendorProfileCompletionCard,
} from "./vendor-profile-completion-card";

const VENDOR_SUBSCRIPTION_TIER_LABEL = "Basic";
const VENDOR_SUBSCRIPTION_TIER_NOTE = "Free Plan (Additional plans coming soon)";

type VendorSection =
  | "dashboard"
  | "badge"
  | "forum"
  | "profile"
  | "reviews"
  | "analytics"
  | "subscription";

const sectionLabels: Record<VendorSection, string> = {
  dashboard: "Dashboard",
  badge: "My Badge",
  forum: "Forum Activity",
  profile: "Business Profile",
  reviews: "Reviews",
  analytics: "Analytics",
  subscription: "Subscription",
};

function formatRating(value: number | null | undefined) {
  if (!value) {
    return "0.00";
  }

  return value.toFixed(2);
}

function formatStructuredAddress(profile: VendorProfile | null) {
  if (!profile) {
    return "Not set";
  }

  return (
    [
      profile.street_address,
      profile.address_line_2,
      profile.city,
      profile.state_province,
      profile.postal_code,
      profile.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    profile.address ||
    "Not set"
  );
}

function normalizeProfile(data: Record<string, unknown> | null) {
  if (!data) {
    return null;
  }

  return {
    user_id: String(data.user_id ?? ""),
    owner_name: String(data.owner_name ?? ""),
    first_name: data.first_name ? String(data.first_name) : null,
    last_name: data.last_name ? String(data.last_name) : null,
    company_name: String(data.company_name ?? ""),
    website_url: data.website_url ? String(data.website_url) : null,
    address: data.address ? String(data.address) : null,
    street_address: data.street_address ? String(data.street_address) : null,
    address_line_2: data.address_line_2 ? String(data.address_line_2) : null,
    city: data.city ? String(data.city) : null,
    state_province: data.state_province ? String(data.state_province) : null,
    postal_code: data.postal_code ? String(data.postal_code) : null,
    country: data.country ? String(data.country) : null,
    phone_number: data.phone_number ? String(data.phone_number) : null,
    email: String(data.email ?? ""),
    account_status: String(data.account_status ?? "not_approved"),
    badge_url: data.badge_url ? String(data.badge_url) : null,
    company_logo_url: data.company_logo_url ? String(data.company_logo_url) : null,
    average_rating: Number(data.average_rating ?? 0),
    review_count: Number(data.review_count ?? 0),
    start_date: String(data.start_date ?? ""),
    badge_start_date: data.badge_start_date ? String(data.badge_start_date) : null,
    sales_locations: Array.isArray(data.sales_locations)
      ? data.sales_locations.map((value) => String(value))
      : [],
    sales_items: Array.isArray(data.sales_items)
      ? data.sales_items.map((value) => String(value))
      : [],
    about_us_html: data.about_us_html ? String(data.about_us_html) : null,
    created_at: String(data.created_at ?? ""),
    updated_at: String(data.updated_at ?? ""),
  } as VendorProfile;
}

function normalizeSubscription(data: Record<string, unknown> | null) {
  if (!data) {
    return null;
  }

  return {
    vendor_user_id: String(data.vendor_user_id ?? ""),
    tier_name: String(data.tier_name ?? "Application"),
    status: String(data.status ?? "inactive"),
    started_at: String(data.started_at ?? ""),
    renews_at: data.renews_at ? String(data.renews_at) : null,
    canceled_at: data.canceled_at ? String(data.canceled_at) : null,
    provider_customer_id: data.provider_customer_id
      ? String(data.provider_customer_id)
      : null,
    provider_subscription_id: data.provider_subscription_id
      ? String(data.provider_subscription_id)
      : null,
  } as VendorSubscription;
}

function normalizeSocialLinks(data: Record<string, unknown>[] | null) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    id: String(item.id ?? ""),
    vendor_user_id: String(item.vendor_user_id ?? ""),
    platform: String(item.platform ?? ""),
    url: String(item.url ?? ""),
    sort_order: Number(item.sort_order ?? 0),
  })) as VendorSocialLink[];
}

function normalizeReviews(data: Record<string, unknown>[] | null) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    id: String(item.id ?? ""),
    vendor_user_id: String(item.vendor_user_id ?? ""),
    reviewer_name: String(item.reviewer_name ?? "Community Member"),
    rating: Number(item.rating ?? 0),
    title: item.title ? String(item.title) : null,
    body: item.body ? String(item.body) : null,
    review_status: String(item.review_status ?? "published"),
    published_at: String(item.published_at ?? ""),
  })) as VendorReview[];
}

function normalizeDisputes(data: Record<string, unknown>[] | null) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    id: String(item.id ?? ""),
    review_id: String(item.review_id ?? ""),
    vendor_user_id: String(item.vendor_user_id ?? ""),
    submitted_by_user_id: String(item.submitted_by_user_id ?? ""),
    subject: String(item.subject ?? ""),
    detail: String(item.detail ?? ""),
    dispute_status: String(item.dispute_status ?? "open"),
    admin_resolution_note: item.admin_resolution_note
      ? String(item.admin_resolution_note)
      : null,
    resolved_by_email: item.resolved_by_email ? String(item.resolved_by_email) : null,
    resolved_at: item.resolved_at ? String(item.resolved_at) : null,
    created_at: String(item.created_at ?? ""),
  })) as VendorReviewDispute[];
}

function getDataErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;

    if (typeof message === "string" && message.trim()) {
      if (
        message.includes("relation") &&
        message.includes("does not exist")
      ) {
        return "The vendor portal tables are not available yet. Apply the latest Supabase migration before testing vendor onboarding.";
      }

      return message;
    }
  }

  return fallback;
}

export function VendorPortal() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [activeSection, setActiveSection] = useState<VendorSection>("dashboard");
  const [forumUnreadCount, setForumUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [socialLinks, setSocialLinks] = useState<VendorSocialLink[]>([]);
  const [subscription, setSubscription] = useState<VendorSubscription | null>(null);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [disputes, setDisputes] = useState<VendorReviewDispute[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [logoUploadPending, setLogoUploadPending] = useState(false);
  const [disputePendingReviewId, setDisputePendingReviewId] = useState<string | null>(null);
  const [disputeDrafts, setDisputeDrafts] = useState<
    Record<string, { subject: string; detail: string }>
  >({});
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState("");
  const [passwordResetPending, setPasswordResetPending] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
  const loadedForUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const client = supabase;

    const urlSearchParams = new URLSearchParams(window.location.search);
    const initialRecovery =
      urlSearchParams.get("type") === "recovery" ||
      urlSearchParams.get("action") === "recovery";

    if (initialRecovery) {
      setIsPasswordRecovery(true);
    }

    void client.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user ?? null);
      setSessionLoading(false);
    });

    const {
      data: { subscription: authSubscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setPasswordResetError(null);
        setPasswordResetMessage(null);
      }

      if (event === "SIGNED_OUT") {
        loadedForUserIdRef.current = null;
        setCurrentUser(null);
        setProfile(null);
        setSocialLinks([]);
        setSubscription(null);
        setReviews([]);
        setDisputes([]);
        setSessionLoading(false);
        return;
      }

      if (session?.user) {
        setCurrentUser(session.user);
      }

      setSessionLoading(false);
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, [supabase]);

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    const nextPassword = passwordDraft.trim();
    if (!nextPassword) {
      setPasswordResetError("Enter a new password.");
      setPasswordResetMessage(null);
      return;
    }

    if (nextPassword.length < 8) {
      setPasswordResetError("Password must be at least 8 characters.");
      setPasswordResetMessage(null);
      return;
    }

    if (nextPassword !== confirmPasswordDraft.trim()) {
      setPasswordResetError("Passwords do not match.");
      setPasswordResetMessage(null);
      return;
    }

    setPasswordResetPending(true);
    setPasswordResetError(null);
    setPasswordResetMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) {
        throw error;
      }

      setPasswordDraft("");
      setConfirmPasswordDraft("");
      setIsPasswordRecovery(false);
      setPasswordResetMessage("Password updated. You can now use the vendor portal.");
      router.replace("/vendor");
      router.refresh();
    } catch (error) {
      setPasswordResetError(
        getDataErrorMessage(error, "Unable to reset your password right now."),
      );
    } finally {
      setPasswordResetPending(false);
    }
  }

  useEffect(() => {
    if (!supabase || !currentUser) {
      loadedForUserIdRef.current = null;
      return;
    }

    if (loadedForUserIdRef.current === currentUser.id) {
      return;
    }

    const client = supabase;
    const user = currentUser;
    const shouldShowLoading = profile?.user_id !== currentUser.id;

    let isMounted = true;

    async function loadVendorData() {
      if (shouldShowLoading) {
        setDataLoading(true);
      }
      setDataError(null);

      try {
        const profileQuery = await client
          .from("vendor_profiles")
          .select(
            "user_id, owner_name, first_name, last_name, company_name, website_url, address, street_address, address_line_2, city, state_province, postal_code, country, phone_number, email, account_status, badge_url, company_logo_url, average_rating, review_count, start_date, badge_start_date, sales_locations, sales_items, about_us_html, created_at, updated_at",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileQuery.error) {
          throw profileQuery.error;
        }

        let normalizedProfile = normalizeProfile(
          profileQuery.data as Record<string, unknown> | null,
        );

        if (!normalizedProfile) {
          await ensureVendorProfileProvisioned(client, user);

          const retryProfileQuery = await client
            .from("vendor_profiles")
            .select(
              "user_id, owner_name, first_name, last_name, company_name, website_url, address, street_address, address_line_2, city, state_province, postal_code, country, phone_number, email, account_status, badge_url, company_logo_url, average_rating, review_count, start_date, badge_start_date, sales_locations, sales_items, about_us_html, created_at, updated_at",
            )
            .eq("user_id", user.id)
            .maybeSingle();

          if (retryProfileQuery.error) {
            throw retryProfileQuery.error;
          }

          normalizedProfile = normalizeProfile(
            retryProfileQuery.data as Record<string, unknown> | null,
          );
        }

        const [socialQuery, subscriptionQuery, reviewQuery, disputeQuery] = await Promise.all([
          client
            .from("vendor_social_links")
            .select("id, vendor_user_id, platform, url, sort_order")
            .eq("vendor_user_id", user.id)
            .order("sort_order", { ascending: true }),
          client
            .from("vendor_subscriptions")
            .select(
              "vendor_user_id, tier_name, status, started_at, renews_at, canceled_at, provider_customer_id, provider_subscription_id",
            )
            .eq("vendor_user_id", user.id)
            .maybeSingle(),
          client
            .from("vendor_reviews")
            .select(
              "id, vendor_user_id, reviewer_name, rating, title, body, review_status, published_at",
            )
            .eq("vendor_user_id", user.id)
            .order("published_at", { ascending: false })
            .limit(8),
          client
            .from("vendor_review_disputes")
            .select(
              "id, review_id, vendor_user_id, submitted_by_user_id, subject, detail, dispute_status, admin_resolution_note, resolved_by_email, resolved_at, created_at",
            )
            .eq("vendor_user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (socialQuery.error) {
          throw socialQuery.error;
        }

        if (subscriptionQuery.error) {
          throw subscriptionQuery.error;
        }

        if (reviewQuery.error) {
          throw reviewQuery.error;
        }

        if (disputeQuery.error) {
          throw disputeQuery.error;
        }

        if (!isMounted) {
          return;
        }

        setProfile(normalizedProfile);
        setSocialLinks(
          normalizeSocialLinks(socialQuery.data as Record<string, unknown>[] | null),
        );
        setSubscription(
          normalizeSubscription(
            subscriptionQuery.data as Record<string, unknown> | null,
          ),
        );
        setReviews(normalizeReviews(reviewQuery.data as Record<string, unknown>[] | null));
        setDisputes(
          normalizeDisputes(disputeQuery.data as Record<string, unknown>[] | null),
        );
        loadedForUserIdRef.current = user.id;
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDataError(
          getDataErrorMessage(
            error,
            "Unable to load vendor dashboard data right now.",
          ),
        );
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    }

    void loadVendorData();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, supabase]);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setAuthPending(true);
    setIsAccountMenuOpen(false);

    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setAuthPending(false);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !supabase || !currentUser) {
      return;
    }

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() ?? "png"
      : "png";
    const path = `${currentUser.id}/company-logo.${extension}`;

    setLogoUploadPending(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const { error: uploadError } = await supabase.storage
        .from("vendor-assets")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "image/png",
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("vendor-assets").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("vendor_profiles")
        .update({ company_logo_url: publicUrl })
        .eq("user_id", currentUser.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              company_logo_url: publicUrl,
            }
          : current,
      );
      setProfileMessage("Company logo uploaded.");
    } catch (error) {
      setProfileError(
        getDataErrorMessage(error, "Unable to upload the company logo right now."),
      );
    } finally {
      event.target.value = "";
      setLogoUploadPending(false);
    }
  }

  async function handleSubmitDispute(reviewId: string) {
    if (!supabase || !currentUser || !profile) {
      return;
    }

    const draft = disputeDrafts[reviewId];
    const subject = draft?.subject?.trim() ?? "";
    const detail = draft?.detail?.trim() ?? "";

    if (!subject || !detail) {
      setProfileError("Add both a dispute subject and dispute details before submitting.");
      setProfileMessage(null);
      return;
    }

    setDisputePendingReviewId(reviewId);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const { data, error } = await supabase
        .from("vendor_review_disputes")
        .insert({
          review_id: reviewId,
          vendor_user_id: profile.user_id,
          submitted_by_user_id: currentUser.id,
          subject,
          detail,
        })
        .select(
          "id, review_id, vendor_user_id, submitted_by_user_id, subject, detail, dispute_status, admin_resolution_note, resolved_by_email, resolved_at, created_at",
        )
        .single();

      if (error) {
        throw error;
      }

      setDisputes((current) => [
        normalizeDisputes([data as Record<string, unknown>])[0],
        ...current,
      ]);
      setDisputeDrafts((current) => ({
        ...current,
        [reviewId]: { subject: "", detail: "" },
      }));
      setProfileMessage("Dispute submitted for admin review.");
    } catch (error) {
      setProfileError(
        getDataErrorMessage(error, "Unable to submit that dispute right now."),
      );
    } finally {
      setDisputePendingReviewId(null);
    }
  }

  function navigateToSection(section: VendorSection) {
    setActiveSection(section);
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
  }

  const completionPercent = getProfileCompletionPercent(profile, socialLinks.length);
  const hasBadgeStartDate = Boolean(profile?.badge_start_date);
  const badgeStartDateLabel =
    profile?.account_status === "approved" || profile?.account_status === "in_good_standing"
      ? hasBadgeStartDate
        ? formatVendorDate(profile.badge_start_date)
        : "Not assigned yet"
      : "Not assigned yet";
  const isAwaitingApproval =
    profile?.account_status === "not_approved" ||
    profile?.account_status === "pending_review";
  const isApproved = profile?.account_status === "approved";

  const dashboardMetrics = [
    {
      label: "Account status",
      value: formatVendorStatus(profile?.account_status),
      note: isAwaitingApproval
        ? "Portal access is active while admin approval is pending"
        : "Current review and approval standing",
    },
    {
      label: "Average rating",
      value: formatRating(profile?.average_rating),
      note: `${profile?.review_count ?? 0} published reviews`,
    },
    {
      label: "Subscription tier",
      value: VENDOR_SUBSCRIPTION_TIER_LABEL,
      note: VENDOR_SUBSCRIPTION_TIER_NOTE,
    },
    {
      label: "Profile completion",
      value: `${completionPercent}%`,
      note: "Required onboarding fields only (max 100%)",
    },
  ];

  if (!hasSupabaseBrowserEnv() || !supabase) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-6">
        <section className="isonet-panel w-full max-w-4xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            Vendor Portal
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Supabase configuration is still required.
          </h1>
          <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
            Add the public Supabase URL and anon key before using the vendor
            onboarding and dashboard flow.
          </p>
        </section>
      </main>
    );
  }

  if (sessionLoading) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-6">
        <section className="isonet-panel w-full max-w-3xl p-6 sm:p-8">
          <p className="text-sm leading-7 text-slate-300">Loading vendor session...</p>
        </section>
      </main>
    );
  }

  if (isPasswordRecovery) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-6">
        <section className="isonet-panel w-full max-w-3xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            Vendor Portal
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Set a new password
          </h1>
          <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
            Enter a new password for your vendor account to complete recovery.
          </p>

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handlePasswordReset}>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                New password
              </span>
              <input
                type="password"
                value={passwordDraft}
                onChange={(event) => setPasswordDraft(event.target.value)}
                className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                Confirm password
              </span>
              <input
                type="password"
                value={confirmPasswordDraft}
                onChange={(event) => setConfirmPasswordDraft(event.target.value)}
                className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                placeholder="Retype new password"
                autoComplete="new-password"
              />
            </label>

            {passwordResetError ? (
              <div className="rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-4 text-sm leading-7 text-rose-100 md:col-span-2">
                {passwordResetError}
              </div>
            ) : null}

            {passwordResetMessage ? (
              <div className="rounded-sm border border-emerald-300/30 bg-emerald-200/10 px-4 py-4 text-sm leading-7 text-emerald-100 md:col-span-2">
                {passwordResetMessage}
              </div>
            ) : null}

            <div className="md:col-span-2">
              <button type="submit" className="isonet-button" disabled={passwordResetPending}>
                {passwordResetPending ? "Updating password" : "Save new password"}
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
        <section className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="isonet-panel p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              Vendor Portal
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Dedicated vendor access starts here.
            </h1>
            <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
              Sign in to view your vendor dashboard, application status, review
              activity, and upcoming subscription details. New vendors can also
              create their account here or from the homepage.
            </p>
            <div className="mt-8 space-y-3 text-sm leading-7 text-slate-300">
              <div className="rounded-sm border border-white/10 bg-white/4 p-4">
                Dashboard cards for account standing, ratings, and profile
                readiness.
              </div>
              <div className="rounded-sm border border-white/10 bg-white/4 p-4">
                A dedicated menu for profile details, reviews, analytics, and
                subscription status.
              </div>
              <div className="rounded-sm border border-white/10 bg-white/4 p-4">
                Built to match the official admin style while remaining separate
                from the administrative portal.
              </div>
            </div>
          </article>

          <VendorAccessPanel
            initialMode="login"
            title="Vendor Sign-In"
            description="Use the same vendor account created on the public homepage to access your dashboard."
          />
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center px-4 py-4 sm:px-5 sm:py-5 lg:h-screen lg:overflow-hidden">
      <section className="portal-shell grid w-full max-w-7xl gap-0 overflow-hidden lg:h-[calc(100vh-2rem)] lg:min-h-0 lg:grid-cols-[250px_1fr]">
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
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Vendor Portal
                </p>
                <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">
                  {profile?.company_name ?? "Vendor Dashboard"}
                </h1>
                <div className="relative mt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Signed in as
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((current) => !current)}
                    className="portal-account-button mt-2"
                  >
                    <span className="min-w-0 truncate text-[11px] leading-5 text-slate-200">
                      {currentUser.email ?? "Vendor Account"}
                    </span>
                    <span className="portal-account-caret">
                      {isAccountMenuOpen ? "^" : "v"}
                    </span>
                  </button>

                  {isAccountMenuOpen ? (
                    <div className="portal-account-menu">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={authPending}
                        className="portal-account-menu-item"
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
                className="portal-icon-button lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="portal-close-icon" />
              </button>
            </div>
          </div>

          <nav className="mt-4 min-h-0 flex-1 overflow-y-auto isonet-scrollbar">
            <div className="rounded-sm border border-white/10 bg-black/12 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Overview
              </p>
              <div className="mt-2 space-y-1.5">
                {(Object.keys(sectionLabels) as VendorSection[]).map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => navigateToSection(section)}
                    className={[
                      "portal-nav-button w-full text-left",
                      activeSection === section ? "portal-nav-button-active" : "",
                    ].join(" ")}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{sectionLabels[section]}</span>
                      {section === "forum" && forumUnreadCount > 0 ? (
                        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-slate-950">
                          {forumUnreadCount > 9 ? "9+" : forumUnreadCount}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        <div className="p-4 sm:p-5 lg:min-h-0 lg:overflow-y-auto">
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <button
              type="button"
              className="portal-icon-button"
              aria-label="Open navigation menu"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="portal-menu-icon" />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Vendor View
              </p>
              <p className="truncate text-sm font-semibold text-white">
                {sectionLabels[activeSection]}
              </p>
            </div>
          </div>

          {dataError ? (
            <div className="mb-4 rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-4 text-sm leading-7 text-rose-100">
              {dataError}
            </div>
          ) : null}

          {profileError ? (
            <div className="mb-4 rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-4 text-sm leading-7 text-rose-100">
              {profileError}
            </div>
          ) : null}

          {profileMessage ? (
            <div className="mb-4 rounded-sm border border-emerald-300/30 bg-emerald-200/10 px-4 py-4 text-sm leading-7 text-emerald-100">
              {profileMessage}
            </div>
          ) : null}

          {dataLoading && currentUser && !profile ? (
            <div className="rounded-sm border border-white/10 bg-black/12 p-4 text-sm leading-7 text-slate-300">
              Loading vendor dashboard data...
            </div>
          ) : null}

          {profile && activeSection === "dashboard" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Dashboard
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Vendor account overview
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  This dashboard is your operational home for account standing,
                  review visibility, profile readiness, and the upcoming
                  subscription layer for vendor membership.
                </p>
              </header>

              {isAwaitingApproval ? (
                <div className="rounded-sm border border-amber-300/30 bg-amber-200/10 px-4 py-4 text-sm leading-7 text-amber-100">
                  Your vendor portal is active, but your public vendor status is
                  currently <span className="font-semibold">Not Approved</span>.
                  You can continue preparing your account, upload a company logo,
                  and wait for an admin to review your application. Your profile
                  will not appear on public vendor lists until approval.
                </div>
              ) : null}

              {isApproved ? (
                <div className="rounded-sm border border-sky-300/30 bg-sky-200/10 px-4 py-4 text-sm leading-7 text-sky-100">
                  Your account has been approved. After your first public review
                  activity, your standing can advance to
                  <span className="font-semibold"> In Good Standing</span>.
                </div>
              ) : null}

              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {dashboardMetrics.map((metric) => (
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

              <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                {completionPercent < 100 ? (
                  <VendorProfileCompletionCard
                    profile={profile}
                    socialLinkCount={socialLinks.length}
                    compact
                  />
                ) : null}

                <article className="rounded-sm border border-white/10 bg-black/12 p-4">
                  <div className="border-b border-white/10 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      Forum activity
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {forumUnreadCount > 0
                        ? `${forumUnreadCount} unread notification${forumUnreadCount === 1 ? "" : "s"}`
                        : "You're caught up"}
                    </h3>
                  </div>
                  <div className="mt-4">
                    <VendorForumActivitySummary
                      userId={currentUser.id}
                      onUnreadCountChange={setForumUnreadCount}
                      onViewAll={() => navigateToSection("forum")}
                    />
                  </div>
                </article>
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <article className="rounded-sm border border-white/10 bg-black/12 p-4">
                  <div className="border-b border-white/10 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      Account snapshot
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Current vendor standing
                    </h3>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        label: "Company",
                        value: profile?.company_name ?? "Pending profile",
                      },
                      {
                        label: "Owner",
                        value:
                          [profile?.first_name, profile?.last_name]
                            .filter(Boolean)
                            .join(" ") ||
                          profile?.owner_name ||
                          "Pending owner",
                      },
                      {
                        label: "Start date",
                        value: formatVendorDate(profile?.start_date),
                      },
                      {
                        label: "Badge URL",
                        value: profile?.badge_url ?? "Not assigned yet",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-sm border border-white/10 bg-white/4 p-3"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-100">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-sm border border-white/10 bg-black/12 p-4">
                  <div className="border-b border-white/10 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      Recent reviews
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Latest customer feedback
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    {reviews.length > 0 ? (
                      reviews.slice(0, 3).map((review) => (
                        <div
                          key={review.id}
                          className="rounded-sm border border-white/10 bg-white/4 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
                              {review.title ?? "Community review"}
                            </p>
                            <span className="text-xs font-semibold text-[var(--accent)]">
                              {review.rating}/5
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {review.body ?? "A published review is available on your vendor account."}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-sm border border-white/10 bg-white/4 p-3 text-sm leading-6 text-slate-300">
                        Reviews will appear here once public review records are connected
                        to your vendor profile.
                      </div>
                    )}
                  </div>
                </article>
              </section>
            </div>
          ) : null}

          {profile && activeSection === "forum" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Forum Activity
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Replies, threads, and mentions
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  Stay on top of forum conversations tied to your vendor account. Open a
                  notification to jump straight to the thread.
                </p>
              </header>

              <section className="rounded-sm border border-white/10 bg-black/12 p-4 sm:p-6">
                <VendorForumActivity
                  userId={currentUser.id}
                  onUnreadCountChange={setForumUnreadCount}
                />
              </section>
            </div>
          ) : null}

          {profile && activeSection === "badge" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  My Badge
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Your public badge
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  This is your public vendor badge preview and account badge details.
                </p>
              </header>

              <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <article className="rounded-sm border border-white/10 bg-black/12 p-5">
                  <div
                    className="badge-placeholder mx-auto overflow-hidden p-3"
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/badges/vendor/${profile.user_id}`}
                      alt={`${profile.company_name} badge`}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>
                </article>

                <article className="rounded-sm border border-white/10 bg-black/12 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Badge URL", value: profile.badge_url ?? "Not assigned yet" },
                      { label: "Subscription tier", value: VENDOR_SUBSCRIPTION_TIER_LABEL },
                      { label: "Badge start date", value: badgeStartDateLabel },
                      {
                        label: "Account standing",
                        value: formatVendorStatus(profile.account_status),
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-sm border border-white/10 bg-white/4 p-3"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {item.label}
                        </p>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-100">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          ) : null}

          {profile && supabase && activeSection === "profile" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Business Profile
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Vendor business details
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  Update your business information, address, and sales profile. Changes save to your
                  vendor record and directory listing.
                </p>
              </header>

              <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <VendorProfileCompletionCard
                  profile={profile}
                  socialLinkCount={socialLinks.length}
                  defaultCollapsed
                />

                <article className="rounded-sm border border-white/10 bg-black/12 p-4">
                  <div className="rounded-sm border border-white/10 bg-white/4 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                      Company logo
                    </p>
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-slate-950/70">
                        {profile?.company_logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.company_logo_url}
                            alt={`${profile.company_name} logo`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="px-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            No logo yet
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-6 text-slate-300">
                          Upload a company logo while your account is waiting for
                          approval. Admins will be able to review it as part of
                          your vendor details.
                        </p>
                        <label className="mt-3 inline-flex cursor-pointer items-center rounded-sm border border-white/12 bg-white/4 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition-colors hover:bg-white/8">
                          {logoUploadPending ? "Uploading logo" : "Upload company logo"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={handleLogoUpload}
                            disabled={logoUploadPending}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-sm border border-white/10 bg-white/4 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Account status
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-100">
                          {formatVendorStatus(profile.account_status)}
                        </p>
                      </div>
                      <div className="rounded-sm border border-white/10 bg-white/4 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Badge URL
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-100 break-words">
                          {profile.badge_url ?? "Not assigned yet"}
                        </p>
                      </div>
                    </div>

                    <VendorProfileEditor
                      supabase={supabase}
                      profile={profile}
                      socialLinks={socialLinks}
                      onSaved={setProfile}
                      onSocialLinksSaved={setSocialLinks}
                      onError={setProfileError}
                      onMessage={setProfileMessage}
                    />
                  </div>
                </article>
              </section>
            </div>
          ) : null}

          {profile && activeSection === "reviews" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Reviews
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Published review history
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  This section will become the vendor-facing view of public
                  feedback and rating patterns as the broader review hub is
                  connected.
                </p>
              </header>

              <section className="space-y-3">
                {reviews.length > 0 ? (
                  reviews.map((review) => {
                    const reviewDisputes = disputes.filter(
                      (dispute) => dispute.review_id === review.id,
                    );

                    return (
                      <article
                        key={review.id}
                        className="rounded-sm border border-white/10 bg-black/12 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">
                              {review.title ?? "Community review"}
                            </p>
                            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {review.reviewer_name} • {formatVendorDate(review.published_at)}
                            </p>
                          </div>
                          <span className="rounded-sm border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                            {review.rating}/5
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-300">
                          {review.body ?? "A published review is attached to this entry."}
                        </p>

                        <div className="mt-4 rounded-sm border border-white/10 bg-white/4 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                            Disputes
                          </p>

                          {reviewDisputes.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {reviewDisputes.map((dispute) => (
                                <div
                                  key={dispute.id}
                                  className="rounded-sm border border-white/10 bg-slate-950/50 p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-100">
                                      {dispute.subject}
                                    </p>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {formatVendorStatus(dispute.dispute_status)}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-slate-300">
                                    {dispute.detail}
                                  </p>
                                  {dispute.admin_resolution_note ? (
                                    <div className="mt-3 rounded-sm border border-white/10 bg-white/4 p-3 text-sm leading-6 text-slate-200">
                                      Admin response: {dispute.admin_resolution_note}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              No disputes have been filed for this review.
                            </p>
                          )}

                          <div className="mt-4 grid gap-3">
                            <input
                              type="text"
                              value={disputeDrafts[review.id]?.subject ?? ""}
                              onChange={(event) =>
                                setDisputeDrafts((current) => ({
                                  ...current,
                                  [review.id]: {
                                    subject: event.target.value,
                                    detail: current[review.id]?.detail ?? "",
                                  },
                                }))
                              }
                              className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                              placeholder="Dispute subject"
                            />
                            <textarea
                              value={disputeDrafts[review.id]?.detail ?? ""}
                              onChange={(event) =>
                                setDisputeDrafts((current) => ({
                                  ...current,
                                  [review.id]: {
                                    subject: current[review.id]?.subject ?? "",
                                    detail: event.target.value,
                                  },
                                }))
                              }
                              rows={3}
                              className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                              placeholder="Describe why this review should be reviewed by admin."
                            />
                            <div>
                              <button
                                type="button"
                                className="isonet-button-secondary"
                                onClick={() => handleSubmitDispute(review.id)}
                                disabled={disputePendingReviewId === review.id}
                              >
                                {disputePendingReviewId === review.id
                                  ? "Submitting dispute"
                                  : "Submit dispute"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-sm border border-white/10 bg-black/12 p-4 text-sm leading-7 text-slate-300">
                    No reviews are attached to this vendor account yet.
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {profile && activeSection === "analytics" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Analytics
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Early vendor performance metrics
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  These metrics will expand as vendor reviews, marketplace
                  activity, and subscription events become more advanced.
                </p>
              </header>

              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Published reviews",
                    value: String(profile?.review_count ?? 0),
                    note: "Tracked against your vendor record",
                  },
                  {
                    label: "Average rating",
                    value: formatRating(profile?.average_rating),
                    note: "Current public review average",
                  },
                  {
                    label: "Social channels",
                    value: String(socialLinks.length),
                    note: "Business links connected to the account",
                  },
                  {
                    label: "Profile readiness",
                    value: `${completionPercent}%`,
                    note: "Required fields only, capped at 100%",
                  },
                ].map((metric) => (
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
            </div>
          ) : null}

          {profile && activeSection === "subscription" ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                  Subscription
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Vendor membership tracking
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  Monthly subscription tiers are coming soon
                </p>
              </header>

              <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <article className="rounded-sm border border-white/10 bg-black/12 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Subscription tier
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    {VENDOR_SUBSCRIPTION_TIER_LABEL}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {VENDOR_SUBSCRIPTION_TIER_NOTE}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        label: "Status",
                        value: formatVendorStatus(subscription?.status ?? "inactive"),
                      },
                      {
                        label: "Started",
                        value: formatVendorDate(subscription?.started_at ?? profile?.start_date),
                      },
                      {
                        label: "Renews",
                        value: formatVendorDate(subscription?.renews_at),
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-sm border border-white/10 bg-white/4 p-3"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-100">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
