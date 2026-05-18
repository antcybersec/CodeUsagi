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

  return <RepoDetailsClient repository={repository} pullRequests={[]} />;
}
