import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getGithubPRDiff,
  postGithubPRComment,
  postGithubIssueComment,
  postGithubPRReviewReply,
  getGithubRepoFileTree,
  getGithubFileContent,
  createGithubBranch,
  commitGithubFile,
  createGithubPullRequest
} from "@/module/github/lib/github";
import { generateAiReview, generateChatReply } from "@/lib/ai-review";
import { getUserGithubToken } from "@/module/auth/utils/auth-utils";

export async function POST(request: Request) {
  try {
    const event = request.headers.get("x-github-event");
    const payload = await request.json();
    const action = payload.action;

    // Determine repository owner and name based on payload structures
    const repoName = payload.repository?.name;
    const repoOwner = payload.repository?.owner?.login;

    console.log(`\n🐰 [CodeUsagi Webhook] Received event "${event}" with action "${action}" for repo "${repoOwner}/${repoName}"`);

    if (!repoName || !repoOwner) {
      console.log("❌ [CodeUsagi Webhook] Error: Missing repository name or owner in payload");
      return NextResponse.json({ error: "Missing repository information" }, { status: 400 });
    }

    // Verify if repository is connected and monitored
    const dbRepo = await prisma.repository.findFirst({
      where: {
        name: repoName,
        owner: repoOwner,
        isMonitored: true,
      },
    });

    if (!dbRepo) {
      console.log(`⚠️ [CodeUsagi Webhook] Ignored: Repository "${repoOwner}/${repoName}" is not imported or not set to Active (Monitored) on the CodeUsagi dashboard.`);
      return NextResponse.json({ message: `Repository ${repoOwner}/${repoName} is not monitored by CodeUsagi` }, { status: 200 });
    }

    console.log(`🔍 [CodeUsagi Webhook] Repository connected! Fetching owner GitHub OAuth token...`);
    const githubToken = await getUserGithubToken(dbRepo.userId);
    if (!githubToken) {
      console.log(`⚠️ [CodeUsagi Webhook] Warning: No GitHub OAuth token found for user ID "${dbRepo.userId}". Webhook will run in mock mode.`);
    }

    // ==========================================
    // 1. PULL REQUEST EVENTS (Trigger Reviews)
    // ==========================================
    if (event === "pull_request") {
      if (action !== "opened" && action !== "synchronize") {
        console.log(`ℹ️ [CodeUsagi Webhook] Ignored pull request action: ${action}`);
        return NextResponse.json({ message: "Ignored pull request action: " + action }, { status: 200 });
      }

      const prNumber = payload.pull_request.number;
      const prTitle = payload.pull_request.title;
      const prAuthor = payload.pull_request.user.login;

      console.log(`🚀 [CodeUsagi Webhook] Starting PR review for PR #${prNumber}: "${prTitle}" by @${prAuthor}`);

      const files = await getGithubPRDiff(githubToken, repoOwner, repoName, prNumber);
      if (files.length === 0) {
        console.log(`❌ [CodeUsagi Webhook] Error: No files found/diffed in PR #${prNumber}`);
        return NextResponse.json({ message: "No files found in PR to review" }, { status: 200 });
      }

      const settings = JSON.parse(dbRepo.settings);
      const { summary, comments } = await generateAiReview(repoOwner, repoName, prNumber, files, settings);

      const dbPR = await prisma.pullRequest.upsert({
        where: {
          repositoryId_number: {
            repositoryId: dbRepo.id,
            number: prNumber,
          },
        },
        update: {
          title: prTitle,
          state: "open",
          summary,
        },
        create: {
          repositoryId: dbRepo.id,
          number: prNumber,
          title: prTitle,
          state: "open",
          author: prAuthor,
          summary,
        },
      });

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

        await postGithubPRComment(githubToken, repoOwner, repoName, prNumber, {
          path: comment.filePath,
          line: comment.line,
          body: comment.content,
        });
      }

      console.log(`✅ [CodeUsagi Webhook] Finished review for PR #${prNumber}. Generated ${comments.length} comments.`);
      return NextResponse.json({ success: true, message: `PR #${prNumber} reviewed successfully` });
    }

    // ==========================================
    // 2. ISSUE COMMENT EVENTS (General Mentions)
    // ==========================================
    if (event === "issue_comment") {
      if (action !== "created" && action !== "edited") {
        console.log(`ℹ️ [CodeUsagi Webhook] Ignored comment action: ${action}`);
        return NextResponse.json({ message: "Ignored comment action: " + action }, { status: 200 });
      }

      const commentBody = payload.comment.body;
      const commentAuthor = payload.comment.user.login;
      
      // Ignore comments made by bots to prevent feedback loops
      if (payload.comment.user.type === "Bot" || commentBody.includes("Reviewed by CodeUsagi") || commentBody.includes("Replied by CodeUsagi")) {
        console.log(`ℹ️ [CodeUsagi Webhook] Ignored comment by bot/system`);
        return NextResponse.json({ message: "Ignored bot comment" }, { status: 200 });
      }

      // Check if CodeUsagi is tagged in the comment
      if (!commentBody.toLowerCase().includes("@codeusagi")) {
        console.log(`ℹ️ [CodeUsagi Webhook] Ignored comment: CodeUsagi was not mentioned in comment: "${commentBody.substring(0, 30)}..."`);
        return NextResponse.json({ message: "CodeUsagi was not mentioned" }, { status: 200 });
      }

      const issueNumber = payload.issue.number;
      const isPR = !!payload.issue.pull_request;

      console.log(`💬 [CodeUsagi Webhook] @codeusagi tag detected on Issue/PR #${issueNumber} from @${commentAuthor}! Content: "${commentBody}"`);

      // Detect if user wants CodeUsagi to write and raise a PR automatically
      const isFixRequest =
        commentBody.toLowerCase().includes("fix") &&
        (commentBody.toLowerCase().includes("pr") ||
          commentBody.toLowerCase().includes("pull request") ||
          commentBody.toLowerCase().includes("commit") ||
          commentBody.toLowerCase().includes("apply") ||
          commentBody.toLowerCase().includes("raise") ||
          commentBody.toLowerCase().includes("create") ||
          commentBody.toLowerCase().includes("it"));

      // Fetch file tree of the repository for context
      console.log("📂 [CodeUsagi Webhook] Fetching repository file tree...");
      const fileTree = await getGithubRepoFileTree(githubToken, repoOwner, repoName);
      console.log(`📂 [CodeUsagi Webhook] Found ${fileTree.length} files in repository.`);

      // Scan for mentioned files in the comment body
      const fetchedFiles: Array<{ path: string; content: string }> = [];
      const lowerBody = commentBody.toLowerCase();
      
      for (const filePath of fileTree) {
        const filename = filePath.split("/").pop() || "";
        // Check if comment body mentions the full path or the filename
        if (
          lowerBody.includes(filePath.toLowerCase()) ||
          (filename && filename.length > 4 && lowerBody.includes(filename.toLowerCase()))
        ) {
          console.log(`🔍 [CodeUsagi Webhook] Mentions detected for "${filePath}". Downloading file content...`);
          const fileContent = await getGithubFileContent(githubToken, repoOwner, repoName, filePath);
          if (fileContent) {
            fetchedFiles.push({ path: filePath, content: fileContent });
          }
        }
      }

      // Construct codebase context for the LLM
      let codebaseContext = "";
      if (fileTree.length > 0) {
        codebaseContext += `Available files in repository:\n- ${fileTree.slice(0, 80).join("\n- ")}\n\n`;
      }
      if (fetchedFiles.length > 0) {
        codebaseContext += `Here are the contents of the files mentioned in the developer's question:\n`;
        for (const file of fetchedFiles) {
          codebaseContext += `=== FILE PATH: ${file.path} ===\n${file.content}\n\n`;
        }
      }

      // Appending instructions to trigger code generation in JSON format
      
      const fixJsonRegex = /\[CODEUSAGI_FIX_JSON\]([\s\S]*?)\[\/CODEUSAGI_FIX_JSON\]/;
      let prUrl = "";
      let aiResponseText = await generateChatReply([], commentBody, codebaseContext);
      
      // Format reply and append signature

      let cleanAiResponse = aiResponseText;
      if (prUrl) {
        cleanAiResponse = aiResponseText.replace(fixJsonRegex, "").trim();
      }

      let replyBody = `@${commentAuthor} ${cleanAiResponse}\n\n`;
      if (prUrl) {
        replyBody += `🎉 **CodeUsagi has successfully raised a Pull Request with the fix!**\n👉 **[Review and Merge the PR here](${prUrl})**\n\n`;
      }
      replyBody += `***\n*Replied by CodeUsagi 🐰*`;
      
      console.log(`📤 [CodeUsagi Webhook] Posting response to GitHub...`);
      await postGithubIssueComment(githubToken, repoOwner, repoName, issueNumber, replyBody);

      console.log(`✅ [CodeUsagi Webhook] Replied successfully to @${commentAuthor} on Issue/PR #${issueNumber}!`);
      return NextResponse.json({ success: true, message: "Replied to issue comment successfully" });
    }

    // ==========================================
    // 3. INLINE REVIEW COMMENT EVENTS (Code Threads)
    // ==========================================
    if (event === "pull_request_review_comment") {
      if (action !== "created" && action !== "edited") {
        console.log(`ℹ️ [CodeUsagi Webhook] Ignored review comment action: ${action}`);
        return NextResponse.json({ message: "Ignored review comment action: " + action }, { status: 200 });
      }

      const commentBody = payload.comment.body;
      const commentAuthor = payload.comment.user.login;

      if (payload.comment.user.type === "Bot" || commentBody.includes("Replied by CodeUsagi")) {
        console.log(`ℹ️ [CodeUsagi Webhook] Ignored bot comment in review thread`);
        return NextResponse.json({ message: "Ignored bot comment" }, { status: 200 });
      }

      if (!commentBody.toLowerCase().includes("@codeusagi")) {
        console.log(`ℹ️ [CodeUsagi Webhook] Ignored review comment: CodeUsagi was not mentioned`);
        return NextResponse.json({ message: "CodeUsagi was not mentioned in review comment" }, { status: 200 });
      }

      const prNumber = payload.pull_request.number;
      const commentId = payload.comment.id;
      const diffHunk = payload.comment.diff_hunk;
      const filePath = payload.comment.path;
      const line = payload.comment.line;

      console.log(`💬 [CodeUsagi Webhook] Inline review tag detected from @${commentAuthor} on ${filePath}:${line}`);

      const codeContext = `File: ${filePath}\nLine: ${line}\nDiff Hunk:\n${diffHunk}\nOriginal Comment: ${payload.comment.body}`;

      const aiResponseText = await generateChatReply([], commentBody, codeContext);
      const replyBody = `@${commentAuthor} ${aiResponseText}\n\n***\n*Replied by CodeUsagi 🐰*`;

      console.log(`📤 [CodeUsagi Webhook] Posting inline reply to review comment #${commentId}...`);
      await postGithubPRReviewReply(githubToken, repoOwner, repoName, prNumber, commentId, replyBody);

      console.log(`✅ [CodeUsagi Webhook] Inline reply posted successfully!`);
      return NextResponse.json({ success: true, message: "Replied to review comment successfully" });
    }

    console.log(`ℹ️ [CodeUsagi Webhook] Ignored event type: ${event}`);
    return NextResponse.json({ message: "Ignored event type: " + event }, { status: 200 });
  } catch (error: any) {
    console.error("❌ [CodeUsagi Webhook] Error processing webhook event:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// fix: skip validation on bots comments
