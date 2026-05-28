"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { type FormEvent, useEffect, useState } from "react";

import {
  createVendorSocialLinksFromFields,
  type VendorProfile,
  type VendorSocialLink,
  type VendorSocialLinkFields,
} from "../../lib/vendor";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="rich-text-editor"
        aria-hidden="true"
      >
        <div className="rich-text-editor__toolbar rich-text-editor__toolbar--loading" />
        <div className="rich-text-editor__content rich-text-editor__content--loading" />
      </div>
    ),
  },
);
import {
  buildSalesProfileMetadata,
  hasValidSalesProfile,
  salesProfileStateFromArrays,
  vendorSalesItemOptions,
  vendorSalesLocationOptions,
} from "../../lib/vendor-sales-profile";

type VendorProfileEditorProps = {
  supabase: SupabaseClient;
  profile: VendorProfile;
  socialLinks: VendorSocialLink[];
  onSaved: (profile: VendorProfile) => void;
  onSocialLinksSaved: (links: VendorSocialLink[]) => void;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
};

type ProfileFormState = {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone_number: string;
  website_url: string;
  street_address: string;
  address_line_2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
};

function buildFormState(profile: VendorProfile): ProfileFormState {
  return {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    company_name: profile.company_name ?? "",
    email: profile.email ?? "",
    phone_number: profile.phone_number ?? "",
    website_url: profile.website_url ?? "",
    street_address: profile.street_address ?? profile.address ?? "",
    address_line_2: profile.address_line_2 ?? "",
    city: profile.city ?? "",
    state_province: profile.state_province ?? "",
    postal_code: profile.postal_code ?? "",
    country: profile.country ?? "",
  };
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function socialFieldsFromLinks(links: VendorSocialLink[]): VendorSocialLinkFields {
  const fields: VendorSocialLinkFields = {
    facebook: "",
    instagram: "",
    palmstreet: "",
    isopodKeepers: "",
    morphmarket: "",
    additionalLinks: "",
  };

  const additional: string[] = [];

  for (const link of links) {
    const platform = link.platform.trim().toLowerCase();
    if (platform === "facebook") {
      fields.facebook = link.url;
    } else if (platform === "instagram") {
      fields.instagram = link.url;
    } else if (platform === "palmstreet") {
      fields.palmstreet = link.url;
    } else if (platform === "isopodkeepers") {
      fields.isopodKeepers = link.url;
    } else if (platform === "morphmarket") {
      fields.morphmarket = link.url;
    } else {
      additional.push(`${link.platform} | ${link.url}`);
    }
  }

  fields.additionalLinks = additional.join("\n");
  return fields;
}

export function VendorProfileEditor({
  supabase,
  profile,
  socialLinks,
  onSaved,
  onSocialLinksSaved,
  onError,
  onMessage,
}: VendorProfileEditorProps) {
  const [form, setForm] = useState<ProfileFormState>(() => buildFormState(profile));
  const [salesProfile, setSalesProfile] = useState(() =>
    salesProfileStateFromArrays(profile.sales_locations, profile.sales_items),
  );
  const [socialFields, setSocialFields] = useState<VendorSocialLinkFields>(() =>
    socialFieldsFromLinks(socialLinks),
  );
  const [aboutUsHtml, setAboutUsHtml] = useState(profile.about_us_html ?? "");
  const [savePending, setSavePending] = useState(false);

  useEffect(() => {
    setForm(buildFormState(profile));
    setSalesProfile(
      salesProfileStateFromArrays(profile.sales_locations, profile.sales_items),
    );
    setAboutUsHtml(profile.about_us_html ?? "");
  }, [profile]);

  useEffect(() => {
    setSocialFields(socialFieldsFromLinks(socialLinks));
  }, [socialLinks]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError("");
    onMessage("");

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const companyName = form.company_name.trim();
    const email = form.email.trim();

    if (!firstName || !lastName || !companyName || !email) {
      onError("First name, last name, company name, and email are required.");
      return;
    }

    if (!hasValidSalesProfile(salesProfile)) {
      onError("Select at least one sales location and one sales item.");
      return;
    }

    setSavePending(true);

    try {
      const ownerName = `${firstName} ${lastName}`.trim();
      const salesMetadata = buildSalesProfileMetadata(salesProfile);
      const normalizedSocials = createVendorSocialLinksFromFields(socialFields);

      const { data, error } = await supabase
        .from("vendor_profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          owner_name: ownerName,
          company_name: companyName,
          email,
          phone_number: form.phone_number.trim() || null,
          website_url: normalizeWebsiteUrl(form.website_url),
          street_address: form.street_address.trim() || null,
          address_line_2: form.address_line_2.trim() || null,
          city: form.city.trim() || null,
          state_province: form.state_province.trim() || null,
          postal_code: form.postal_code.trim() || null,
          country: form.country.trim() || null,
          address: null,
          sales_locations: salesMetadata.sales_locations,
          sales_items: salesMetadata.sales_items,
          about_us_html: aboutUsHtml.trim() ? aboutUsHtml : null,
        })
        .eq("user_id", profile.user_id)
        .select(
          "user_id, owner_name, first_name, last_name, company_name, website_url, address, street_address, address_line_2, city, state_province, postal_code, country, phone_number, email, account_status, badge_url, company_logo_url, average_rating, review_count, start_date, badge_start_date, sales_locations, sales_items, about_us_html, created_at, updated_at",
        )
        .single();

      if (error) {
        throw error;
      }

      const { error: deleteSocialError } = await supabase
        .from("vendor_social_links")
        .delete()
        .eq("vendor_user_id", profile.user_id);

      if (deleteSocialError) {
        throw deleteSocialError;
      }

      if (normalizedSocials.length > 0) {
        const { data: insertedSocials, error: socialInsertError } = await supabase
          .from("vendor_social_links")
          .insert(
            normalizedSocials.map((item) => ({
              vendor_user_id: profile.user_id,
              platform: item.platform,
              url: item.url,
              sort_order: item.sort_order,
            })),
          )
          .select("id, vendor_user_id, platform, url, sort_order")
          .order("sort_order", { ascending: true });

        if (socialInsertError) {
          throw socialInsertError;
        }

        onSocialLinksSaved(
          (insertedSocials ?? []).map((item) => ({
            id: String(item.id),
            vendor_user_id: String(item.vendor_user_id),
            platform: String(item.platform),
            url: String(item.url),
            sort_order: Number(item.sort_order ?? 0),
          })),
        );
      } else {
        onSocialLinksSaved([]);
      }

      onSaved({
        user_id: String(data.user_id),
        owner_name: String(data.owner_name ?? ownerName),
        first_name: data.first_name ? String(data.first_name) : firstName,
        last_name: data.last_name ? String(data.last_name) : lastName,
        company_name: String(data.company_name ?? companyName),
        website_url: data.website_url ? String(data.website_url) : null,
        address: data.address ? String(data.address) : null,
        street_address: data.street_address ? String(data.street_address) : null,
        address_line_2: data.address_line_2 ? String(data.address_line_2) : null,
        city: data.city ? String(data.city) : null,
        state_province: data.state_province ? String(data.state_province) : null,
        postal_code: data.postal_code ? String(data.postal_code) : null,
        country: data.country ? String(data.country) : null,
        phone_number: data.phone_number ? String(data.phone_number) : null,
        email: String(data.email ?? email),
        account_status: data.account_status as VendorProfile["account_status"],
        badge_url: data.badge_url ? String(data.badge_url) : null,
        company_logo_url: data.company_logo_url ? String(data.company_logo_url) : null,
        average_rating: Number(data.average_rating ?? 0),
        review_count: Number(data.review_count ?? 0),
        start_date: String(data.start_date ?? ""),
        badge_start_date: data.badge_start_date ? String(data.badge_start_date) : null,
        sales_locations: Array.isArray(data.sales_locations)
          ? data.sales_locations.map(String)
          : salesMetadata.sales_locations,
        sales_items: Array.isArray(data.sales_items)
          ? data.sales_items.map(String)
          : salesMetadata.sales_items,
        about_us_html: data.about_us_html ? String(data.about_us_html) : null,
        created_at: String(data.created_at ?? ""),
        updated_at: String(data.updated_at ?? ""),
      });
      onMessage("Business profile saved.");
    } catch (saveError) {
      onError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save your business profile right now.",
      );
    } finally {
      setSavePending(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-white">First name</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.first_name}
            onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-white">Last name</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.last_name}
            onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
          <span className="font-semibold text-white">Company name</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.company_name}
            onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-white">Business email</span>
          <input
            type="email"
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-white">Phone number</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.phone_number}
            onChange={(event) => setForm((current) => ({ ...current, phone_number: event.target.value }))}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
          <span className="font-semibold text-white">Website URL</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.website_url}
            onChange={(event) => setForm((current) => ({ ...current, website_url: event.target.value }))}
            placeholder="https://"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
          <span className="font-semibold text-white">Street address</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.street_address}
            onChange={(event) => setForm((current) => ({ ...current, street_address: event.target.value }))}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
          <span className="font-semibold text-white">Address line 2</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.address_line_2}
            onChange={(event) => setForm((current) => ({ ...current, address_line_2: event.target.value }))}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-white">City</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.city}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-white">State / province</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.state_province}
            onChange={(event) => setForm((current) => ({ ...current, state_province: event.target.value }))}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-white">ZIP / postal code</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.postal_code}
            onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-white">Country</span>
          <input
            className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
            value={form.country}
            onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
          />
        </label>
      </div>

      <div className="space-y-6 rounded-sm border border-white/10 bg-white/4 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            Sales profile
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Update where and what you sell. These match the options from vendor onboarding.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            Sales locations
          </p>
          <div className="space-y-2">
            {vendorSalesLocationOptions.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-center gap-3 rounded-sm border border-white/10 bg-slate-950/40 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={salesProfile[option.key]}
                  onChange={(event) =>
                    setSalesProfile((current) => ({
                      ...current,
                      [option.key]: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 shrink-0 rounded-sm border-white/20 bg-slate-950/80 accent-[var(--accent)]"
                />
                <span className="text-sm text-slate-100">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            Sales items
          </p>
          <div className="space-y-2">
            {vendorSalesItemOptions.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-center gap-3 rounded-sm border border-white/10 bg-slate-950/40 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={salesProfile[option.key]}
                  onChange={(event) =>
                    setSalesProfile((current) => ({
                      ...current,
                      [option.key]: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 shrink-0 rounded-sm border-white/20 bg-slate-950/80 accent-[var(--accent)]"
                />
                <span className="text-sm text-slate-100">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-sm border border-white/10 bg-white/4 p-4">
        <div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Social media
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Use the same social channel fields as vendor onboarding.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span className="font-semibold text-white">Facebook</span>
            <input
              className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
              value={socialFields.facebook}
              onChange={(event) =>
                setSocialFields((current) => ({ ...current, facebook: event.target.value }))
              }
              placeholder="https://facebook.com/..."
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span className="font-semibold text-white">Instagram</span>
            <input
              className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
              value={socialFields.instagram}
              onChange={(event) =>
                setSocialFields((current) => ({ ...current, instagram: event.target.value }))
              }
              placeholder="https://instagram.com/..."
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span className="font-semibold text-white">Palmstreet</span>
            <input
              className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
              value={socialFields.palmstreet}
              onChange={(event) =>
                setSocialFields((current) => ({ ...current, palmstreet: event.target.value }))
              }
              placeholder="https://..."
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span className="font-semibold text-white">IsopodKeepers</span>
            <input
              className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
              value={socialFields.isopodKeepers}
              onChange={(event) =>
                setSocialFields((current) => ({ ...current, isopodKeepers: event.target.value }))
              }
              placeholder="https://..."
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
            <span className="font-semibold text-white">MorphMarket</span>
            <input
              className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
              value={socialFields.morphmarket}
              onChange={(event) =>
                setSocialFields((current) => ({ ...current, morphmarket: event.target.value }))
              }
              placeholder="https://morphmarket.com/..."
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
            <span className="font-semibold text-white">Additional links</span>
            <textarea
              rows={4}
              className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-50"
              value={socialFields.additionalLinks}
              onChange={(event) =>
                setSocialFields((current) => ({ ...current, additionalLinks: event.target.value }))
              }
              placeholder={"One per line. Example:\nYouTube | https://youtube.com/@yourbrand"}
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-sm border border-white/10 bg-white/4 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            About us
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            This appears on your public vendor profile page.
          </p>
        </div>
        <RichTextEditor value={aboutUsHtml} onChange={setAboutUsHtml} />
      </div>

      <button type="submit" className="isonet-button" disabled={savePending}>
        {savePending ? "Saving profile…" : "Save business profile"}
      </button>
    </form>
  );
}
