"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser, getUserGithubToken } from "@/module/auth/utils/auth-utils";
import { getGithubPRDiff, postGithubPRComment } from "@/module/github/lib/github";
import { generateAiReview, generateChatReply } from "@/lib/ai-review";
import { revalidatePath } from "next/cache";

export async function triggerManualReviewAction(repoId: string, prNumber: number) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const repo = await prisma.repository.findUnique({
      where: { id: repoId, userId: user.id },
    });

    if (!repo) {
      throw new Error("Repository not found");
    }

    const githubToken = await getUserGithubToken(user.id);

    // Fetch PR diff from GitHub (or mock fallback)
    const files = await getGithubPRDiff(githubToken, repo.owner, repo.name, prNumber);
    if (files.length === 0) {
      throw new Error("No file changes detected in this pull request.");
    }

    const parsedSettings = JSON.parse(repo.settings);

    // Run AI review
    const { summary, comments } = await generateAiReview(
      repo.owner,
      repo.name,
      prNumber,
      files,
      parsedSettings
    );

    // Update PR details in DB
    const dbPR = await prisma.pullRequest.upsert({
      where: {
        repositoryId_number: {
          repositoryId: repo.id,
          number: prNumber,
        },
      },
      update: {
        summary,
        state: "open",
      },
      create: {
        repositoryId: repo.id,
        number: prNumber,
        title: `Pull Request #${prNumber}`,
        state: "open",
        author: user.name || "Developer",
        summary,
      },
    });

    // Replace old comments
    await prisma.reviewComment.deleteMany({
      where: { pullRequestId: dbPR.id },
    });

    for (const comment of comments) {
      await prisma.reviewComment.create({
        data: {
          pullRequestId: dbPR.id,
          filePath: comment.filePath,
          line: comment.line,
          content: comment.content,
          codeSnippet: comment.codeSnippet,
          chat: JSON.stringify([]),
        },
      });

      // Post back to GitHub if authenticated
      await postGithubPRComment(githubToken, repo.owner, repo.name, prNumber, {
        path: comment.filePath,
        line: comment.line,
        body: comment.content,
      });
    }

    revalidatePath(`/dashboard/repos/${repo.owner}/${repo.name}/pulls/${prNumber}`);
    return { success: true, count: comments.length };
  } catch (error: any) {
    console.error("triggerManualReviewAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function replyToReviewCommentAction(commentId: string, text: string) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const comment = await prisma.reviewComment.findUnique({
      where: { id: commentId },
      include: {
        pullRequest: {
          include: { repository: true },
        },
      },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    // Parse existing chat log
    const chatLog = comment.chat ? JSON.parse(comment.chat) : [];

    // Push developer message
    const devMessage = {
      role: "user" as const,
      text,
      time: new Date().toISOString(),
    };
    const updatedChatLog = [...chatLog, devMessage];

    // Generate AI reply
    const codeContext = `File: ${comment.filePath}\nLine: ${comment.line}\nCode Snippet: ${comment.codeSnippet}\nInitial Recommendation: ${comment.content}`;
    const aiText = await generateChatReply(updatedChatLog, text, codeContext);

    // Push AI message
    const aiMessage = {
      role: "assistant" as const,
      text: aiText,
      time: new Date().toISOString(),
    };
    const finalChatLog = [...updatedChatLog, aiMessage];

    // Update database
    const updatedComment = await prisma.reviewComment.update({
      where: { id: commentId },
      data: {
        chat: JSON.stringify(finalChatLog),
      },
    });

    // Optional: post reply to GitHub comment thread if integrated (would require comment id on GitHub)

    const repo = comment.pullRequest.repository;
    const prNumber = comment.pullRequest.number;
    revalidatePath(`/dashboard/repos/${repo.owner}/${repo.name}/pulls/${prNumber}`);

    return { success: true, comment: updatedComment };
  } catch (error: any) {
    console.error("replyToReviewCommentAction error:", error);
    return { success: false, error: error.message };
  }
}

