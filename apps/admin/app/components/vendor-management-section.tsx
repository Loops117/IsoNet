"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

import {
  VendorDetailOverlay,
  type VendorAuthEmailType,
} from "./vendor-detail-overlay";
import { VendorManagementTable } from "./vendor-management-table";
import type { AdminVendorDetail, AdminVendorSummary } from "../../lib/vendor-management";

type VendorStats = {
  total: number;
  pendingApproval: number;
  approved: number;
  inGoodStanding: number;
  openDisputes: number;
};

const defaultStats: VendorStats = {
  total: 0,
  pendingApproval: 0,
  approved: 0,
  inGoodStanding: 0,
  openDisputes: 0,
};

export function VendorManagementSection() {
  const [vendorSummaries, setVendorSummaries] = useState<AdminVendorSummary[]>([]);
  const [vendorStats, setVendorStats] = useState<VendorStats>(defaultStats);
  const [vendorListLoading, setVendorListLoading] = useState(false);
  const [vendorListError, setVendorListError] = useState<string | null>(null);

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [vendorDetail, setVendorDetail] = useState<AdminVendorDetail | null>(null);
  const [vendorDetailLoading, setVendorDetailLoading] = useState(false);
  const [vendorDetailError, setVendorDetailError] = useState<string | null>(null);
  const [vendorStatusDraft, setVendorStatusDraft] = useState("");
  const [vendorStatusPending, setVendorStatusPending] = useState(false);
  const [vendorStatusMessage, setVendorStatusMessage] = useState<string | null>(null);
  const [vendorNoteDraft, setVendorNoteDraft] = useState("");
  const [vendorNotePending, setVendorNotePending] = useState(false);
  const [vendorEmailType, setVendorEmailType] = useState<VendorAuthEmailType>("recovery");
  const [vendorEmailSendPending, setVendorEmailSendPending] = useState(false);

  const loadVendorSummaries = useCallback(async () => {
    setVendorListLoading(true);
    setVendorListError(null);

    const response = await fetch("/api/admin/vendors");
    const body = (await response.json().catch(() => null)) as
      | {
          error?: string;
          vendors?: AdminVendorSummary[];
          stats?: VendorStats;
        }
      | null;

    if (!response.ok) {
      setVendorListError(body?.error ?? "Unable to load vendors.");
      setVendorListLoading(false);
      return;
    }

    const vendors = body?.vendors ?? [];
    setVendorSummaries(vendors);
    setVendorStats(body?.stats ?? defaultStats);
    setVendorListLoading(false);
  }, []);

  const loadVendorDetail = useCallback(async (vendorId: string) => {
    setVendorDetailLoading(true);
    setVendorDetailError(null);
    setVendorStatusMessage(null);

    const response = await fetch(`/api/admin/vendors/${vendorId}`);
    const body = (await response.json().catch(() => null)) as
      | ({ error?: string } & Partial<AdminVendorDetail>)
      | null;

    if (!response.ok) {
      setVendorDetailError(body?.error ?? "Unable to load vendor details.");
      setVendorDetail(null);
      setVendorDetailLoading(false);
      return;
    }

    const detail: AdminVendorDetail = {
      profile: body?.profile ?? null,
      socialLinks: body?.socialLinks ?? [],
      subscription: body?.subscription ?? null,
      notes: body?.notes ?? [],
      reviews: body?.reviews ?? [],
      disputes: body?.disputes ?? [],
      statementAgreements: body?.statementAgreements ?? [],
      adminActivity: body?.adminActivity ?? [],
    };

    setVendorDetail(detail);
    setVendorStatusDraft(detail.profile?.account_status ?? "");
    setVendorDetailLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadVendorSummaries();
    });
  }, [loadVendorSummaries]);

  function openVendorDetail(vendorId: string) {
    setSelectedVendorId(vendorId);
    setDetailOpen(true);
    void loadVendorDetail(vendorId);
  }

  function closeVendorDetail() {
    setDetailOpen(false);
    setSelectedVendorId(null);
    setVendorDetail(null);
    setVendorDetailError(null);
    setVendorStatusMessage(null);
    setVendorNoteDraft("");
    setVendorEmailType("recovery");
  }

  async function handleVendorSendEmail() {
    if (!selectedVendorId) {
      return;
    }

    setVendorEmailSendPending(true);
    setVendorDetailError(null);
    setVendorStatusMessage(null);

    const response = await fetch(
      `/api/admin/vendors/${selectedVendorId}/send-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType: vendorEmailType }),
      },
    );
    const body = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      setVendorDetailError(body?.error ?? "Unable to send that email.");
      setVendorEmailSendPending(false);
      return;
    }

    setVendorStatusMessage(body?.message ?? "Email send requested.");
    setVendorEmailSendPending(false);
    await loadVendorDetail(selectedVendorId);
  }

  async function handleVendorStatusSave() {
    if (!selectedVendorId || !vendorStatusDraft) {
      return;
    }

    setVendorStatusPending(true);
    setVendorDetailError(null);
    setVendorStatusMessage(null);

    const response = await fetch(`/api/admin/vendors/${selectedVendorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountStatus: vendorStatusDraft }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setVendorDetailError(body?.error ?? "Unable to update vendor status.");
      setVendorStatusPending(false);
      return;
    }

    setVendorStatusMessage("Vendor account status updated.");
    setVendorStatusPending(false);
    await loadVendorSummaries();
    await loadVendorDetail(selectedVendorId);
  }

  async function handleVendorNoteSubmit() {
    if (!selectedVendorId || !vendorNoteDraft.trim()) {
      return;
    }

    setVendorNotePending(true);
    setVendorDetailError(null);
    setVendorStatusMessage(null);

    const response = await fetch(`/api/admin/vendors/${selectedVendorId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteBody: vendorNoteDraft }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setVendorDetailError(body?.error ?? "Unable to save that admin note.");
      setVendorNotePending(false);
      return;
    }

    setVendorNoteDraft("");
    setVendorStatusMessage("Admin note saved.");
    setVendorNotePending(false);
    await loadVendorSummaries();
    await loadVendorDetail(selectedVendorId);
  }

  const metrics = [
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

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
          Vendors
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Vendor approvals and account oversight
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-300">
          Search and filter vendor accounts, update standing, and review onboarding
          details without leaving the dashboard.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
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
            <p className="mt-2 text-sm leading-6 text-slate-300">{metric.note}</p>
          </article>
        ))}
      </section>

      {vendorListError ? (
        <div className="rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-4 text-sm leading-7 text-rose-100">
          {vendorListError}
        </div>
      ) : null}

      <VendorManagementTable
        vendors={vendorSummaries}
        loading={vendorListLoading}
        onSelectVendor={openVendorDetail}
      />

      <VendorDetailOverlay
        open={detailOpen}
        loading={vendorDetailLoading}
        detail={vendorDetail}
        statusDraft={vendorStatusDraft}
        statusPending={vendorStatusPending}
        noteDraft={vendorNoteDraft}
        notePending={vendorNotePending}
        emailType={vendorEmailType}
        emailSendPending={vendorEmailSendPending}
        message={vendorStatusMessage}
        error={vendorDetailError}
        onClose={closeVendorDetail}
        onStatusDraftChange={setVendorStatusDraft}
        onStatusSave={handleVendorStatusSave}
        onNoteDraftChange={setVendorNoteDraft}
        onNoteSubmit={handleVendorNoteSubmit}
        onEmailTypeChange={setVendorEmailType}
        onSendEmail={handleVendorSendEmail}
      />
    </div>
  );
}
