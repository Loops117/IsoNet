export type ForumViewAudience = "public" | "authenticated" | "vendor";
export type ForumPostAudience = "authenticated" | "vendor";

export type ForumCategorySettings = {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  is_visible: boolean;
  view_audience: ForumViewAudience;
  post_audience: ForumPostAudience;
  created_at: string;
  updated_at: string;
};

export const forumViewAudienceOptions: {
  value: ForumViewAudience;
  label: string;
  description: string;
}[] = [
  {
    value: "public",
    label: "Everyone",
    description: "Visible to visitors without signing in.",
  },
  {
    value: "authenticated",
    label: "Signed-in users",
    description: "Requires an account; vendors and non-vendors can view.",
  },
  {
    value: "vendor",
    label: "Vendors only",
    description: "Only users with a vendor profile can see this category.",
  },
];

export const forumPostAudienceOptions: {
  value: ForumPostAudience;
  label: string;
  description: string;
}[] = [
  {
    value: "authenticated",
    label: "Signed-in users",
    description: "Any logged-in user can create threads and replies.",
  },
  {
    value: "vendor",
    label: "Vendors only",
    description: "Only vendor accounts can post in this category.",
  },
];

export function formatForumViewAudience(value: ForumViewAudience) {
  return forumViewAudienceOptions.find((option) => option.value === value)?.label ?? value;
}

export function formatForumPostAudience(value: ForumPostAudience) {
  return forumPostAudienceOptions.find((option) => option.value === value)?.label ?? value;
}
