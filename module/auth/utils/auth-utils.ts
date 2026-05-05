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

