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

export async function importRepositoryAction(owner: string, name: string) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Check if repository already exists
    let dbRepo = await prisma.repository.findFirst({
      where: { owner, name, userId: user.id },
    });

    if (!dbRepo) {
      dbRepo = await prisma.repository.create({
        data: {
          owner,
          name,
          userId: user.id,
          isMonitored: true,
          settings: JSON.stringify({
            tone: "supportive",
            strictness: "moderate",
            ignorePatterns: "",
          }),
        },
      });
    } else {
      // Toggle it to monitored if it was already imported
      dbRepo = await prisma.repository.update({
        where: { id: dbRepo.id },
        data: { isMonitored: true },
      });
    }

    revalidatePath("/dashboard");
    return { success: true, repository: dbRepo };
  } catch (error: any) {
    console.error("importRepositoryAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleRepositoryMonitoringAction(id: string, isMonitored: boolean) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const updatedRepo = await prisma.repository.update({
      where: { id, userId: user.id },
      data: { isMonitored },
    });

    revalidatePath("/dashboard");
    return { success: true, repository: updatedRepo };
  } catch (error: any) {
    console.error("toggleRepositoryMonitoringAction error:", error);
    return { success: false, error: error.message };
  }
}

// check: import error format
