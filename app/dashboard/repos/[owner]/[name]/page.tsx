import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser, getUserGithubToken } from "@/module/auth/utils/auth-utils";
import { getGithubPullRequests } from "@/module/github/lib/github";
import RepoDetailsClient from "./components/RepoDetailsClient";

interface PageProps {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}

export default async function RepoDetailsPage({ params }: PageProps) {
  const { owner, name } = await params;
  const user = await getSessionUser();

  if (!user) {
    redirect("/");
  }

  // Fetch repository settings from DB
  const repository = await prisma.repository.findFirst({
    where: { owner, name, userId: user.id },
  });

  if (!repository) {
    redirect("/dashboard");
  }

  // Fetch PRs from GitHub (or fallback mocks)
  let githubPRs: any[] = [];
  try {
    const token = await getUserGithubToken(user.id);
    githubPRs = await getGithubPullRequests(token, owner, name);
  } catch (error) {
    console.error(`Failed to fetch GitHub PRs for ${owner}/${name}:`, error);
  }

  // Fetch reviewed PR numbers from DB
  const reviewedPRs = await prisma.pullRequest.findMany({
    where: { repositoryId: repository.id },
    select: { number: true },
  });
  const reviewedPRNumbers = new Set(reviewedPRs.map((pr: any) => pr.number));

  // Merge review status
  const pullRequests = githubPRs.map(pr => ({
    ...pr,
    reviewed: reviewedPRNumbers.has(pr.number),
  }));

  return <RepoDetailsClient repository={repository} pullRequests={pullRequests} />;
}
