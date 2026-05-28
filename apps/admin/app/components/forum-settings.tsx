"use client";

import { useEffect, useState } from "react";

import {
  type ForumCategorySettings,
  type ForumPostAudience,
  type ForumViewAudience,
  formatForumPostAudience,
  formatForumViewAudience,
  forumPostAudienceOptions,
  forumViewAudienceOptions,
} from "../../lib/forum-settings";

type CategoryDraft = {
  is_visible: boolean;
  view_audience: ForumViewAudience;
  post_audience: ForumPostAudience;
};

export function ForumSettings() {
  const [categories, setCategories] = useState<ForumCategorySettings[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CategoryDraft>>({});
  const [loadPending, setLoadPending] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadCategories() {
    setLoadPending(true);
    setError(null);

    const response = await fetch("/api/admin/settings/forum");
    const body = (await response.json().catch(() => null)) as
      | { error?: string; categories?: ForumCategorySettings[] }
      | null;

    if (!response.ok) {
      setError(body?.error ?? "Unable to load forum settings.");
      setLoadPending(false);
      return;
    }

    const nextCategories = body?.categories ?? [];
    setCategories(nextCategories);
    setDrafts(
      Object.fromEntries(
        nextCategories.map((category) => [
          category.id,
          {
            is_visible: category.is_visible,
            view_audience: category.view_audience,
            post_audience: category.post_audience,
          },
        ]),
      ),
    );
    setLoadPending(false);
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  function updateDraft(categoryId: string, patch: Partial<CategoryDraft>) {
    setDrafts((current) => ({
      ...current,
      [categoryId]: {
        ...current[categoryId],
        ...patch,
      },
    }));
  }

  async function saveSettings() {
    setSavePending(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/settings/forum", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: categories.map((category) => {
          const draft = drafts[category.id];
          return {
            id: category.id,
            isVisible: draft?.is_visible ?? category.is_visible,
            viewAudience: draft?.view_audience ?? category.view_audience,
            postAudience: draft?.post_audience ?? category.post_audience,
          };
        }),
      }),
    });

    const body = (await response.json().catch(() => null)) as
      | { error?: string; categories?: ForumCategorySettings[] }
      | null;

    if (!response.ok) {
      setError(body?.error ?? "Unable to save forum settings.");
      setSavePending(false);
      return;
    }

    setMessage("Forum category visibility saved.");
    await loadCategories();
    setSavePending(false);
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
          Settings
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Forums</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-300">
          Control which forum categories appear on the public site and who can view or post in each
          one. Categories hidden here are removed from the forum for all non-admin users.
        </p>
      </header>

      {error ? (
        <div className="rounded-sm border border-rose-300/30 bg-rose-200/10 px-4 py-4 text-sm leading-7 text-rose-100">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-sm border border-emerald-300/30 bg-emerald-200/10 px-4 py-4 text-sm leading-7 text-emerald-100">
          {message}
        </div>
      ) : null}

      {loadPending ? (
        <div className="rounded-sm border border-white/10 bg-black/12 p-4 text-sm text-slate-300">
          Loading forum categories…
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const draft = drafts[category.id];

            if (!draft) {
              return null;
            }

            return (
              <article
                key={category.id}
                className="rounded-sm border border-white/10 bg-black/12 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {category.id}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{category.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                      {category.description}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={draft.is_visible}
                      onChange={(event) =>
                        updateDraft(category.id, { is_visible: event.target.checked })
                      }
                      className="h-4 w-4 rounded-sm border border-white/20 bg-slate-950"
                    />
                    Visible on forum
                  </label>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block font-semibold text-white">Who can view</span>
                    <select
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-3 py-2 text-white"
                      value={draft.view_audience}
                      onChange={(event) =>
                        updateDraft(category.id, {
                          view_audience: event.target.value as ForumViewAudience,
                        })
                      }
                    >
                      {forumViewAudienceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="mt-2 block text-xs leading-6 text-slate-500">
                      {
                        forumViewAudienceOptions.find((option) => option.value === draft.view_audience)
                          ?.description
                      }
                    </span>
                  </label>

                  <label className="block text-sm text-slate-300">
                    <span className="mb-2 block font-semibold text-white">Who can post</span>
                    <select
                      className="w-full rounded-sm border border-white/12 bg-slate-950/70 px-3 py-2 text-white"
                      value={draft.post_audience}
                      onChange={(event) =>
                        updateDraft(category.id, {
                          post_audience: event.target.value as ForumPostAudience,
                        })
                      }
                    >
                      {forumPostAudienceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="mt-2 block text-xs leading-6 text-slate-500">
                      {
                        forumPostAudienceOptions.find((option) => option.value === draft.post_audience)
                          ?.description
                      }
                    </span>
                  </label>
                </div>

                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Current access: {draft.is_visible ? "Visible" : "Hidden"} · View:{" "}
                  {formatForumViewAudience(draft.view_audience)} · Post:{" "}
                  {formatForumPostAudience(draft.post_audience)}
                </p>
              </article>
            );
          })}

          <div>
            <button
              type="button"
              className="isonet-button"
              onClick={() => void saveSettings()}
              disabled={savePending}
            >
              {savePending ? "Saving forum settings…" : "Save forum settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
