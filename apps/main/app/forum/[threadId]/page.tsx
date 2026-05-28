import type { Metadata } from "next";

import { ForumThreadView } from "../../components/forum-thread-view";

type ForumThreadPageProps = {
  params: Promise<{ threadId: string }>;
};

export async function generateMetadata({ params }: ForumThreadPageProps): Promise<Metadata> {
  const { threadId } = await params;

  return {
    title: `Thread | Forum | The Isopod Network`,
    description: `Forum discussion ${threadId}`,
  };
}

export default async function ForumThreadPage({ params }: ForumThreadPageProps) {
  const { threadId } = await params;

  return <ForumThreadView threadId={threadId} />;
}
