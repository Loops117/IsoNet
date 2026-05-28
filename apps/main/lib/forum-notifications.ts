export type ForumNotificationKind = "thread_reply" | "participated_reply" | "mention";

export type ForumNotification = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  thread_id: string;
  reply_id: string | null;
  kind: ForumNotificationKind;
  thread_title: string;
  preview: string;
  created_at: string;
  read_at: string | null;
  actor?: {
    company_name: string;
    owner_name: string;
  } | null;
};

export function formatForumNotificationKind(kind: ForumNotificationKind) {
  switch (kind) {
    case "thread_reply":
      return "Reply on your thread";
    case "participated_reply":
      return "Reply on a thread you joined";
    case "mention":
      return "Mentioned you";
    default:
      return "Forum activity";
  }
}

export function formatForumNotificationMessage(
  notification: ForumNotification,
  actorLabel: string,
) {
  switch (notification.kind) {
    case "thread_reply":
      return `${actorLabel} replied to your thread "${notification.thread_title}".`;
    case "participated_reply":
      return `${actorLabel} replied in "${notification.thread_title}", a thread you participated in.`;
    case "mention":
      return `${actorLabel} mentioned you in "${notification.thread_title}".`;
    default:
      return `${actorLabel} posted in "${notification.thread_title}".`;
  }
}

export function buildForumActorLabel(
  actor: ForumNotification["actor"],
  fallback = "A vendor",
) {
  if (!actor) {
    return fallback;
  }

  if (actor.company_name.trim()) {
    return actor.company_name.trim();
  }

  if (actor.owner_name.trim()) {
    return actor.owner_name.trim();
  }

  return fallback;
}

export function getForumNotificationErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;

    if (typeof message === "string" && message.trim()) {
      if (message.includes("forum_notifications") && message.includes("does not exist")) {
        return "Forum notifications are not available yet. Apply the latest Supabase migration.";
      }

      return message;
    }
  }

  return fallback;
}
