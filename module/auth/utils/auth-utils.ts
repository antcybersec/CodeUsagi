import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getServerSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function getSessionUser() {
  const session = await getServerSession();
  return session?.user || null;
}

export async function getUserGithubToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "github",
    },
  });
  return account?.accessToken || null;
}

// safety: parse check
