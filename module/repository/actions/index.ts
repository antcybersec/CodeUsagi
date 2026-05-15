"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser, getUserGithubToken } from "@/module/auth/utils/auth-utils";
import { getGithubRepos } from "@/module/github/lib/github";
import { revalidatePath } from "next/cache";

export async function syncUserRepositoriesAction() {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const token = await getUserGithubToken(user.id);
    const githubRepos = await getGithubRepos(token);

    // Fetch existing connected repositories from DB
    const dbRepos = await prisma.repository.findMany({
      where: { userId: user.id },
    });

    const dbRepoMap = new Map(dbRepos.map((r: any) => [`${r.owner}/${r.name}`, r]));

    // Merge GitHub repos with DB status
    const repos = githubRepos.map((gr: any) => {
      const dbRepo = dbRepoMap.get(`${gr.owner}/${gr.name}`);
      return {
        ...gr,
        dbId: dbRepo?.id || null,
        isMonitored: dbRepo?.isMonitored || false,
        settings: dbRepo?.settings ? JSON.parse(dbRepo.settings) : null,
      };
    });

    return { success: true, repos };
  } catch (error: any) {
    console.error("syncUserRepositoriesAction error:", error);
    return { success: false, error: error.message };
  }
}

