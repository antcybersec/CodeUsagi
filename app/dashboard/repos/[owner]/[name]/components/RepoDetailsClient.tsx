"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRepositorySettingsAction } from "@/app/dashboard/actions";
import { FaArrowLeft, FaCog, FaList, FaRegCheckCircle, FaRegDotCircle, FaInfoCircle, FaTerminal } from "react-icons/fa";
import { toast } from "sonner";

interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  branch: string;
  date: string;
  reviewed: boolean;
}

interface Repository {
  id: string;
  name: string;
  owner: string;
  isMonitored: boolean;
  settings: string;
}

interface RepoDetailsClientProps {
  repository: Repository;
  pullRequests: PullRequest[];
}

const CloverPattern = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="38" cy="50" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="62" cy="50" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="50" cy="38" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="50" cy="62" r="20" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export default function RepoDetailsClient({ repository, pullRequests }: RepoDetailsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pulls" | "settings">("pulls");
  const [isPending, startTransition] = useTransition();

  // Settings states
  const initialSettings = JSON.parse(repository.settings);
  const [tone, setTone] = useState<"supportive" | "critical" | "moderate">(initialSettings.tone || "supportive");
  const [strictness, setStrictness] = useState<"lenient" | "moderate" | "strict">(initialSettings.strictness || "moderate");
  const [ignorePatterns, setIgnorePatterns] = useState(initialSettings.ignorePatterns || "");

  const handleSaveSettings = () => {
    startTransition(async () => {
      const response = await updateRepositorySettingsAction(repository.id, {
        tone,
        strictness,
        ignorePatterns,
      });

      if (response.success) {
        toast.success("Settings updated successfully!");
        router.refresh();
      } else {
        toast.error("Failed to update settings: " + response.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#e3e6ed] flex flex-col grid-background relative">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[20%] w-[550px] h-[550px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-cyan-500/10 bg-[#090a0d]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4 z-10 relative">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded bg-[#0b0c10] hover:bg-zinc-900 border border-cyan-500/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <FaArrowLeft className="text-xs" />
          </button>
          <div className="min-w-0 font-sans">
            <h1 className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5 lowercase-mono uppercase">
              <span className="hover:underline cursor-pointer" onClick={() => router.push("/dashboard")}>repositories</span>
              <span>/</span>
              <span>{repository.owner}</span>
            </h1>
            <h2 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
              {repository.name}
            </h2>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 flex-grow w-full space-y-6 z-10 relative">
        {/* Navigation Tabs */}
        <div className="flex border-b border-cyan-500/10 gap-6">
          <button
            onClick={() => setActiveTab("pulls")}
            className={`pb-3 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer lowercase-mono ${
              activeTab === "pulls"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FaList className="text-[10px]" /> pull requests
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer lowercase-mono ${
              activeTab === "settings"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FaCog className="text-[10px]" /> settings
          </button>
        </div>

        {/* Tab Panel: Pull Requests */}
        {activeTab === "pulls" && (
          <div className="space-y-4">
            {pullRequests.length === 0 ? (
              <div className="p-16 rounded-xl border border-dashed border-cyan-500/10 bg-zinc-950/20 text-center">
                <FaInfoCircle className="mx-auto text-zinc-6500 text-2xl mb-4 text-cyan-400" />
                <p className="text-zinc-400 text-xs font-semibold">No pull requests found.</p>
                <p className="text-[10px] text-zinc-500 mt-1 font-sans">This repository has no pull requests available for review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {pullRequests.map(pr => (
                  <div
                    key={pr.number}
                    onClick={() => router.push(`/dashboard/repos/${repository.owner}/${repository.name}/pulls/${pr.number}`)}
                    className="p-4 rounded-xl border border-cyan-500/5 bg-[#0c0d12]/40 hover:border-cyan-500/20 transition-all flex justify-between items-center gap-4 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-500 font-bold text-xs">#{pr.number}</span>
                        <h3 className="font-bold text-xs text-white group-hover:text-cyan-400 transition-colors truncate">
                          {pr.title}
                        </h3>
                      </div>
                      <p className="text-[10px] text-zinc-500 flex items-center gap-3">
                        <span>by {pr.author}</span>
                        <span>•</span>
                        <span>{pr.branch}</span>
                        <span>•</span>
                        <span>{pr.date}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          pr.state === "open"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                        }`}
                      >
                        {pr.state}
                      </span>
                      {pr.reviewed ? (
                        <div className="flex items-center gap-1 text-cyan-400 text-[10px] font-bold">
                          <FaRegCheckCircle /> <span>Reviewed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
                          <FaRegDotCircle /> <span>Needs Review</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Panel: Settings */}
        {activeTab === "settings" && (
          <div className="max-w-xl p-6 rounded-xl border border-cyan-500/5 bg-[#0c0d12]/40 space-y-6 relative overflow-hidden">
            <CloverPattern className="w-24 h-24 text-cyan-500/5 absolute bottom-[-4%] right-[-4%] pointer-events-none" />
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider lowercase-mono">Review Configuration</h2>

            {/* Tone Setting */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 lowercase-mono">Review Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {(["supportive", "moderate", "critical"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`py-2 rounded text-xs font-bold border transition-all capitalize cursor-pointer lowercase-mono ${
                      tone === t
                        ? "bg-cyan-600/10 text-cyan-400 border-cyan-500"
                        : "bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-zinc-500 font-sans">
                Constructiveness level for CodeUsagi reviews. Supportive is educational; critical is direct.
              </p>
            </div>

            {/* Strictness Setting */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 lowercase-mono">Review Strictness</label>
              <div className="grid grid-cols-3 gap-2">
                {(["lenient", "moderate", "strict"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStrictness(s)}
                    className={`py-2 rounded text-xs font-bold border transition-all capitalize cursor-pointer lowercase-mono ${
                      strictness === s
                        ? "bg-cyan-600/10 text-cyan-400 border-cyan-500"
                        : "bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-zinc-500 font-sans">
                Threshold for finding and reporting coding defects or improvements.
              </p>
            </div>

            {/* Ignore Patterns */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 lowercase-mono">Ignore Patterns</label>
              <textarea
                placeholder="e.g. *.lock, dist/*, package-lock.json"
                value={ignorePatterns}
                onChange={e => setIgnorePatterns(e.target.value)}
                className="w-full px-3 py-2 rounded bg-zinc-950 border border-cyan-500/10 text-xs focus:outline-none focus:border-cyan-500/30 transition-colors h-20 placeholder:text-zinc-800 text-white"
              />
              <p className="text-[9px] text-zinc-500 font-sans">
                Ignore list of files using glob notation.
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              disabled={isPending}
              className="w-full py-2.5 rounded font-bold bg-white hover:bg-zinc-200 text-black transition-colors text-xs cursor-pointer shadow-lg shadow-cyan-600/15 lowercase-mono"
            >
              save configuration
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// docs: mapping structures
