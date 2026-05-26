"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "../../lib/supabase";
import {
  createVendorSocialLinksFromFields,
  ensureVendorProfileProvisioned,
} from "../../lib/vendor";

type AccessMode = "signup" | "login";

type VendorAccessPanelProps = {
  initialMode?: AccessMode;
  compact?: boolean;
  title?: string;
  description?: string;
};

const defaultForm = {
  ownerName: "",
  companyName: "",
  websiteUrl: "",
  facebook: "",
  instagram: "",
  palmstreet: "",
  isopodKeepers: "",
  morphmarket: "",
  additionalLinks: "",
  address: "",
  phoneNumber: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const socialFields = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbrand" },
  { key: "palmstreet", label: "Palmstreet", placeholder: "https://palmstreet.app/..." },
  {
    key: "isopodKeepers",
    label: "IsopodKeepers",
    placeholder: "https://isopodkeepers.com/...",
  },
  {
    key: "morphmarket",
    label: "MorphMarket",
    placeholder: "https://morphmarket.com/stores/yourbrand",
  },
] as const;

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score <= 1) {
    return {
      score,
      label: "Weak",
      barClass: "bg-rose-300",
      textClass: "text-rose-200",
    };
  }

  if (score === 2) {
    return {
      score,
      label: "Fair",
      barClass: "bg-amber-300",
      textClass: "text-amber-200",
    };
  }

  if (score === 3) {
    return {
      score,
      label: "Good",
      barClass: "bg-sky-300",
      textClass: "text-sky-200",
    };
  }

  return {
    score,
    label: "Strong",
    barClass: "bg-emerald-300",
    textClass: "text-emerald-200",
  };
}

export function VendorAccessPanel({
  initialMode = "signup",
  compact = false,
  title = "Vendor Access",
  description = "Create a vendor account or sign in to manage your standing, business profile, reviews, and future subscription tools.",
}: VendorAccessPanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<AccessMode>(initialMode);
  const [form, setForm] = useState(defaultForm);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const passwordStrength = getPasswordStrength(form.password);
  const passwordsMatch =
    !form.confirmPassword || form.password === form.confirmPassword;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setActiveEmail(data.user?.email ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setActiveEmail(session?.user?.email ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setAuthError(
        "Supabase browser configuration is missing. Add the public URL and anon key first.",
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setAuthError("Passwords do not match.");
      setAuthMessage(null);
      return;
    }

    setAuthPending(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const socialLinks = createVendorSocialLinksFromFields({
        facebook: form.facebook,
        instagram: form.instagram,
        palmstreet: form.palmstreet,
        isopodKeepers: form.isopodKeepers,
        morphmarket: form.morphmarket,
        additionalLinks: form.additionalLinks,
      });
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            account_role: "vendor",
            owner_name: form.ownerName.trim(),
            company_name: form.companyName.trim(),
            website_url: form.websiteUrl.trim() || null,
            address: form.address.trim() || null,
            phone_number: form.phoneNumber.trim() || null,
            company_email: form.email.trim(),
            social_links: socialLinks,
            subscription_tier: "Application",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        await ensureVendorProfileProvisioned(supabase, data.user);
        router.push("/vendor");
        return;
      }

      setAuthMessage(
        "Vendor account created. If your Supabase project requires email confirmation, verify your email first, then sign in to open the vendor portal.",
      );
      setMode("login");
      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
    } catch (error) {
      setAuthError(getErrorMessage(error, "Unable to create vendor account."));
    } finally {
      setAuthPending(false);
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setAuthError(
        "Supabase browser configuration is missing. Add the public URL and anon key first.",
      );
      return;
    }

    setAuthPending(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await ensureVendorProfileProvisioned(supabase, data.user);
      }

      router.push("/vendor");
    } catch (error) {
      setAuthError(getErrorMessage(error, "Unable to sign in to the vendor portal."));
    } finally {
      setAuthPending(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setAuthPending(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      await supabase.auth.signOut();
      setActiveEmail(null);
      router.refresh();
    } catch (error) {
      setAuthError(getErrorMessage(error, "Unable to sign out."));
    } finally {
      setAuthPending(false);
    }
  }

  if (!hasSupabaseBrowserEnv() || !supabase) {
    return (
      <section className="isonet-panel p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
          Vendor Access
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Vendor onboarding is waiting on Supabase configuration.
        </h2>
        <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
          before vendors can sign up or sign in from the public site.
        </p>
      </section>
    );
  }

  return (
    <section className="isonet-panel p-6 sm:p-8">
      <div className={compact ? "space-y-5" : "space-y-6"}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            {title}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Vendor account onboarding
          </h2>
          <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
            {description}
          </p>
        </div>

        {activeEmail ? (
          <div className="rounded-sm border border-[var(--accent)]/28 bg-[var(--accent)]/8 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Active vendor session
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-200">{activeEmail}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="isonet-button"
                onClick={() => router.push("/vendor")}
              >
                Open vendor portal
              </button>
              <button
                type="button"
                className="isonet-button-secondary"
                onClick={handleSignOut}
                disabled={authPending}
              >
                {authPending ? "Signing out" : "Sign out"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm leading-7 text-slate-300">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <a
                    href="/vendor"
                    className="font-semibold text-[var(--accent)] underline underline-offset-4"
                  >
                    Sign in here.
                  </a>
                </>
              ) : (
                <>
                  Need an account?{" "}
                  <a
                    href="/vendor/signup"
                    className="font-semibold text-[var(--accent)] underline underline-offset-4"
                  >
                    Create one here.
                  </a>
                </>
              )}
            </div>

            <form
              className="grid gap-4"
              onSubmit={mode === "signup" ? handleSignUp : handleSignIn}
            >
              {mode === "signup" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Owner name
                    </span>
                    <input
                      value={form.ownerName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          ownerName: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="Owner or primary contact"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Company name
                    </span>
                    <input
                      value={form.companyName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          companyName: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="Your company or storefront"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Website URL
                    </span>
                    <input
                      value={form.websiteUrl}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          websiteUrl: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="https://yourwebsite.com"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Phone number
                    </span>
                    <input
                      value={form.phoneNumber}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phoneNumber: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="Business phone"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Address
                    </span>
                    <textarea
                      value={form.address}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="Business mailing address"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Email
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="vendor@yourcompany.com"
                      autoComplete="email"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Password
                    </span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="Create a password"
                      autoComplete="new-password"
                    />
                    <div className="space-y-2">
                      <div className="h-2 overflow-hidden rounded-full bg-white/8">
                        <div
                          className={`h-full transition-all duration-200 ${passwordStrength.barClass}`}
                          style={{ width: `${Math.max(passwordStrength.score, 1) * 25}%` }}
                        />
                      </div>
                      <p className={`text-xs font-medium ${passwordStrength.textClass}`}>
                        Password strength: {passwordStrength.label}
                      </p>
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Retype password
                    </span>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="Retype your password"
                      autoComplete="new-password"
                    />
                    {form.confirmPassword ? (
                      <p
                        className={`text-xs font-medium ${
                          passwordsMatch ? "text-emerald-200" : "text-rose-200"
                        }`}
                      >
                        {passwordsMatch
                          ? "Passwords match."
                          : "Passwords do not match."}
                      </p>
                    ) : null}
                  </label>

                  {socialFields.map((field) => (
                    <label key={field.key} className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                        {field.label}
                      </span>
                      <input
                        value={form[field.key]}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                        placeholder={field.placeholder}
                      />
                    </label>
                  ))}

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Additional links
                    </span>
                    <textarea
                      value={form.additionalLinks}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          additionalLinks: event.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder={"One per line. Example:\nYouTube | https://youtube.com/@yourbrand\nTikTok | https://tiktok.com/@yourbrand"}
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Email
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="vendor@yourcompany.com"
                      autoComplete="email"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Password
                    </span>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                  </label>
                </div>
              )}

              {authError ? (
                <div className="rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-4 text-sm leading-7 text-rose-100">
                  {authError}
                </div>
              ) : null}

              {authMessage ? (
                <div className="rounded-sm border border-emerald-300/30 bg-emerald-200/10 px-4 py-4 text-sm leading-7 text-emerald-100">
                  {authMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="isonet-button" disabled={authPending}>
                  {authPending
                    ? mode === "signup"
                      ? "Creating account"
                      : "Signing in"
                    : mode === "signup"
                      ? "Create vendor account"
                      : "Open vendor portal"}
                </button>
                <button
                  type="button"
                  className="isonet-button-secondary"
                  onClick={() => router.push("/vendor")}
                >
                  Go to portal
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
