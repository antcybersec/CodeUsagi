"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerManualReviewAction, replyToReviewCommentAction } from "@/app/dashboard/actions";
import { FaArrowLeft, FaPlay, FaComments, FaCode, FaFileAlt, FaUser, FaCheckCircle, FaRobot, FaPaperPlane, FaTerminal, FaLightbulb } from "react-icons/fa";
import { toast } from "sonner";

interface ReviewComment {
  id: string;
  filePath: string;
  line: number;
  content: string;
  codeSnippet: string | null;
  chat: string | null; // JSON chat history
}

interface Repository {
  id: string;
  name: string;
  owner: string;
}

interface PRDetailClientProps {
  repository: Repository;
  prNumber: number;
  prTitle: string;
  prState: string;
  prAuthor: string;
  summary: string | null;
  comments: ReviewComment[];
  files: Array<{ filePath: string; diff: string }>;
}

const CloverPattern = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="38" cy="50" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="62" cy="50" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="50" cy="38" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="50" cy="62" r="20" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export default function PRDetailClient({
  repository,
  prNumber,
  prTitle,
  prState,
  prAuthor,
  summary,
  comments,
  files,
}: PRDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"summary" | "files">("summary");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [reviewPending, startReviewTransition] = useTransition();
  const [chatPending, startChatTransition] = useTransition();
  
  // Chat inputs
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});

  const handleTriggerReview = () => {
    startReviewTransition(async () => {
      toast.loading("Analyzing code changes and running CodeUsagi review...");
      const response = await triggerManualReviewAction(repository.id, prNumber);
      toast.dismiss();
      if (response.success) {
        toast.success(`Review completed! Generated ${response.count} suggestions.`);
        router.refresh();
      } else {
        toast.error("Failed to run review: " + response.error);
      }
    });
  };

  const handleSendChat = (commentId: string) => {
    const text = chatInputs[commentId]?.trim();
    if (!text) return;

    startChatTransition(async () => {
      const response = await replyToReviewCommentAction(commentId, text);
      if (response.success) {
        setChatInputs(prev => ({ ...prev, [commentId]: "" }));
        toast.success("Replied to CodeUsagi");
        router.refresh();
      } else {
        toast.error("Failed to send reply: " + response.error);
      }
    });
  };

  const renderDiffWithComments = (file: typeof files[number], fileComments: ReviewComment[]) => {
    const lines = file.diff.split("\n");
    const renderedElements: React.ReactNode[] = [];
    
    let currentLine = 0;
    
    const commentMap = new Map<number, ReviewComment[]>();
    fileComments.forEach(c => {
      const list = commentMap.get(c.line) || [];
      list.push(c);
      commentMap.set(c.line, list);
    });

    lines.forEach((lineText, idx) => {
      let lineStyle = "text-slate-4050 bg-slate-950/20";
      let displayLineNum = "";

      if (lineText.startsWith("@@")) {
        lineStyle = "text-cyan-400 bg-cyan-950/5 font-semibold py-1 px-2 border-y border-cyan-500/5";
        const match = lineText.match(/\+(\d+)/);
        if (match) {
          currentLine = parseInt(match[1], 10) - 1;
        }
      } else if (lineText.startsWith("+") && !lineText.startsWith("+++")) {
        lineStyle = "text-emerald-300 bg-emerald-950/10 border-l-2 border-emerald-500 px-2";
        currentLine++;
        displayLineNum = String(currentLine);
      } else if (lineText.startsWith("-") && !lineText.startsWith("---")) {
        lineStyle = "text-rose-400 bg-rose-950/10 border-l-2 border-rose-600 px-2 line-through opacity-70";
      } else {
        lineStyle = "text-slate-300 px-2";
        if (!lineText.startsWith("---") && !lineText.startsWith("+++")) {
          currentLine++;
          displayLineNum = String(currentLine);
        }
      }

      renderedElements.push(
        <div key={`line-${idx}`} className={`font-mono text-xs py-0.5 flex hover:bg-zinc-900/30 transition-colors ${lineStyle}`}>
          <span className="w-10 select-none text-zinc-6500 text-zinc-600 text-right pr-3 border-r border-cyan-500/5 shrink-0 font-mono">
            {displayLineNum}
          </span>
          <span className="pl-3 whitespace-pre-wrap break-all font-mono">
            {lineText}
          </span>
        </div>
      );

      if (displayLineNum && commentMap.has(currentLine)) {
        const lineComments = commentMap.get(currentLine)!;
        lineComments.forEach(comm => {
          const chatHistory = comm.chat ? JSON.parse(comm.chat) : [];
          renderedElements.push(
            <div key={`comment-${comm.id}`} className="my-3 mx-4 rounded-xl border-l-4 border-l-cyan-500 border border-cyan-500/10 bg-[#0e1217] shadow-2xl p-4 space-y-4 font-sans text-xs">
              {/* Comment Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center text-black">
                    <FaRobot className="text-xs" />
                  </div>
                  <span className="font-bold text-xs text-cyan-400 lowercase-mono">CodeUsagi Review</span>
                  <span className="text-[9px] text-zinc-500">• Line {comm.line}</span>
                </div>
                <span className="text-[9px] text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-500/5 border border-cyan-500/10 lowercase-mono">AI Feedback</span>
              </div>

              {/* Comment Content */}
              <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {comm.content}
              </p>

              {/* Chat Thread */}
              {chatHistory.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-cyan-500/5 max-h-48 overflow-y-auto pr-1">
                  {chatHistory.map((chat: any, cidx: number) => (
                    <div
                      key={`chat-${cidx}`}
                      className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                        chat.role === "user"
                          ? "bg-zinc-950 border border-cyan-500/5 text-zinc-200 ml-4"
                          : "bg-cyan-950/10 border border-cyan-950/20 text-cyan-200 mr-4"
                      }`}
                    >
                      <div className="font-bold text-[9px] text-zinc-5500 text-zinc-500 mb-1 flex justify-between font-mono">
                        <span>{chat.role === "user" ? "You" : "CodeUsagi"}</span>
                        <span>{new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{chat.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Input Tips & Entry */}
              <div className="space-y-2 pt-2 border-t border-cyan-500/5">
                <div className="flex items-start gap-1.5 text-[10px] text-zinc-500 bg-zinc-950/40 p-2 rounded border border-cyan-500/5">
                  <FaLightbulb className="text-cyan-400 mt-0.5 shrink-0" />
                  <span>Tip: Ask CodeUsagi for specific fixes, e.g. typing <strong>&quot;@codeusagi fix this&quot;</strong>.</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Reply to CodeUsagi or request a code fix..."
                    value={chatInputs[comm.id] || ""}
                    onChange={e => setChatInputs(prev => ({ ...prev, [comm.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleSendChat(comm.id);
                    }}
                    className="flex-grow px-3 py-1.5 rounded bg-zinc-950 border border-cyan-500/10 text-xs focus:outline-none focus:border-cyan-500/40 text-white placeholder:text-zinc-700"
                  />
                  <button
                    onClick={() => handleSendChat(comm.id)}
                    disabled={chatPending || !chatInputs[comm.id]}
                    className="px-3 py-1.5 rounded bg-white hover:bg-zinc-200 text-black transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer font-bold"
                  >
                    <FaPaperPlane className="text-[9px]" />
                  </button>
                </div>
              </div>
            </div>
          );
        });
      }
    });

    return renderedElements;
  };

  const selectedFile = files[selectedFileIndex];
  const fileComments = comments.filter(c => c.filePath === selectedFile?.filePath);

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#e3e6ed] flex flex-col grid-background relative">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[20%] w-[550px] h-[550px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-cyan-500/10 bg-[#090a0d]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4 z-10 relative">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push(`/dashboard/repos/${repository.owner}/${repository.name}`)}
              className="p-2 rounded bg-[#0b0c10] hover:bg-zinc-900 border border-cyan-500/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <FaArrowLeft className="text-xs" />
            </button>
            <div className="min-w-0 font-sans">
              <h1 className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5 truncate lowercase-mono">
                <span className="hover:underline cursor-pointer text-zinc-400" onClick={() => router.push(`/dashboard/repos/${repository.owner}/${repository.name}`)}>{repository.name}</span>
                <span>/</span>
                <span className="text-cyan-400 font-bold">pr #{prNumber}</span>
              </h1>
              <h2 className="text-xs font-extrabold tracking-tight text-white truncate mt-0.5">{prTitle}</h2>
            </div>
          </div>

          <button
            onClick={handleTriggerReview}
            disabled={reviewPending}
            className="px-4 py-2 rounded text-xs font-bold bg-white hover:bg-zinc-200 text-black flex items-center gap-2 shadow-lg shadow-cyan-600/15 cursor-pointer disabled:opacity-50 shrink-0 lowercase-mono"
          >
            <FaPlay className="text-[9px]" /> {summary ? "re-run review" : "trigger review"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full flex flex-col gap-6 z-10 relative">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-cyan-500/10 gap-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("summary")}
              className={`pb-3 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer lowercase-mono ${
                activeTab === "summary"
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FaFileAlt className="text-[10px]" /> review summary
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`pb-3 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer lowercase-mono ${
                activeTab === "files"
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FaCode className="text-[10px]" /> files ({files.length})
            </button>
          </div>

          <div className="flex gap-4 pb-3 sm:pb-0 text-[10px] text-zinc-500 font-medium font-sans items-center">
            <span className="flex items-center gap-1.5">
              <FaUser /> {prAuthor}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-wider text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10 lowercase-mono">
              {prState}
            </span>
          </div>
        </div>

        {/* Tab Content: Summary */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {!summary ? (
              <div className="p-16 rounded-xl border border-dashed border-cyan-500/10 bg-zinc-950/20 text-center space-y-4">
                <FaRobot className="mx-auto text-zinc-600 text-4xl text-cyan-400" />
                <h3 className="text-sm font-bold text-zinc-300">CodeUsagi Review Required</h3>
                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto font-sans">
                  Run a real-time review on the PR changes using CodeUsagi. We will list summaries, walkthroughs, and inline code suggestions.
                </p>
                <button
                  onClick={handleTriggerReview}
                  disabled={reviewPending}
                  className="px-5 py-2.5 rounded font-bold bg-white hover:bg-zinc-200 text-black text-xs transition-all cursor-pointer shadow-lg shadow-cyan-600/15 lowercase-mono"
                >
                  start review
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-cyan-500/5 bg-[#0c0d12]/40 backdrop-blur-sm prose prose-invert prose-xs max-w-none text-zinc-300 leading-relaxed space-y-4 font-sans">
                {summary.split("\n").map((line, idx) => {
                  if (line.startsWith("# ")) {
                    return <h1 key={idx} className="text-base font-extrabold border-b border-cyan-500/5 pb-2 text-white mt-2">{line.slice(2)}</h1>;
                  }
                  if (line.startsWith("## ")) {
                    return <h2 key={idx} className="text-xs font-bold text-zinc-200 mt-4 uppercase tracking-wider text-cyan-400 lowercase-mono">{line.slice(3)}</h2>;
                  }
                  if (line.startsWith("- ")) {
                    const boldMatch = line.match(/^\-\s+\*\*([^\*]+)\*\*:\s*(.*)$/);
                    if (boldMatch) {
                      return (
                        <div key={idx} className="text-xs pl-4 py-1 flex items-start gap-2">
                          <span className="text-cyan-400 font-bold shrink-0 font-mono">{boldMatch[1]}</span>
                          <span className="text-zinc-400">{boldMatch[2]}</span>
                        </div>
                      );
                    }
                    return <p key={idx} className="text-xs pl-4 py-1 list-item list-disc text-zinc-400">{line.slice(2)}</p>;
                  }
                  if (line.startsWith("|") && idx > 0) {
                    const cells = line.split("|").map(c => c.trim()).filter(c => c);
                    if (cells.length > 0 && !cells[0].startsWith(":") && !cells[0].startsWith("-")) {
                      return (
                        <div key={idx} className="grid grid-cols-3 gap-4 border-b border-cyan-500/5 py-2.5 text-xs font-mono">
                          <span className="text-cyan-400 font-bold">{cells[0]}</span>
                          <span className="text-zinc-400 font-semibold">{cells[1]}</span>
                          <span className="text-zinc-500">{cells[2]}</span>
                        </div>
                      );
                    }
                  }
                  if (line.trim() === "***" || line.trim() === "---") {
                    return <hr key={idx} className="border-cyan-500/5 my-4" />;
                  }
                  return line.trim() ? <p key={idx} className="text-xs text-zinc-400 py-0.5">{line}</p> : null;
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Files Changed */}
        {activeTab === "files" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Left Tree */}
            <div className="rounded-xl border border-cyan-500/5 bg-[#0c0d12]/40 p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider lowercase-mono">File Tree</h3>
              <div className="space-y-1">
                {files.map((file, idx) => {
                  const fileCommentsCount = comments.filter(c => c.filePath === file.filePath).length;
                  return (
                    <button
                      key={file.filePath}
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded text-xs flex justify-between items-center transition-colors cursor-pointer ${
                        selectedFileIndex === idx
                          ? "bg-cyan-600/10 text-cyan-400 border border-cyan-500/20"
                          : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                      }`}
                    >
                      <span className="truncate pr-2 font-mono">{file.filePath.split("/").pop()}</span>
                      {fileCommentsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-bold text-cyan-400 flex items-center gap-1">
                          <FaComments /> {fileCommentsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Diff Viewer */}
            <div className="lg:col-span-3 rounded-xl border border-cyan-500/5 bg-zinc-950/40 overflow-hidden shadow-xl">
              {files.length === 0 ? (
                <div className="p-16 text-center text-xs text-zinc-500 font-medium">No changed files.</div>
              ) : selectedFile ? (
                <div className="flex flex-col">
                  {/* File Header */}
                  <div className="px-5 py-3 border-b border-cyan-500/5 bg-zinc-900/20 flex justify-between items-center">
                    <span className="font-mono text-xs text-zinc-250 truncate">{selectedFile.filePath}</span>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider lowercase-mono">Git Diff</span>
                  </div>

                  {/* Diff Editor */}
                  <div className="overflow-x-auto select-text">
                    <div className="min-w-full flex flex-col py-2">
                      {renderDiffWithComments(selectedFile, fileComments)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-xs text-zinc-5500">Select a file to inspect differences.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// docs: comment structures
