import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser, getUserGithubToken } from "@/module/auth/utils/auth-utils";
import { getGithubPRDiff, getGithubPullRequests } from "@/module/github/lib/github";
import PRDetailClient from "./components/PRDetailClient";

interface PageProps {
  params: Promise<{
    owner: string;
    name: string;
    number: string;
  }>;
}

export default async function PRDetailPage({ params }: PageProps) {
  const { owner, name, number } = await params;
  const prNumber = parseInt(number, 10);
  const user = await getSessionUser();

  if (!user) {
    redirect("/");
  }

  // 1. Fetch repository settings from DB
  const repository = await prisma.repository.findFirst({
    where: { owner, name, userId: user.id },
  });

  if (!repository) {
    redirect("/dashboard");
  }

  const githubToken = await getUserGithubToken(user.id);

  return (
      <PRDetailClient
        repository={{
          id: repository.id,
          name: repository.name,
          owner: repository.owner,
        }}
        prNumber={prNumber}
        prTitle={`Pull Request #${prNumber}`}
        prState="open"
        prAuthor="developer"
        summary={null}
        comments={[]}
        files={[]}
      />
    );
}
