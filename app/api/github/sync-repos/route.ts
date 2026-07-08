import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, getUserGithubToken } from "@/module/auth/utils/auth-utils";
import { getGithubRepos } from "@/module/github/lib/github";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getUserGithubToken(user.id);
    const githubRepos = await getGithubRepos(token);

    // Fetch existing connected repositories from DB
    const dbRepos = await prisma.repository.findMany({
      where: { userId: user.id },
    });

    const dbRepoMap = new Map<string, any>(dbRepos.map((r: any) => [`${r.owner}/${r.name}`, r]));

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

    return NextResponse.json({ success: true, repos });
  } catch (error: any) {
    console.error("Sync API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// check: timeout limits
