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
  type ForumThreadSummary,
  type ForumViewAudience,
} from "../../lib/forum";
import { facebookGroupUrl } from "../../lib/site-nav";
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "../../lib/supabase";

type ForumBoardProps = {
  initialCategoryId?: string | null;
};

function normalizeCategory(row: Record<string, unknown>): ForumCategory {
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
  authors: Map<string, ForumAuthor>,
): ForumThreadSummary {
  const embeddedReplies = row.forum_replies;
  let replyCount = 0;

  if (Array.isArray(embeddedReplies) && embeddedReplies[0] && typeof embeddedReplies[0] === "object") {
    const countValue = (embeddedReplies[0] as { count?: number }).count;
    replyCount = typeof countValue === "number" ? countValue : 0;
  }

  const authorUserId = String(row.author_user_id ?? "");

  return {
    id: String(row.id ?? ""),
    category_id: String(row.category_id ?? ""),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    author_user_id: authorUserId,
    reply_count: replyCount,
    author: authors.get(authorUserId) ?? null,
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

export function ForumBoard({ initialCategoryId = null }: ForumBoardProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase));
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [threads, setThreads] = useState<ForumThreadSummary[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("general");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActiveCategoryId(initialCategoryId ?? null);
  }, [initialCategoryId]);

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

  const loadForum = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setError("Forum is not configured. Add Supabase environment variables.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: categoryRows, error: categoryError } = await supabase
        .from("forum_categories")
        .select("id, title, description, sort_order, is_visible, view_audience, post_audience")
        .order("sort_order", { ascending: true });

      if (categoryError) {
        throw categoryError;
      }

      const nextCategories = (categoryRows ?? []).map((row) =>
        normalizeCategory(row as Record<string, unknown>),
      );
      setCategories(nextCategories);

      let threadQuery = supabase
        .from("forum_threads")
        .select("id, category_id, author_user_id, title, body, created_at, updated_at, forum_replies(count)")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (activeCategoryId) {
        threadQuery = threadQuery.eq("category_id", activeCategoryId);
      }

      const { data: threadRows, error: threadError } = await threadQuery;

      if (threadError) {
        throw threadError;
      }

      const authorIds = (threadRows ?? []).map((row) => String(row.author_user_id ?? ""));
      const authors = await loadAuthors(supabase, authorIds);
      const nextThreads = (threadRows ?? []).map((row) =>
        normalizeThread(row as Record<string, unknown>, authors),
      );

      setThreads(nextThreads);

      if (nextCategories.length && !nextCategories.some((item) => item.id === newCategoryId)) {
        setNewCategoryId(nextCategories[0].id);
      }
    } catch (loadError) {
      setError(getForumErrorMessage(loadError, "Could not load the forum."));
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategoryId, newCategoryId, supabase]);

  useEffect(() => {
    void loadForum();
  }, [loadForum]);

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !currentUser) {
      return;
    }

    const selectedCategory = categories.find((item) => item.id === newCategoryId);

    if (
      !selectedCategory ||
      !canPostInForumCategory(selectedCategory, {
        isSignedIn: true,
        isVendor,
      })
    ) {
      setError("You do not have permission to post in that category.");
      return;
    }

    const title = newTitle.trim();
    const body = newBody.trim();

    if (!title || !body) {
      setError("Title and message are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("forum_threads")
        .insert({
          category_id: newCategoryId,
          author_user_id: currentUser.id,
          title,
          body,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      setNewTitle("");
      setNewBody("");
      setShowNewThread(false);
      window.location.href = `/forum/${data.id}`;
    } catch (createError) {
      setError(getForumErrorMessage(createError, "Could not create the thread."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasSupabaseBrowserEnv() || !supabase) {
    return (
      <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
        <div className="isonet-panel w-full max-w-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-white">Forum unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Supabase is not configured for this environment.
          </p>
        </div>
      </main>
    );
  }

  const categoryHref = (categoryId: string | null) =>
    categoryId ? `/forum?category=${encodeURIComponent(categoryId)}` : "/forum";

  const accessOptions = { isSignedIn: Boolean(currentUser), isVendor };
  const postableCategories = categories.filter((category) =>
    canPostInForumCategory(category, accessOptions),
  );
  const canCreateThread = Boolean(currentUser) && postableCategories.length > 0;

  return (
    <main className="flex flex-1 justify-center px-5 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <header className="isonet-panel p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            IsoNet forum
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Community discussion
          </h1>
          <p className="mt-5 text-sm leading-8 text-slate-300 sm:text-base">
            Read threads from the invert community. Some categories are open to everyone; others
            require signing in or a vendor account to view or post.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/" className="isonet-link text-sm font-semibold">
              ← Back to home
            </Link>
            <a
              href={facebookGroupUrl}
              className="isonet-link text-sm font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook group →
            </a>
          </div>
        </header>

        {!sessionLoading && (
          <section className="isonet-panel p-5 sm:p-6">
            {canCreateThread ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-300">
                  {isVendor
                    ? "You can post in categories available to vendors and signed-in members."
                    : "You are signed in and can post in community categories open to members."}
                </p>
                <button
                  type="button"
                  className="isonet-button"
                  onClick={() => setShowNewThread((value) => !value)}
                >
                  {showNewThread ? "Cancel" : "New thread"}
                </button>
              </div>
            ) : currentUser ? (
              <p className="text-sm leading-7 text-slate-300">
                You are signed in, but no categories currently allow you to post. Vendor-only areas
                require a{" "}
                <Link href="/vendor" className="isonet-link font-semibold">
                  vendor account
                </Link>
                .
              </p>
            ) : (
              <p className="text-sm leading-7 text-slate-300">
                Sign in to post in member categories, or use the{" "}
                <Link href="/vendor" className="isonet-link font-semibold">
                  vendor portal
                </Link>{" "}
                for vendor-only discussions.
              </p>
            )}
          </section>
        )}

        {showNewThread && canCreateThread && (
          <section className="isonet-panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white">Start a thread</h2>
            <form className="mt-6 space-y-5" onSubmit={handleCreateThread}>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block font-semibold text-white">Category</span>
                <select
                  className="w-full rounded-sm border border-white/12 bg-black/30 px-3 py-2 text-white"
                  value={newCategoryId}
                  onChange={(event) => setNewCategoryId(event.target.value)}
                  required
                >
                  {postableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block font-semibold text-white">Title</span>
                <input
                  className="w-full rounded-sm border border-white/12 bg-black/30 px-3 py-2 text-white"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  maxLength={200}
                  required
                />
              </label>
              <p className="text-sm leading-7 text-slate-400">
                Mention another vendor with <span className="text-slate-200">@CompanyName</span> in
                your post.
              </p>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block font-semibold text-white">Message</span>
                <textarea
                  className="min-h-36 w-full rounded-sm border border-white/12 bg-black/30 px-3 py-2 text-white"
                  value={newBody}
                  onChange={(event) => setNewBody(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="isonet-button" disabled={submitting}>
                {submitting ? "Posting…" : "Post thread"}
              </button>
            </form>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={categoryHref(null)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                activeCategoryId
                  ? "border-white/12 text-slate-400 hover:text-white"
                  : "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
              }`}
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={categoryHref(category.id)}
                className={`rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                  activeCategoryId === category.id
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-white/12 text-slate-400 hover:text-white"
                }`}
              >
                {category.title}
              </Link>
            ))}
          </div>

          {error && (
            <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">Loading threads…</p>
          ) : threads.length === 0 ? (
            <article className="isonet-panel p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-white">No threads yet</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {canCreateThread
                  ? "Be the first to start a conversation in this category."
                  : "Check back soon—or join the Facebook group while discussions get started here."}
              </p>
            </article>
          ) : (
            <ul className="space-y-4">
              {threads.map((thread) => {
                const category = categories.find((item) => item.id === thread.category_id);

                return (
                  <li key={thread.id}>
                    <Link href={`/forum/${thread.id}`} className="block">
                      <article className="isonet-panel p-5 transition hover:border-white/20 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h2 className="text-lg font-semibold tracking-tight text-white">
                            {thread.title}
                          </h2>
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            {thread.reply_count === 1 ? "1 reply" : `${thread.reply_count} replies`}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-300">
                          {thread.body}
                        </p>
                        <p className="mt-4 text-xs text-slate-500">
                          {buildAuthorLabel(thread.author)} · {category?.title ?? "General"} ·{" "}
                          {formatForumDate(thread.updated_at)}
                        </p>
                      </article>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Categories
          </p>
          <ul className="space-y-4">
            {categories.map((category) => (
              <li key={category.id}>
                <article className="isonet-panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      {category.title}
                    </h3>
                    <Link
                      href={categoryHref(category.id)}
                      className="isonet-link text-xs font-semibold uppercase tracking-[0.16em]"
                    >
                      View threads
                    </Link>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{category.description}</p>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
