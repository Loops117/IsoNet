import type { Metadata } from "next";

import { ForumBoard } from "../components/forum-board";

export const metadata: Metadata = {
  title: "Forum | The Isopod Network",
  description:
    "The Isopod Network forum—community discussion, vendor experiences, husbandry help, and hobby accountability in one place.",
};

type ForumPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const { category } = await searchParams;

  return <ForumBoard initialCategoryId={category ?? null} />;
}
