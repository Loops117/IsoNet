"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildForumActorLabel,
  formatForumNotificationMessage,
  getForumNotificationErrorMessage,
  type ForumNotification,
} from "../../lib/forum-notifications";
import { formatForumDate } from "../../lib/forum";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type VendorForumActivitySummaryProps = {
  userId: string;
  onUnreadCountChange?: (count: number) => void;
  onViewAll: () => void;
};

function normalizeNotification(row: Record<string, unknown>): ForumNotification {
  return {
    id: String(row.id ?? ""),
    recipient_user_id: String(row.recipient_user_id ?? ""),
    actor_user_id: String(row.actor_user_id ?? ""),
    thread_id: String(row.thread_id ?? ""),
    reply_id: row.reply_id ? String(row.reply_id) : null,
    kind: String(row.kind ?? "participated_reply") as ForumNotification["kind"],
    thread_title: String(row.thread_title ?? ""),
    preview: String(row.preview ?? ""),
    created_at: String(row.created_at ?? ""),
    read_at: row.read_at ? String(row.read_at) : null,
    actor: null,
  };
}

export function VendorForumActivitySummary({
  userId,
  onUnreadCountChange,
  onViewAll,
}: VendorForumActivitySummaryProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [preview, setPreview] = useState<ForumNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { count, error: countError } = await supabase
        .from("forum_notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", userId)
        .is("read_at", null);

      if (countError) {
        throw countError;
      }

      const nextUnread = count ?? 0;
      setUnreadCount(nextUnread);
      onUnreadCountChange?.(nextUnread);

      const { data, error: queryError } = await supabase
        .from("forum_notifications")
        .select(
          "id, recipient_user_id, actor_user_id, thread_id, reply_id, kind, thread_title, preview, created_at, read_at",
        )
        .eq("recipient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (queryError) {
        throw queryError;
      }

      const rows = (data ?? []).map((row) =>
        normalizeNotification(row as Record<string, unknown>),
      );
      const actorIds = [...new Set(rows.map((row) => row.actor_user_id))];
      const { data: actors } = await supabase
        .from("vendor_profiles")
        .select("user_id, company_name, owner_name")
        .in("user_id", actorIds);

      const actorMap = new Map(
        (actors ?? []).map((actor) => [
          String(actor.user_id),
          {
            company_name: String(actor.company_name ?? ""),
            owner_name: String(actor.owner_name ?? ""),
          },
        ]),
      );

      setPreview(
        rows.map((row) => ({
          ...row,
          actor: actorMap.get(row.actor_user_id) ?? null,
        })),
      );
    } catch (loadError) {
      setError(getForumNotificationErrorMessage(loadError, "Could not load forum activity."));
      setPreview([]);
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange, supabase, userId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-slate-300">
        {unreadCount > 0
          ? `You have ${unreadCount} unread forum notification${unreadCount === 1 ? "" : "s"}.`
          : "No unread forum notifications right now."}
      </p>

      {error ? (
        <p className="text-sm text-red-200">{error}</p>
      ) : loading ? (
        <p className="text-sm text-slate-400">Checking forum activity…</p>
      ) : preview.length > 0 ? (
        <ul className="space-y-2">
          {preview.map((notification) => (
            <li
              key={notification.id}
              className="rounded-sm border border-white/10 bg-white/4 px-3 py-2 text-sm leading-6 text-slate-300"
            >
              <span
                className={
                  notification.read_at ? "text-slate-400" : "font-semibold text-slate-100"
                }
              >
                {formatForumNotificationMessage(
                  notification,
                  buildForumActorLabel(notification.actor),
                )}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {formatForumDate(notification.created_at)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-7 text-slate-400">
          Replies on your threads, discussions you joined, and @mentions will appear here.
        </p>
      )}

      <button type="button" className="isonet-button-secondary text-xs" onClick={onViewAll}>
        View all forum activity
      </button>
    </div>
  );
}
