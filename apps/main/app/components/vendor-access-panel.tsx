"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "../../lib/supabase";
import {
  VENDOR_SIGNUP_CONFIRM_STEP,
  VENDOR_SIGNUP_FIRST_AGREEMENT_STEP,
  VENDOR_SIGNUP_LAST_AGREEMENT_STEP,
  VENDOR_SIGNUP_REVIEW_STEP,
  VENDOR_SIGNUP_STEP_COUNT,
  allStatementAgreementsAccepted,
  buildStatementAgreementRecords,
  createEmptyAgreementState,
  getAgreementPageForStep,
  vendorStatementAgreements,
} from "../../lib/vendor-statement-agreements";
import {
  createVendorSocialLinksFromFields,
  ensureVendorProfileProvisioned,
  recordVendorStatementAgreements,
} from "../../lib/vendor";

type AccessMode = "signup" | "login";
type SignupStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type VendorAccessPanelProps = {
  initialMode?: AccessMode;
  compact?: boolean;
  title?: string;
  description?: string;
};

const defaultForm = {
  firstName: "",
  lastName: "",
  companyName: "",
  websiteUrl: "",
  facebook: "",
  instagram: "",
  palmstreet: "",
  isopodKeepers: "",
  morphmarket: "",
  additionalLinks: "",
  streetAddress: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  country: "",
  phoneNumber: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type AddressSuggestion = {
  label: string;
  streetAddress: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
};

type SignupStepMeta = {
  eyebrow: string;
  title: string;
  description: string;
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

function getSignupStepMeta(step: SignupStep): SignupStepMeta {
  if (step === 1) {
    return {
      eyebrow: "Step 1",
      title: "User information",
      description:
        "Add the primary contact information we need to identify the vendor account and route it through approval.",
    };
  }

  if (step === 2) {
    return {
      eyebrow: "Step 2",
      title: "Company details",
      description:
        "Share the storefront and social pages you want associated with your vendor profile inside The Isopod Network.",
    };
  }

  if (step === VENDOR_SIGNUP_REVIEW_STEP) {
    return {
      eyebrow: `Step ${step}`,
      title: "Review your application",
      description:
        "Confirm your contact details, company information, and statement agreements before submitting for approval.",
    };
  }

  if (step === VENDOR_SIGNUP_CONFIRM_STEP) {
    return {
      eyebrow: `Step ${step}`,
      title: "Application received",
      description:
        "Your vendor account has been created and sent into the approval process. You can still access your portal while approval is pending.",
    };
  }

  const agreementPage = getAgreementPageForStep(step);

  if (agreementPage) {
    return {
      eyebrow: agreementPage.eyebrow,
      title: agreementPage.title,
      description: agreementPage.description,
    };
  }

  return {
    eyebrow: `Step ${step}`,
    title: "Vendor standards",
    description: "Confirm the agreements required to join The Isopod Network.",
  };
}

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

function formatPhoneNumberInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function buildStreetAddress(houseNumber?: string, road?: string) {
  return [houseNumber, road].filter(Boolean).join(" ").trim();
}

function parseAddressSuggestion(item: {
  display_name?: string;
  address?: Record<string, string | undefined>;
}) {
  const address = item.address ?? {};
  const streetAddress =
    buildStreetAddress(address.house_number, address.road) ||
    address.road ||
    address.pedestrian ||
    address.path ||
    "";
  const city =
    address.city || address.town || address.village || address.hamlet || "";
  const stateProvince = address.state || address.region || address.county || "";
  const postalCode = address.postcode || "";
  const country = address.country || "";
  const label =
    item.display_name ||
    [streetAddress, city, stateProvince, postalCode, country]
      .filter(Boolean)
      .join(", ");

  return {
    label,
    streetAddress,
    city,
    stateProvince,
    postalCode,
    country,
  } satisfies AddressSuggestion;
}

export function VendorAccessPanel({
  initialMode = "signup",
  compact = false,
  title = "Vendor Access",
  description = "Create a vendor account or sign in to manage your standing, business profile, reviews, and future subscription tools.",
}: VendorAccessPanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mode] = useState<AccessMode>(initialMode);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [form, setForm] = useState(defaultForm);
  const [statementAgreements, setStatementAgreements] = useState(createEmptyAgreementState);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [createdAccountEmail, setCreatedAccountEmail] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLookupPending, setAddressLookupPending] = useState(false);
  const [addressMenuOpen, setAddressMenuOpen] = useState(false);
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

  useEffect(() => {
    if (mode !== "signup") {
      return;
    }

    const query = form.streetAddress.trim();

    if (query.length < 4) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setAddressLookupPending(true);

      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Address lookup failed.");
        }

        const data = (await response.json()) as Array<{
          display_name?: string;
          address?: Record<string, string | undefined>;
        }>;

        const nextSuggestions = data
          .map(parseAddressSuggestion)
          .filter((item) => item.label);

        setAddressSuggestions(nextSuggestions);
        setAddressMenuOpen(nextSuggestions.length > 0);
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setAddressSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setAddressLookupPending(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [form.streetAddress, mode]);

  function validateSignupStep(step: SignupStep) {
    if (step === 1) {
      if (!form.firstName.trim()) {
        return "Add the vendor first name before continuing.";
      }

      if (!form.lastName.trim()) {
        return "Add the vendor last name before continuing.";
      }

      if (!form.streetAddress.trim()) {
        return "Add the street address before continuing.";
      }

      if (!form.city.trim() || !form.stateProvince.trim() || !form.postalCode.trim()) {
        return "Add the city, state or province, and ZIP or postal code before continuing.";
      }

      if (!form.country.trim()) {
        return "Add the country before continuing.";
      }

      if (!form.email.trim()) {
        return "Add the account email before continuing.";
      }

      if (!form.password) {
        return "Create a password before continuing.";
      }

      if (!form.confirmPassword) {
        return "Retype the password before continuing.";
      }

      if (!passwordsMatch) {
        return "Passwords do not match.";
      }
    }

    if (step === 2 && !form.companyName.trim()) {
      return "Add the company name before continuing.";
    }

    if (
      step >= VENDOR_SIGNUP_FIRST_AGREEMENT_STEP &&
      step <= VENDOR_SIGNUP_LAST_AGREEMENT_STEP
    ) {
      const agreementPage = getAgreementPageForStep(step);

      if (!agreementPage) {
        return "Unable to load the agreement step. Refresh and try again.";
      }

      const missingAgreement = agreementPage.agreements.find(
        (agreement) => !statementAgreements[agreement.key],
      );

      if (missingAgreement) {
        return `Confirm the agreement for “${missingAgreement.title}” before continuing.`;
      }
    }

    if (step === VENDOR_SIGNUP_REVIEW_STEP && !allStatementAgreementsAccepted(statementAgreements)) {
      return "Confirm every statement agreement before finishing signup.";
    }

    return null;
  }

  function handleSignupBack() {
    setAuthError(null);
    setAuthMessage(null);
    setSignupStep((current) =>
      current > 1 && current < VENDOR_SIGNUP_CONFIRM_STEP
        ? ((current - 1) as SignupStep)
        : current,
    );
  }

  function handleSignupNext() {
    const validationError = validateSignupStep(signupStep);

    if (validationError) {
      setAuthError(validationError);
      setAuthMessage(null);
      return;
    }

    setAuthError(null);
    setAuthMessage(null);
    setSignupStep((current) =>
      current < VENDOR_SIGNUP_REVIEW_STEP ? ((current + 1) as SignupStep) : current,
    );
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (signupStep < VENDOR_SIGNUP_REVIEW_STEP) {
      handleSignupNext();
      return;
    }

    if (!supabase) {
      setAuthError(
        "Supabase browser configuration is missing. Add the public URL and anon key first.",
      );
      return;
    }

    const validationError = validateSignupStep(signupStep);

    if (validationError) {
      setAuthError(validationError);
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
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            owner_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
            company_name: form.companyName.trim(),
            website_url: form.websiteUrl.trim() || null,
            address:
              [
                form.streetAddress.trim(),
                form.addressLine2.trim(),
                form.city.trim(),
                form.stateProvince.trim(),
                form.postalCode.trim(),
                form.country.trim(),
              ]
                .filter(Boolean)
                .join(", ") || null,
            street_address: form.streetAddress.trim() || null,
            address_line_2: form.addressLine2.trim() || null,
            city: form.city.trim() || null,
            state_province: form.stateProvince.trim() || null,
            postal_code: form.postalCode.trim() || null,
            country: form.country.trim() || null,
            phone_number: form.phoneNumber.trim() || null,
            company_email: form.email.trim(),
            social_links: socialLinks,
            subscription_tier: "Application",
            statement_agreements: buildStatementAgreementRecords(statementAgreements),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        await ensureVendorProfileProvisioned(supabase, data.user);
        await recordVendorStatementAgreements(supabase, data.user.id, statementAgreements);
        setPortalReady(true);
      } else {
        setPortalReady(false);
      }

      setCreatedAccountEmail(form.email.trim());
      setAuthMessage(
        data.user && data.session
          ? "Your account is active and ready to open in the vendor portal."
          : "If email confirmation is enabled in Supabase, verify the account email before opening the vendor portal.",
      );
      setSignupStep(VENDOR_SIGNUP_CONFIRM_STEP);
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

  const showSignupConfirmation =
    mode === "signup" && signupStep === VENDOR_SIGNUP_CONFIRM_STEP;
  const activeAgreementPage = getAgreementPageForStep(signupStep);
  const socialSummary = [
    ...socialFields
      .map((field) => ({
        label: field.label,
        value: form[field.key].trim(),
      }))
      .filter((item) => item.value),
    ...(form.additionalLinks.trim()
      ? [{ label: "Additional links", value: form.additionalLinks.trim() }]
      : []),
  ];

  const summarySections = [
    {
      title: "User information",
      items: [
        { label: "First name", value: form.firstName.trim() || "Not provided" },
        { label: "Last name", value: form.lastName.trim() || "Not provided" },
        {
          label: "Street address",
          value: form.streetAddress.trim() || "Not provided",
        },
        {
          label: "Address line 2",
          value: form.addressLine2.trim() || "Not provided",
        },
        { label: "City", value: form.city.trim() || "Not provided" },
        {
          label: "State / Province",
          value: form.stateProvince.trim() || "Not provided",
        },
        {
          label: "ZIP / Postal code",
          value: form.postalCode.trim() || "Not provided",
        },
        { label: "Country", value: form.country.trim() || "Not provided" },
        { label: "Email", value: form.email.trim() || "Not provided" },
      ],
    },
    {
      title: "Company details",
      items: [
        { label: "Company name", value: form.companyName.trim() || "Not provided" },
        { label: "Website URL", value: form.websiteUrl.trim() || "Not provided" },
        { label: "Phone number", value: form.phoneNumber.trim() || "Not provided" },
        {
          label: "Social media pages",
          value:
            socialSummary.length > 0
              ? socialSummary.map((item) => `${item.label}: ${item.value}`).join("\n")
              : "Not provided",
        },
      ],
    },
    {
      title: "Statement agreements",
      items: vendorStatementAgreements.map((agreement) => ({
        label: agreement.title,
        value: statementAgreements[agreement.key] ? "Agreed" : "Not confirmed",
      })),
    },
  ];

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

        {activeEmail && !showSignupConfirmation ? (
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
                <div className="space-y-6">
                  <div className="rounded-sm border border-white/10 bg-white/4 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
                      {getSignupStepMeta(signupStep).eyebrow}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {getSignupStepMeta(signupStep).title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {getSignupStepMeta(signupStep).description}
                    </p>
                    {activeAgreementPage ? (
                      <p className="mt-3 text-sm leading-7 text-slate-400">
                        Read the full public{" "}
                        <Link href="/statement" className="isonet-link font-semibold">
                          IsoNet statement
                        </Link>{" "}
                        for complete context on each standard.
                      </p>
                    ) : null}
                  </div>

                  {signupStep === 1 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                          First name
                        </span>
                        <input
                          value={form.firstName}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              firstName: event.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                          placeholder="First name"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                          Last name
                        </span>
                        <input
                          value={form.lastName}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              lastName: event.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                          placeholder="Last name"
                        />
                      </label>

                      <label className="space-y-2 md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                          Street address
                        </span>
                        <div className="relative">
                          <input
                            value={form.streetAddress}
                            onFocus={() => {
                              if (addressSuggestions.length > 0) {
                                setAddressMenuOpen(true);
                              }
                            }}
                            onBlur={() => {
                              window.setTimeout(() => setAddressMenuOpen(false), 150);
                            }}
                            onChange={(event) => {
                              const nextStreetAddress = event.target.value;

                              setForm((current) => ({
                                ...current,
                                streetAddress: nextStreetAddress,
                              }));

                              if (nextStreetAddress.trim().length < 4) {
                                setAddressSuggestions([]);
                                setAddressLookupPending(false);
                                setAddressMenuOpen(false);
                              }
                            }}
                            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                            placeholder="Start typing your street address"
                            autoComplete="address-line1"
                          />
                          {addressMenuOpen &&
                          (addressSuggestions.length > 0 || addressLookupPending) ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-sm border border-white/12 bg-[rgba(5,11,20,0.98)] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                              {addressLookupPending ? (
                                <div className="px-4 py-3 text-sm text-slate-300">
                                  Looking up address matches...
                                </div>
                              ) : (
                                addressSuggestions.map((suggestion) => (
                                  <button
                                    key={suggestion.label}
                                    type="button"
                                    onClick={() => {
                                      setForm((current) => ({
                                        ...current,
                                        streetAddress:
                                          suggestion.streetAddress || current.streetAddress,
                                        city: suggestion.city,
                                        stateProvince: suggestion.stateProvince,
                                        postalCode: suggestion.postalCode,
                                        country: suggestion.country,
                                      }));
                                      setAddressMenuOpen(false);
                                    }}
                                    className="block w-full border-b border-white/8 px-4 py-3 text-left text-sm leading-6 text-slate-200 last:border-b-0 hover:bg-white/6"
                                  >
                                    {suggestion.label}
                                  </button>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                          Address line 2
                        </span>
                        <input
                          value={form.addressLine2}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              addressLine2: event.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                          placeholder="Suite, apartment, unit, etc."
                          autoComplete="address-line2"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                          City
                        </span>
                        <input
                          value={form.city}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              city: event.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                          placeholder="City"
                          autoComplete="address-level2"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                          State / Province
                        </span>
                        <input
                          value={form.stateProvince}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              stateProvince: event.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                          placeholder="State or province"
                          autoComplete="address-level1"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                          ZIP / Postal code
                        </span>
                        <input
                          value={form.postalCode}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              postalCode: event.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                          placeholder="ZIP or postal code"
                          autoComplete="postal-code"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                          Country
                        </span>
                        <input
                          value={form.country}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              country: event.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                          placeholder="Country"
                          autoComplete="country-name"
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
                    </div>
                  ) : null}

                  {signupStep === 2 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 md:col-span-2">
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
                              phoneNumber: formatPhoneNumberInput(event.target.value),
                            }))
                          }
                          inputMode="tel"
                          className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500"
                          placeholder="(734) 679-2428"
                        />
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
                  ) : null}

                  {activeAgreementPage ? (
                    <div className="space-y-4">
                      {activeAgreementPage.agreements.map((agreement) => (
                        <label
                          key={agreement.key}
                          className="flex cursor-pointer gap-4 rounded-sm border border-white/10 bg-white/4 p-4 transition-colors hover:border-white/16"
                        >
                          <input
                            type="checkbox"
                            checked={statementAgreements[agreement.key]}
                            onChange={(event) =>
                              setStatementAgreements((current) => ({
                                ...current,
                                [agreement.key]: event.target.checked,
                              }))
                            }
                            className="mt-1 h-4 w-4 shrink-0 rounded-sm border-white/20 bg-slate-950/80 accent-[var(--accent)]"
                          />
                          <span className="space-y-2">
                            <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">
                              {agreement.title}
                            </span>
                            <span className="block text-sm leading-7 text-slate-300">
                              {agreement.summary}
                            </span>
                            <Link
                              href={`/statement#${agreement.statementAnchor}`}
                              className="isonet-link inline-block text-xs font-semibold uppercase tracking-[0.16em]"
                            >
                              Read in our statement →
                            </Link>
                            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                              {agreement.checkboxLabel}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {signupStep === VENDOR_SIGNUP_REVIEW_STEP ? (
                    <div className="space-y-4">
                      {summarySections.map((section) => (
                        <div
                          key={section.title}
                          className="rounded-sm border border-white/10 bg-white/4 p-4"
                        >
                          <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">
                            {section.title}
                          </h4>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {section.items.map((item) => (
                              <div
                                key={`${section.title}-${item.label}`}
                                className="rounded-sm border border-white/8 bg-slate-950/50 p-3"
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  {item.label}
                                </p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-100">
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {signupStep === VENDOR_SIGNUP_CONFIRM_STEP ? (
                    <div className="space-y-4 rounded-sm border border-emerald-300/30 bg-emerald-200/10 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                        Vendor application created
                      </p>
                      <h4 className="text-2xl font-semibold tracking-tight text-white">
                        Your application has been submitted for approval.
                      </h4>
                      <p className="text-sm leading-7 text-slate-100">
                        {(createdAccountEmail || form.email.trim() || "This account")} has been
                        entered into the approval process. You can still access the vendor
                        portal and dashboard while your status is awaiting approval.
                      </p>
                      <button
                        type="button"
                        className="isonet-button"
                        onClick={() => router.push("/vendor")}
                      >
                        {portalReady ? "Open vendor portal dashboard" : "Go to vendor portal"}
                      </button>
                    </div>
                  ) : null}
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

              {mode === "signup" ? (
                signupStep < VENDOR_SIGNUP_CONFIRM_STEP ? (
                  <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <button
                      type="button"
                      className="isonet-button-secondary"
                      onClick={handleSignupBack}
                      disabled={signupStep === 1 || authPending}
                    >
                      Back
                    </button>
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {signupStep} of {VENDOR_SIGNUP_STEP_COUNT}
                    </p>
                    <button type="submit" className="isonet-button sm:justify-self-end" disabled={authPending}>
                      {authPending
                        ? "Creating account"
                        : signupStep === VENDOR_SIGNUP_REVIEW_STEP
                          ? "Finish"
                          : "Next"}
                    </button>
                  </div>
                ) : null
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="isonet-button" disabled={authPending}>
                    {authPending ? "Signing in" : "Open vendor portal"}
                  </button>
                  <button
                    type="button"
                    className="isonet-button-secondary"
                    onClick={() => router.push("/vendor")}
                  >
                    Go to portal
                  </button>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </section>
  );
}
