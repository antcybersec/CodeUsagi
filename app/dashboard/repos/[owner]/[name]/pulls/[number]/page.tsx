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

  // 2. Fetch files and diffs from GitHub
  let files: any[] = [];
  try {
    files = await getGithubPRDiff(githubToken, owner, name, prNumber);
  } catch (error) {
    console.error(`Failed to fetch file diffs for ${owner}/${name} PR #${prNumber}:`, error);
  }

  // 3. Fetch PR info from GitHub
  let prTitle = `Pull Request #${prNumber}`;
  let prState = "open";
  let prAuthor = "developer";

  try {
    const prs = await getGithubPullRequests(githubToken, owner, name);
    const prDetails = prs.find(p => p.number === prNumber);
    if (prDetails) {
      prTitle = prDetails.title;
      prState = prDetails.state;
      prAuthor = prDetails.author;
    }
  } catch (error) {
    console.error(`Failed to fetch GitHub PR details for ${owner}/${name} PR #${prNumber}:`, error);
  }

  // 4. Fetch existing reviewed PR and comments from DB
  const dbPR = await prisma.pullRequest.findFirst({
    where: {
      repositoryId: repository.id,
      number: prNumber,
    },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const summary = dbPR?.summary || null;
  const comments = dbPR?.comments || [];

  return (
    <PRDetailClient
      repository={{
        id: repository.id,
        name: repository.name,
        owner: repository.owner,
      }}
      prNumber={prNumber}
      prTitle={prTitle}
      prState={prState}
      prAuthor={prAuthor}
      summary={summary}
      comments={comments}
      files={files}
    />
  );
}
