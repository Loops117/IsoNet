"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  buildAuthorLabel,
  canPostInForumCategory,
  formatForumDate,
  getForumErrorMessage,
  type ForumAuthor,
  type ForumCategory,
  type ForumPostAudience,
  type ForumReply,
  type ForumThread,
  type ForumViewAudience,
} from "../../lib/forum";
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "../../lib/supabase";

type ForumThreadViewProps = {
  threadId: string;
};

function normalizeCategory(row: Record<string, unknown> | null): ForumCategory | null {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_visible: Boolean(row.is_visible ?? true),
    view_audience: String(row.view_audience ?? "public") as ForumViewAudience,
    post_audience: String(row.post_audience ?? "vendor") as ForumPostAudience,
  };
}

function normalizeThread(
  row: Record<string, unknown>,
  author: ForumAuthor | null,
  category: ForumCategory | null,
): ForumThread {
  return {
    id: String(row.id ?? ""),
    category_id: String(row.category_id ?? ""),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    author_user_id: String(row.author_user_id ?? ""),
    reply_count: 0,
    author,
    category,
  };
}

function normalizeReply(row: Record<string, unknown>, author: ForumAuthor | null): ForumReply {
  return {
    id: String(row.id ?? ""),
    thread_id: String(row.thread_id ?? ""),
    body: String(row.body ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    author_user_id: String(row.author_user_id ?? ""),
    author,
  };
}

async function loadAuthors(
  supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  userIds: string[],
) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  if (!uniqueIds.length) {
    return new Map<string, ForumAuthor>();
  }

  const { data, error } = await supabase
    .from("vendor_profiles")
    .select("user_id, company_name, owner_name")
    .in("user_id", uniqueIds);

  if (error) {
    throw error;
  }

  const authors = new Map<string, ForumAuthor>();

  for (const row of data ?? []) {
    authors.set(String(row.user_id), {
      user_id: String(row.user_id),
      company_name: String(row.company_name ?? ""),
      owner_name: String(row.owner_name ?? ""),
    });
  }

  return authors;
}

export function ForumThreadView({ threadId }: ForumThreadViewProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase));
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false);
      return;
    }

    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setCurrentUser(data.user ?? null);
        setSessionLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      setSessionLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !currentUser) {
      setIsVendor(false);
      return;
    }

    let cancelled = false;

    void supabase
      .from("vendor_profiles")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .maybeSingle()
      .then(({ data, error: profileError }) => {
        if (cancelled) {
          return;
        }

        if (profileError) {
          setIsVendor(false);
          return;
        }

        setIsVendor(Boolean(data?.user_id));
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, supabase]);

  const loadThread = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setError("Forum is not configured.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: threadRow, error: threadError } = await supabase
        .from("forum_threads")
        .select(
          "id, category_id, author_user_id, title, body, created_at, updated_at, forum_categories(id, title, description, sort_order, is_visible, view_audience, post_audience)",
        )
        .eq("id", threadId)
        .maybeSingle();

      if (threadError) {
        throw threadError;
      }

      if (!threadRow) {
        setThread(null);
        setReplies([]);
        return;
      }

      const { data: replyRows, error: replyError } = await supabase
        .from("forum_replies")
        .select("id, thread_id, author_user_id, body, created_at, updated_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (replyError) {
        throw replyError;
      }

      const authorIds = [
        String(threadRow.author_user_id ?? ""),
        ...(replyRows ?? []).map((row) => String(row.author_user_id ?? "")),
      ];
      const authors = await loadAuthors(supabase, authorIds);
      const threadAuthor = authors.get(String(threadRow.author_user_id ?? "")) ?? null;
      const embeddedCategory = threadRow.forum_categories;

      const category = Array.isArray(embeddedCategory)
        ? normalizeCategory((embeddedCategory[0] as Record<string, unknown>) ?? null)
        : normalizeCategory((embeddedCategory as Record<string, unknown>) ?? null);

      const nextThread = normalizeThread(
        threadRow as Record<string, unknown>,
        threadAuthor,
        category,
      );
      nextThread.reply_count = replyRows?.length ?? 0;

      const nextReplies = (replyRows ?? []).map((row) =>
        normalizeReply(
          row as Record<string, unknown>,
          authors.get(String(row.author_user_id ?? "")) ?? null,
        ),
      );

      setThread(nextThread);
      setReplies(nextReplies);
    } catch (loadError) {
      setError(getForumErrorMessage(loadError, "Could not load this thread."));
      setThread(null);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, threadId]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (loading || !replies.length) {
      return;
    }

    const hash = window.location.hash;

    if (!hash.startsWith("#reply-")) {
      return;
    }

    const target = document.querySelector(hash);

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, replies]);

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !currentUser || !thread?.category) {
      return;
    }

    if (
      !canPostInForumCategory(thread.category, {
        isSignedIn: true,
        isVendor,
      })
    ) {
      setError("You do not have permission to reply in this category.");
      return;
    }

    const body = replyBody.trim();

    if (!body) {
      setError("Reply cannot be empty.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("forum_replies").insert({
        thread_id: thread.id,
        author_user_id: currentUser.id,
        body,
      });

      if (insertError) {
        throw insertError;
      }

      setReplyBody("");
      await loadThread();
    } catch (replyError) {
      setError(getForumErrorMessage(replyError, "Could not post your reply."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasSupabaseBrowserEnv() || !supabase) {
    return (
      <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
        <div className="isonet-panel w-full max-w-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-white">Forum unavailable</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <div>
          <Link href="/forum" className="isonet-link text-sm font-semibold">
            ← All threads
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading thread…</p>
        ) : !thread ? (
          <article className="isonet-panel p-6 sm:p-8">
            <h1 className="text-2xl font-semibold text-white">Thread not found</h1>
            <p className="mt-3 text-sm text-slate-300">
              This discussion may have been removed or the link is incorrect.
            </p>
          </article>
        ) : (
          <>
            <article className="isonet-panel p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                {thread.category?.title ?? "Discussion"}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{thread.title}</h1>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-slate-200">
                {thread.body}
              </p>
              <p className="mt-6 text-xs text-slate-500">
                {buildAuthorLabel(thread.author)} · {formatForumDate(thread.created_at)}
              </p>
            </article>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                {replies.length === 1 ? "1 reply" : `${replies.length} replies`}
              </h2>
              {replies.length === 0 ? (
                <p className="text-sm text-slate-400">No replies yet.</p>
              ) : (
                <ul className="space-y-4">
                  {replies.map((reply) => (
                    <li key={reply.id} id={`reply-${reply.id}`}>
                      <article className="isonet-panel scroll-mt-24 p-5 sm:p-6">
                        <p className="whitespace-pre-wrap text-sm leading-8 text-slate-200">
                          {reply.body}
                        </p>
                        <p className="mt-4 text-xs text-slate-500">
                          {buildAuthorLabel(reply.author)} · {formatForumDate(reply.created_at)}
                        </p>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {!sessionLoading &&
              thread.category &&
              canPostInForumCategory(thread.category, {
                isSignedIn: Boolean(currentUser),
                isVendor,
              }) && (
              <section className="isonet-panel p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-white">
                  {isVendor ? "Reply as vendor" : "Post a reply"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Mention another vendor with <span className="text-slate-200">@CompanyName</span> in
                  your message.
                </p>
                <form className="mt-5 space-y-4" onSubmit={handleReply}>
                  <textarea
                    className="min-h-32 w-full rounded-sm border border-white/12 bg-black/30 px-3 py-2 text-white"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder="Share your perspective…"
                    required
                  />
                  <button type="submit" className="isonet-button" disabled={submitting}>
                    {submitting ? "Posting…" : "Post reply"}
                  </button>
                </form>
              </section>
            )}

            {!sessionLoading &&
              !(
                thread.category &&
                canPostInForumCategory(thread.category, {
                  isSignedIn: Boolean(currentUser),
                  isVendor,
                })
              ) && (
              <section className="isonet-panel p-5 sm:p-6">
                <p className="text-sm leading-7 text-slate-300">
                  {currentUser ? (
                    <>
                      You cannot post in this category with your current account. Vendor-only areas
                      need a{" "}
                      <Link href="/vendor" className="isonet-link font-semibold">
                        vendor account
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      <Link href="/vendor" className="isonet-link font-semibold">
                        Sign in
                      </Link>{" "}
                      to join the discussion where posting is open to members.
                    </>
                  )}
                </p>
              </section>
            )}
          </>
        )}

        {error && (
          <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
