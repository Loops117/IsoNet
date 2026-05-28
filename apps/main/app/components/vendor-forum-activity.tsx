"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatForumDate } from "../../lib/forum";
import {
  buildForumActorLabel,
  formatForumNotificationKind,
  formatForumNotificationMessage,
  getForumNotificationErrorMessage,
  type ForumNotification,
} from "../../lib/forum-notifications";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type VendorForumActivityProps = {
  userId: string;
  onUnreadCountChange?: (count: number) => void;
};

function normalizeNotification(row: Record<string, unknown>): ForumNotification {
  const actorRow = row.actor;

  let actor: ForumNotification["actor"] = null;

  if (actorRow && typeof actorRow === "object" && !Array.isArray(actorRow)) {
    actor = {
      company_name: String((actorRow as Record<string, unknown>).company_name ?? ""),
      owner_name: String((actorRow as Record<string, unknown>).owner_name ?? ""),
    };
  } else if (Array.isArray(actorRow) && actorRow[0]) {
    actor = {
      company_name: String((actorRow[0] as Record<string, unknown>).company_name ?? ""),
      owner_name: String((actorRow[0] as Record<string, unknown>).owner_name ?? ""),
    };
  }

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
    actor,
  };
}

function buildThreadHref(notification: ForumNotification) {
  const anchor = notification.reply_id ? `#reply-${notification.reply_id}` : "";
  return `/forum/${notification.thread_id}${anchor}`;
}

export function VendorForumActivity({ userId, onUnreadCountChange }: VendorForumActivityProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  const loadNotifications = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setError("Forum notifications are not configured.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("forum_notifications")
        .select(
          "id, recipient_user_id, actor_user_id, thread_id, reply_id, kind, thread_title, preview, created_at, read_at",
        )
        .eq("recipient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40);

      if (queryError) {
        throw queryError;
      }

      const actorIds = [...new Set((data ?? []).map((row) => String(row.actor_user_id)))];
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

      setNotifications(
        (data ?? []).map((row) => {
          const notification = normalizeNotification(row as Record<string, unknown>);
          notification.actor = actorMap.get(notification.actor_user_id) ?? null;
          return notification;
        }),
      );
    } catch (loadError) {
      setError(getForumNotificationErrorMessage(loadError, "Could not load forum activity."));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function markNotificationRead(notification: ForumNotification) {
    if (!supabase || notification.read_at) {
      return;
    }

    setPendingId(notification.id);

    try {
      const { error: updateError } = await supabase
        .from("forum_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification.id)
        .eq("recipient_user_id", userId);

      if (updateError) {
        throw updateError;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
    } catch (markError) {
      setError(getForumNotificationErrorMessage(markError, "Could not update notification."));
    } finally {
      setPendingId(null);
    }
  }

  async function markAllRead() {
    if (!supabase || unreadCount === 0) {
      return;
    }

    setPendingId("all");

    try {
      const readAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("forum_notifications")
        .update({ read_at: readAt })
        .eq("recipient_user_id", userId)
        .is("read_at", null);

      if (updateError) {
        throw updateError;
      }

      setNotifications((current) => current.map((item) => ({ ...item, read_at: readAt })));
    } catch (markError) {
      setError(getForumNotificationErrorMessage(markError, "Could not mark notifications read."));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
            Forum activity
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Replies on your threads, threads you joined, and @mentions of your vendor name appear
            here. Mention another vendor with <span className="text-white">@CompanyName</span> in a
            post.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/forum" className="isonet-button-secondary inline-flex text-xs">
            Open forum
          </Link>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="isonet-button-secondary text-xs"
              onClick={() => void markAllRead()}
              disabled={pendingId === "all"}
            >
              {pendingId === "all" ? "Updating…" : `Mark ${unreadCount} read`}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading forum activity…</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-sm border border-white/10 bg-white/4 p-4 text-sm leading-7 text-slate-300">
          No forum notifications yet. When someone replies to your thread, responds in a discussion
          you joined, or @mentions your vendor name, it will show up here.
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const actorLabel = buildForumActorLabel(notification.actor);
            const isUnread = !notification.read_at;

            return (
              <li key={notification.id}>
                <article
                  className={[
                    "rounded-sm border p-4 transition",
                    isUnread
                      ? "border-[var(--accent)]/35 bg-[var(--accent)]/8"
                      : "border-white/10 bg-white/4",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                      {formatForumNotificationKind(notification.kind)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatForumDate(notification.created_at)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-100">
                    {formatForumNotificationMessage(notification, actorLabel)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                    {notification.preview}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={buildThreadHref(notification)}
                      className="isonet-button inline-flex text-xs"
                      onClick={() => void markNotificationRead(notification)}
                    >
                      View thread
                    </Link>
                    {isUnread ? (
                      <button
                        type="button"
                        className="isonet-button-secondary text-xs"
                        disabled={pendingId === notification.id}
                        onClick={() => void markNotificationRead(notification)}
                      >
                        {pendingId === notification.id ? "Saving…" : "Mark read"}
                      </button>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
