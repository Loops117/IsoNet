export type ForumViewAudience = "public" | "authenticated" | "vendor";
export type ForumPostAudience = "authenticated" | "vendor";

export type ForumCategory = {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  is_visible: boolean;
  view_audience: ForumViewAudience;
  post_audience: ForumPostAudience;
};

export function canViewForumCategory(
  category: Pick<ForumCategory, "is_visible" | "view_audience">,
  options: { isSignedIn: boolean; isVendor: boolean },
) {
  if (!category.is_visible) {
    return false;
  }

  if (category.view_audience === "public") {
    return true;
  }

  if (category.view_audience === "authenticated") {
    return options.isSignedIn;
  }

  return options.isVendor;
}

export function canPostInForumCategory(
  category: Pick<ForumCategory, "is_visible" | "view_audience" | "post_audience">,
  options: { isSignedIn: boolean; isVendor: boolean },
) {
  if (!canViewForumCategory(category, options) || !options.isSignedIn) {
    return false;
  }

  if (category.post_audience === "authenticated") {
    return true;
  }

  return options.isVendor;
}

export type ForumAuthor = {
  user_id: string;
  company_name: string;
  owner_name: string;
};

export type ForumThreadSummary = {
  id: string;
  category_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_user_id: string;
  reply_count: number;
  author?: ForumAuthor | null;
};

export type ForumThread = ForumThreadSummary & {
  category?: ForumCategory | null;
};

export type ForumReply = {
  id: string;
  thread_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_user_id: string;
  author?: ForumAuthor | null;
};

export function formatForumDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getForumErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;

    if (typeof message === "string" && message.trim()) {
      if (message.includes("forum_") && message.includes("does not exist")) {
        return "Forum tables are not available yet. Apply the latest Supabase migration.";
      }

      return message;
    }
  }

  return fallback;
}

export function buildAuthorLabel(author: ForumAuthor | null | undefined, fallback = "Vendor") {
  if (!author) {
    return fallback;
  }

  if (author.company_name.trim()) {
    return author.company_name.trim();
  }

  if (author.owner_name.trim()) {
    return author.owner_name.trim();
  }

  return fallback;
}
