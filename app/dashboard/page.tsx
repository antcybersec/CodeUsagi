import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser, getUserGithubToken } from "@/module/auth/utils/auth-utils";
import { getGithubRepos } from "@/module/github/lib/github";
import DashboardClient from "./components/DashboardClient";

export default async function DashboardPage() {
  const user = await getSessionUser();
  
  if (!user) {
    redirect("/");
  }

  // Fetch connected repos from DB
  const dbRepos = await prisma.repository.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Fetch repos from GitHub (or fallback mocks)
  let githubRepos: any[] = [];
  try {
    const token = await getUserGithubToken(user.id);
    githubRepos = await getGithubRepos(token);
  } catch (error) {
    console.error("Failed to fetch Github repositories on server load:", error);
  }

  const dbRepoMap = new Map<string, any>(dbRepos.map((r: any) => [`${r.owner}/${r.name}`, r]));

  // Merge GitHub repos with DB status
  const mergedGithubRepos = githubRepos.map((gr: any) => {
    const dbRepo = dbRepoMap.get(`${gr.owner}/${gr.name}`);
    return {
      ...gr,
      dbId: dbRepo?.id || null,
      isMonitored: dbRepo?.isMonitored || false,
    };
  });

  return (
    <DashboardClient
      initialDbRepos={dbRepos}
      initialGithubRepos={mergedGithubRepos}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }}
    />
  );
}
