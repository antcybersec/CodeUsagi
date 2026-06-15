import { Octokit } from "octokit";

// Helper to create octokit instance
function getOctokit(token: string) {
  return new Octokit({ auth: token });
}

// Fallback Mock Repositories
const MOCK_REPOSITORIES = [
  { id: "mock-1", name: "CodeUsagi", owner: "anantkumar", description: "AI-powered code review assistant", stars: 12, language: "TypeScript" },
  { id: "mock-2", name: "nextjs-saas-template", owner: "anantkumar", description: "A starter kit for Next.js 15+ apps", stars: 154, language: "TypeScript" },
  { id: "mock-3", name: "fastapi-llm-service", owner: "anantkumar", description: "Microservice for running LLM inference with FastAPI", stars: 89, language: "Python" },
  { id: "mock-4", name: "react-visual-diff", owner: "anantkumar", description: "A neat UI library for showing side-by-side git diffs", stars: 45, language: "JavaScript" },
];

// Fallback Mock Pull Requests
const MOCK_PULL_REQUESTS: Record<string, any[]> = {
  "CodeUsagi": [
    { number: 1, title: "feat: Add interactive review comment chat threads", state: "open", author: "anantkumar", branch: "feat/comment-chat", date: "2026-07-03" },
    { number: 2, title: "fix: Resolve session validation crash in middleware", state: "open", author: "anantkumar", branch: "fix/session-crash", date: "2026-07-04" },
    { number: 3, title: "chore: Upgrade next-themes configuration", state: "closed", author: "collaborator", branch: "chore/upgrade-themes", date: "2026-06-28" },
  ],
  "nextjs-saas-template": [
    { number: 15, title: "feat: Add multi-tenant billing support using Stripe", state: "open", author: "anantkumar", branch: "feat/billing", date: "2026-06-30" },
    { number: 16, title: "security: Mitigate SQL injection in dynamic search query", state: "open", author: "sec-expert", branch: "security/fix-search-sql", date: "2026-07-02" },
  ],
  "fastapi-llm-service": [
    { number: 4, title: "perf: Implement batching for token generation inference", state: "open", author: "anantkumar", branch: "perf/inference-batching", date: "2026-07-01" },
  ],
  "react-visual-diff": [],
};

// Fallback Mock Diff Data for PR Reviews
export const MOCK_DIFF_DATA: Record<string, Record<number, Array<{ filePath: string, diff: string, content: string }>>> = {
  "CodeUsagi": {
    1: [
      {
        filePath: "app/dashboard/repos/[owner]/[name]/pulls/[number]/page.tsx",
        diff: `@@ -45,6 +45,18 @@ export default function PRDetailView() {
   const [activeTab, setActiveTab] = useState("summary");
+  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
+
+  const handleSendChat = async (commentId: string) => {
+    const text = chatInputs[commentId];
+    if (!text) return;
+    await replyToComment(commentId, text);
+    setChatInputs(prev => ({ ...prev, [commentId]: "" }));
+  };
 
   return (
     <div className="flex flex-col h-screen">`,
        content: `// Unified file content representing the changed file
export default function PRDetailView() {
  const [activeTab, setActiveTab] = useState("summary");
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});

  const handleSendChat = async (commentId: string) => {
    const text = chatInputs[commentId];
    if (!text) return;
    await replyToComment(commentId, text);
    setChatInputs(prev => ({ ...prev, [commentId]: "" }));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      {/* Header and contents go here */}
    </div>
  );
}`
      },
      {
        filePath: "app/dashboard/actions/index.ts",
        diff: `@@ -10,4 +10,18 @@ export async function toggleRepository(id: string) {
+export async function replyToComment(commentId: string, text: string) {
+  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
+  if (!comment) throw new Error("Comment not found");
+  const existingChat = comment.chat ? JSON.parse(comment.chat) : [];
+  const updatedChat = [...existingChat, { role: "user", text, time: new Date().toISOString() }];
+  
+  // Call AI response generation
+  const aiReply = "Thank you for the reply. I will analyze the suggestion and update the recommendations.";
+  updatedChat.push({ role: "assistant", text: aiReply, time: new Date().toISOString() });
+  
+  await prisma.reviewComment.update({
+    where: { id: commentId },
+    data: { chat: JSON.stringify(updatedChat) }
+  });
+}`,
        content: `import { prisma } from "@/lib/prisma";

export async function toggleRepository(id: string) {
  // Toggle repo monitored state
}

export async function replyToComment(commentId: string, text: string) {
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Comment not found");
  const existingChat = comment.chat ? JSON.parse(comment.chat) : [];
  const updatedChat = [...existingChat, { role: "user", text, time: new Date().toISOString() }];
  
  // Call AI response generation
  const aiReply = "Thank you for the reply. I will analyze the suggestion and update the recommendations.";
  updatedChat.push({ role: "assistant", text: aiReply, time: new Date().toISOString() });
  
  await prisma.reviewComment.update({
    where: { id: commentId },
    data: { chat: JSON.stringify(updatedChat) }
  });
}`
      }
    ],
    2: [
      {
        filePath: "middleware.ts",
        diff: `@@ -12,5 +12,12 @@ export async function middleware(request: NextRequest) {
-  const session = await getSession(request);
-  if (!session) {
-    return NextResponse.redirect(new URL("/login", request.url));
-  }
+  try {
+    const session = await getSession(request);
+    if (!session) {
+      return NextResponse.redirect(new URL("/login", request.url));
+    }
+  } catch (error) {
+    console.error("Middleware session check failed:", error);
+    return NextResponse.redirect(new URL("/login", request.url));
+  }
   return NextResponse.next();`,
        content: `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch (error) {
    console.error("Middleware session check failed:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}`
      }
    ]
  },
  "nextjs-saas-template": {
    16: [
      {
        filePath: "app/api/search/route.ts",
        diff: `@@ -15,3 +15,5 @@ export async function GET(request: Request) {
   const { searchParams } = new URL(request.url);
   const query = searchParams.get("q") || "";
-  const results = await prisma.$queryRawUnsafe(\`SELECT * FROM "Product" WHERE name LIKE '%\${query}%'\`);
+  // Vulnerable to SQL injection! Raw queries should use prisma.$queryRaw with parameters
+  const results = await prisma.$queryRaw\`SELECT * FROM "Product" WHERE name LIKE \${'%' + query + '%'}\`;
   return NextResponse.json(results);`,
        content: `import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  // Vulnerable to SQL injection! Raw queries should use prisma.$queryRaw with parameters
  const results = await prisma.$queryRaw\`SELECT * FROM "Product" WHERE name LIKE \${'%' + query + '%'}\`;
  return NextResponse.json(results);
}`
      }
    ]
  }
};

export async function getGithubRepos(token: string | null) {
  if (!token) {
    return MOCK_REPOSITORIES;
  }
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 50,
    });
    return data.map(repo => ({
      id: String(repo.id),
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description || "",
      stars: repo.stargazers_count,
      language: repo.language || "TypeScript",
    }));
  } catch (error) {
    console.error("Failed to fetch Github repos, using fallback:", error);
    return MOCK_REPOSITORIES;
  }
}

export async function getGithubPullRequests(token: string | null, owner: string, repo: string) {
  if (!token) {
    return MOCK_PULL_REQUESTS[repo] || [];
  }
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "all",
      per_page: 20,
    });
    return data.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login || "unknown",
      branch: pr.head.ref,
      date: pr.created_at.split("T")[0],
    }));
  } catch (error) {
    console.error(`Failed to fetch Github PRs for ${owner}/${repo}, using fallback:`, error);
    return MOCK_PULL_REQUESTS[repo] || [];
  }
}

export async function getGithubPRDiff(token: string | null, owner: string, repo: string, prNumber: number) {
  if (!token) {
    return MOCK_DIFF_DATA[repo]?.[prNumber] || [];
  }
  try {
    const octokit = getOctokit(token);
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    return files.map(file => ({
      filePath: file.filename,
      diff: file.patch || "",
      content: "", // We can fetch contents if needed, but diff patch is usually enough
    }));
  } catch (error) {
    console.error(`Failed to fetch Github PR diff for ${owner}/${repo} PR #${prNumber}, using fallback:`, error);
    return MOCK_DIFF_DATA[repo]?.[prNumber] || [];
  }
}

export async function postGithubPRComment(
  token: string | null,
  owner: string,
  repo: string,
  prNumber: number,
  comment: { path: string; line: number; body: string }
) {
  if (!token) {
    console.log(`Mock post GitHub comment on ${owner}/${repo} PR #${prNumber}:`, comment);
    return { id: Math.floor(Math.random() * 100000) };
  }
  try {
    const octokit = getOctokit(token);
    // Find latest commit SHA for the pull request to pin the comment
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const { data } = await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      body: comment.body,
      commit_id: pr.head.sha,
      path: comment.path,
      line: comment.line,
      side: "RIGHT",
    });
    return data;
  } catch (error) {
    console.error(`Failed to post comment to Github:`, error);
    return { id: Math.floor(Math.random() * 100000) };
  }
}

export async function postGithubIssueComment(
  token: string | null,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
) {
  if (!token) {
    console.log(`Mock post GitHub issue comment on ${owner}/${repo} #${issueNumber}:`, body);
    return { id: Math.floor(Math.random() * 100000) };
  }
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    return data;
  } catch (error) {
    console.error(`Failed to post issue comment to Github:`, error);
    return { id: Math.floor(Math.random() * 100000) };
  }
}

export async function postGithubPRReviewReply(
  token: string | null,
  owner: string,
  repo: string,
  pullNumber: number,
  commentId: number,
  body: string
) {
  if (!token) {
    console.log(`Mock post GitHub PR review reply on ${owner}/${repo} PR #${pullNumber} Comment #${commentId}:`, body);
    return { id: Math.floor(Math.random() * 100000) };
  }
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.rest.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      comment_id: commentId,
      body,
    });
    return data;
  } catch (error) {
    console.error(`Failed to post PR review reply to Github:`, error);
    return { id: Math.floor(Math.random() * 100000) };
  }
}

export async function getGithubPRReviewComment(
  token: string | null,
  owner: string,
  repo: string,
  commentId: number
) {
  if (!token) {
    return {
      path: "app/dashboard/repos/[owner]/[name]/pulls/[number]/page.tsx",
      line: 45,
      body: "Simulated comment content",
      diff_hunk: "@@ -45,6 +45,18 @@",
    };
  }
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.rest.pulls.getReviewComment({
      owner,
      repo,
      comment_id: commentId,
    });
    return data;
  } catch (error) {
    console.error(`Failed to fetch PR review comment details:`, error);
    return null;
  }
}

export async function getGithubRepoFileTree(
  token: string | null,
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<string[]> {
  if (!token) return [];
  try {
    const octokit = getOctokit(token);
    let selectedBranch = branch;
    try {
      const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
      selectedBranch = repoData.default_branch;
    } catch {
      // Fallback
    }

    const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${selectedBranch}` });
    const commitSha = ref.object.sha;
    const { data: commit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: commitSha });
    const treeSha = commit.tree.sha;

    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "true",
    });

    return (tree.tree || [])
      .filter((item: any) => item.type === "blob")
      .map((item: any) => item.path);
  } catch (error) {
    console.error("Failed to fetch repository file tree:", error);
    return [];
  }
}

export async function getGithubFileContent(
  token: string | null,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  if (!token) return null;
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    if (data && !Array.isArray(data) && "content" in data && typeof data.content === "string") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch file content for ${path}:`, error);
    return null;
  }
}

export async function createGithubBranch(
  token: string | null,
  owner: string,
  repo: string,
  branchName: string,
  parentBranch: string = "main"
): Promise<string | null> {
  if (!token) return "mock-branch-sha";
  try {
    const octokit = getOctokit(token);
    let selectedParent = parentBranch;
    try {
      const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
      selectedParent = repoData.default_branch;
    } catch {
      // Fallback
    }

    const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${selectedParent}` });
    const parentSha = ref.object.sha;

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: parentSha,
    });
    return parentSha;
  } catch (error) {
    console.error(`Failed to create branch ${branchName}:`, error);
    return null;
  }
}

export async function commitGithubFile(
  token: string | null,
  owner: string,
  repo: string,
  branchName: string,
  path: string,
  content: string,
  message: string
): Promise<boolean> {
  if (!token) return true;
  try {
    const octokit = getOctokit(token);
    let sha: string | undefined = undefined;

    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branchName,
      });
      if (fileData && !Array.isArray(fileData) && "sha" in fileData) {
        sha = fileData.sha;
      }
    } catch {
      // File does not exist yet (creating new file)
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      branch: branchName,
      sha,
    });
    return true;
  } catch (error) {
    console.error(`Failed to commit file ${path} on branch ${branchName}:`, error);
    return false;
  }
}

export async function createGithubPullRequest(
  token: string | null,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body: string
): Promise<string | null> {
  if (!token) return "https://github.com/mock/pr";
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    });
    return data.html_url;
  } catch (error) {
    console.error(`Failed to create Pull Request:`, error);
    return null;
  }
}

// log: branch validation checks
