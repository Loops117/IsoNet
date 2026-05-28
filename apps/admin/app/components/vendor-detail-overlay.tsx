"use client";

import { useEffect } from "react";

import {
  adminVendorStatusOptions,
  formatAdminActivityType,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminSalesProfileList,
  formatAdminStructuredAddress,
  formatAdminVendorStatus,
  isApprovedVendorStatus,
  VENDOR_APPROVAL_EMAIL_ACTIVITY_TYPE,
  type AdminVendorDetail,
} from "../../lib/vendor-management";

export type VendorAuthEmailType = "recovery" | "signup";

type VendorDetailOverlayProps = {
  open: boolean;
  loading: boolean;
  detail: AdminVendorDetail | null;
  statusDraft: string;
  statusPending: boolean;
  noteDraft: string;
  notePending: boolean;
  emailType: VendorAuthEmailType;
  emailSendPending: boolean;
  approvalEmailSendPending: boolean;
  message: string | null;
  error: string | null;
  onClose: () => void;
  onStatusDraftChange: (value: string) => void;
  onStatusSave: () => void;
  onNoteDraftChange: (value: string) => void;
  onNoteSubmit: () => void;
  onEmailTypeChange: (value: VendorAuthEmailType) => void;
  onSendEmail: () => void;
  onSendApprovalEmail: () => void;
};

function DataList({
  items,
}: {
  items: Array<{ label: string; value: string; href?: string }>;
}) {
  return (
    <dl className="vendor-data-list">
      {items.map((item) => (
        <div key={item.label} className="vendor-data-list__row">
          <dt>{item.label}</dt>
          <dd>
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer" className="vendor-data-list__link">
                {item.value}
              </a>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function VendorDetailOverlay({
  open,
  loading,
  detail,
  statusDraft,
  statusPending,
  noteDraft,
  notePending,
  emailType,
  emailSendPending,
  approvalEmailSendPending,
  message,
  error,
  onClose,
  onStatusDraftChange,
  onStatusSave,
  onNoteDraftChange,
  onNoteSubmit,
  onEmailTypeChange,
  onSendEmail,
  onSendApprovalEmail,
}: VendorDetailOverlayProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const profile = detail?.profile;
  const approvalEmailActivity =
    detail?.adminActivity.find(
      (entry) => entry.activity_type === VENDOR_APPROVAL_EMAIL_ACTIVITY_TYPE,
    ) ?? null;
  const showApprovalEmailSection = profile
    ? isApprovedVendorStatus(profile.account_status)
    : false;

  return (
    <div className="vendor-overlay" role="presentation">
      <button
        type="button"
        className="vendor-overlay__backdrop"
        aria-label="Close vendor details"
        onClick={onClose}
      />

      <div
        className="vendor-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-overlay-title"
      >
        <header className="vendor-overlay__header">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
              Vendor details
            </p>
            <h2 id="vendor-overlay-title" className="mt-2 truncate text-2xl font-semibold text-white">
              {profile?.company_name ?? "Vendor account"}
            </h2>
            {profile ? (
              <p className="mt-2 text-sm text-slate-300">
                {[profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
                  profile.owner_name}{" "}
                · {profile.email}
              </p>
            ) : null}
          </div>
          <button type="button" className="admin-ghost-button" onClick={onClose}>
            Close
          </button>
        </header>

        {message ? (
          <div className="vendor-overlay__banner vendor-overlay__banner--success">{message}</div>
        ) : null}
        {error ? (
          <div className="vendor-overlay__banner vendor-overlay__banner--error">{error}</div>
        ) : null}

        <div className="vendor-overlay__body">
          {loading || !profile ? (
            <p className="text-sm leading-7 text-slate-300">Loading vendor details...</p>
          ) : (
            <div className="vendor-overlay__sections">
              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Account status</h3>
                <div className="vendor-overlay__status-row">
                  <select
                    value={statusDraft}
                    onChange={(event) => onStatusDraftChange(event.target.value)}
                    className="admin-input min-w-[14rem]"
                  >
                    {[...new Set([profile.account_status, ...adminVendorStatusOptions])].map(
                      (status) => (
                        <option key={status} value={status}>
                          {formatAdminVendorStatus(status)}
                        </option>
                      ),
                    )}
                  </select>
                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={onStatusSave}
                    disabled={statusPending}
                  >
                    {statusPending ? "Saving" : "Save status"}
                  </button>
                </div>
              </section>

              {showApprovalEmailSection ? (
                <section className="vendor-overlay__section">
                  <h3 className="vendor-overlay__section-title">Vendor approval email</h3>
                  {approvalEmailActivity ? (
                    <div className="vendor-overlay__banner vendor-overlay__banner--success">
                      Approval email sent on{" "}
                      {formatAdminDateTime(approvalEmailActivity.created_at)} by{" "}
                      {approvalEmailActivity.actor_email}. A duplicate email cannot be sent from
                      this panel.
                    </div>
                  ) : (
                    <p className="vendor-overlay__temp-note">
                      Sends a one-time approval email with the vendor&apos;s business profile and
                      badge URL. Use this after the account is marked approved.
                    </p>
                  )}
                  <div className="vendor-overlay__status-row">
                    <button
                      type="button"
                      className="admin-primary-button"
                      onClick={onSendApprovalEmail}
                      disabled={approvalEmailSendPending || Boolean(approvalEmailActivity)}
                    >
                      {approvalEmailSendPending
                        ? "Sending approval email"
                        : approvalEmailActivity
                          ? "Approval email already sent"
                          : "Send approval email"}
                    </button>
                  </div>
                  {profile.badge_url ? (
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      Badge URL on file:{" "}
                      <a
                        href={profile.badge_url}
                        target="_blank"
                        rel="noreferrer"
                        className="vendor-data-list__link break-all"
                      >
                        {profile.badge_url}
                      </a>
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section className="vendor-overlay__section vendor-overlay__section--temp">
                <h3 className="vendor-overlay__section-title">Temporary: send auth email</h3>
                <p className="vendor-overlay__temp-note">
                  Sends a real Supabase email to {profile.email} to test SMTP or
                  help a vendor who did not receive confirmation. Remove this section when SMTP is
                  stable.
                </p>
                <div className="vendor-overlay__status-row">
                  <select
                    value={emailType}
                    onChange={(event) =>
                      onEmailTypeChange(event.target.value as VendorAuthEmailType)
                    }
                    className="admin-input min-w-[14rem]"
                    disabled={emailSendPending}
                  >
                    <option value="recovery">Password reset email</option>
                    <option value="signup">Signup confirmation email</option>
                  </select>
                  <button
                    type="button"
                    className="admin-ghost-button"
                    onClick={onSendEmail}
                    disabled={emailSendPending}
                  >
                    {emailSendPending ? "Sending" : "Send email to vendor"}
                  </button>
                </div>
              </section>

              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Contact & company</h3>
                <DataList
                  items={[
                    { label: "Company", value: profile.company_name },
                    { label: "Owner", value: profile.owner_name },
                    {
                      label: "First name",
                      value: profile.first_name ?? "Not set",
                    },
                    { label: "Last name", value: profile.last_name ?? "Not set" },
                    { label: "Email", value: profile.email },
                    {
                      label: "Phone",
                      value: profile.phone_number ?? "Not set",
                    },
                    {
                      label: "Website",
                      value: profile.website_url ?? "Not set",
                      href: profile.website_url ?? undefined,
                    },
                    {
                      label: "Start date",
                      value: formatAdminDate(profile.start_date),
                    },
                    {
                      label: "Average rating",
                      value: profile.average_rating.toFixed(2),
                    },
                    {
                      label: "Review count",
                      value: String(profile.review_count),
                    },
                  ]}
                />
              </section>

              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Sales profile</h3>
                <DataList
                  items={[
                    {
                      label: "Sales locations",
                      value: formatAdminSalesProfileList(profile.sales_locations),
                    },
                    {
                      label: "Sales items",
                      value: formatAdminSalesProfileList(profile.sales_items),
                    },
                  ]}
                />
              </section>

              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Location</h3>
                <DataList
                  items={[
                    {
                      label: "Street address",
                      value: profile.street_address ?? profile.address ?? "Not set",
                    },
                    {
                      label: "Address line 2",
                      value: profile.address_line_2 ?? "Not set",
                    },
                    { label: "City", value: profile.city ?? "Not set" },
                    {
                      label: "State / Province",
                      value: profile.state_province ?? "Not set",
                    },
                    {
                      label: "ZIP / Postal code",
                      value: profile.postal_code ?? "Not set",
                    },
                    { label: "Country", value: profile.country ?? "Not set" },
                    {
                      label: "Full address",
                      value: formatAdminStructuredAddress(profile),
                    },
                  ]}
                />
              </section>

              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Statement agreements</h3>
                {detail.statementAgreements.length > 0 ? (
                  <DataList
                    items={detail.statementAgreements.map((agreement) => ({
                      label: agreement.agreement_title,
                      value: `Agreed ${formatAdminDateTime(agreement.agreed_at)} · v${agreement.statement_version}`,
                    }))}
                  />
                ) : (
                  <p className="text-sm leading-7 text-slate-300">
                    No statement agreements recorded yet.
                  </p>
                )}
              </section>

              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Social links</h3>
                {detail.socialLinks.length > 0 ? (
                  <DataList
                    items={detail.socialLinks.map((link) => ({
                      label: link.platform,
                      value: link.url,
                      href: link.url,
                    }))}
                  />
                ) : (
                  <p className="text-sm leading-7 text-slate-300">No social links saved.</p>
                )}
              </section>

              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Admin history</h3>
                {detail.adminActivity.length > 0 ? (
                  <ul className="vendor-history-list">
                    {detail.adminActivity.map((entry) => (
                      <li key={entry.id} className="vendor-history-list__item">
                        <div className="vendor-history-list__meta">
                          <span className="vendor-history-list__type">
                            {formatAdminActivityType(entry.activity_type)}
                          </span>
                          <time dateTime={entry.created_at}>
                            {formatAdminDateTime(entry.created_at)}
                          </time>
                        </div>
                        <p className="vendor-history-list__summary">{entry.summary}</p>
                        <p className="vendor-history-list__actor">{entry.actor_email}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-7 text-slate-300">
                    No admin actions recorded yet. Status changes and notes will appear here.
                  </p>
                )}
              </section>

              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Internal notes</h3>
                {detail.notes.length > 0 ? (
                  <ul className="vendor-history-list">
                    {detail.notes.map((note) => (
                      <li key={note.id} className="vendor-history-list__item">
                        <div className="vendor-history-list__meta">
                          <span className="vendor-history-list__type">Note</span>
                          <time dateTime={note.created_at}>
                            {formatAdminDateTime(note.created_at)}
                          </time>
                        </div>
                        <p className="vendor-history-list__summary">{note.note_body}</p>
                        <p className="vendor-history-list__actor">{note.author_email}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-7 text-slate-300">No internal notes yet.</p>
                )}

                <div className="vendor-overlay__note-form">
                  <textarea
                    value={noteDraft}
                    onChange={(event) => onNoteDraftChange(event.target.value)}
                    rows={4}
                    className="admin-input min-h-[110px]"
                    placeholder="Leave an internal note for other admins."
                  />
                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={onNoteSubmit}
                    disabled={notePending}
                  >
                    {notePending ? "Saving note" : "Save note"}
                  </button>
                </div>
              </section>

              <section className="vendor-overlay__section">
                <h3 className="vendor-overlay__section-title">Reviews & disputes</h3>
                {detail.reviews.length > 0 ? (
                  <ul className="vendor-history-list">
                    {detail.reviews.map((review) => {
                      const reviewDisputes = detail.disputes.filter(
                        (dispute) => dispute.review_id === review.id,
                      );

                      return (
                        <li key={review.id} className="vendor-history-list__item">
                          <div className="vendor-history-list__meta">
                            <span className="vendor-history-list__type">
                              Review · {review.rating}/5
                            </span>
                            <time dateTime={review.published_at}>
                              {formatAdminDateTime(review.published_at)}
                            </time>
                          </div>
                          <p className="vendor-history-list__summary">
                            {review.title ?? "Community review"} — {review.reviewer_name}
                          </p>
                          <p className="vendor-history-list__actor">
                            {review.body ?? "No review body provided."}
                          </p>
                          {reviewDisputes.length > 0 ? (
                            <ul className="vendor-history-list vendor-history-list--nested">
                              {reviewDisputes.map((dispute) => (
                                <li key={dispute.id} className="vendor-history-list__item">
                                  <div className="vendor-history-list__meta">
                                    <span className="vendor-history-list__type">
                                      Dispute · {formatAdminVendorStatus(dispute.dispute_status)}
                                    </span>
                                    <time dateTime={dispute.created_at}>
                                      {formatAdminDateTime(dispute.created_at)}
                                    </time>
                                  </div>
                                  <p className="vendor-history-list__summary">{dispute.subject}</p>
                                  <p className="vendor-history-list__actor">{dispute.detail}</p>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm leading-7 text-slate-300">No reviews yet.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
