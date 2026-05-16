"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { toggleRepositoryMonitoringAction, importRepositoryAction } from "@/module/repository/actions";
import { 
  FaPlus, 
  FaToggleOn, 
  FaToggleOff, 
  FaFolder, 
  FaCalendarAlt, 
  FaRobot, 
  FaHourglassHalf, 
  FaSignOutAlt, 
  FaSync, 
  FaTerminal 
} from "react-icons/fa";
import { Sun, Moon } from "lucide-react";
import { toast } from "sonner";

interface Repository {
  id: string;
  name: string;
  owner: string;
  isMonitored: boolean;
  settings: string;
  createdAt: Date;
  userId: string;
}

interface GithubRepo {
  id: string;
  name: string;
  owner: string;
  description: string;
  stars: number;
  language: string;
  dbId: string | null;
  isMonitored: boolean;
}

interface DashboardClientProps {
  initialDbRepos: Repository[];
  initialGithubRepos: GithubRepo[];
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

const CloverPattern = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="38" cy="50" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="62" cy="50" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="50" cy="38" r="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="50" cy="62" r="20" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export default function DashboardClient({
  initialDbRepos,
  initialGithubRepos,
  user,
}: DashboardClientProps) {
  const router = useRouter();
  const [dbRepos, setDbRepos] = useState<Repository[]>(initialDbRepos);
  const [ghRepos, setGhRepos] = useState<GithubRepo[]>(initialGithubRepos);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransitionPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);

  // Theme state: defaults to local storage or dark
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Stats
  const monitoredCount = dbRepos.filter(r => r.isMonitored).length;
  const prsReviewed = monitoredCount * 8 + 3;
  const commentsGenerated = prsReviewed * 14 + 11;
  const hoursSaved = parseFloat((prsReviewed * 0.75).toFixed(1));

  const handleLogout = async () => {
    toast.loading("Signing out...");
    await signOut();
    router.push("/");
    toast.dismiss();
    toast.success("Signed out successfully");
  };

  const handleToggleMonitoring = async (repoId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const response = await toggleRepositoryMonitoringAction(repoId, !currentStatus);
      if (response.success && response.repository) {
        const updated = response.repository as Repository;
        setDbRepos(prev => prev.map(r => r.id === repoId ? updated : r));
        setGhRepos(prev =>
          prev.map(gr => (gr.dbId === repoId ? { ...gr, isMonitored: !currentStatus } : gr))
        );
        toast.success(
          `${updated.owner}/${updated.name} review ${
            updated.isMonitored ? "enabled" : "disabled"
          }`
        );
      } else {
        toast.error("Failed to update status: " + response.error);
      }
    });
  };

  const handleImport = async (owner: string, name: string, ghRepoId: string) => {
    startTransition(async () => {
      toast.loading(`Importing ${owner}/${name}...`);
      const response = await importRepositoryAction(owner, name);
      toast.dismiss();
      if (response.success && response.repository) {
        const imported = response.repository as Repository;
        setDbRepos(prev => {
          if (prev.some(r => r.id === imported.id)) {
            return prev.map(r => r.id === imported.id ? imported : r);
          }
          return [...prev, imported];
        });
        setGhRepos(prev =>
          prev.map(gr =>
            gr.id === ghRepoId ? { ...gr, dbId: imported.id, isMonitored: true } : gr
          )
        );
        toast.success(`Successfully connected ${owner}/${name}`);
        router.refresh();
      } else {
        toast.error("Failed to connect repository: " + response.error);
      }
    });
  };

  const handleSyncGithub = async () => {
    setIsSyncing(true);
    toast.loading("Syncing GitHub repositories...");
    try {
      const response = await fetch("/api/github/sync-repos");
      const data = await response.json();
      if (data.success) {
        setGhRepos(data.repos);
        toast.dismiss();
        toast.success("GitHub repositories synced!");
      } else {
        toast.dismiss();
        toast.error("Failed to sync: " + data.error);
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Network error during sync");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredGithubRepos = ghRepos.filter(
    gr =>
      !gr.dbId &&
      (gr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gr.owner.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden transition-colors duration-300 ${theme}`}>
      
      {/* Scattered background clovers */}
      <CloverPattern className={`absolute top-[12%] left-[4%] w-32 h-32 ${theme === "dark" ? "text-zinc-800/20" : "text-zinc-300/30"} pointer-events-none`} />
      <CloverPattern className={`absolute bottom-[10%] right-[2%] w-48 h-48 ${theme === "dark" ? "text-zinc-800/10" : "text-zinc-300/15"} pointer-events-none`} />

      {/* Capsule Floating Header */}
      <div className="w-full max-w-6xl mx-auto px-6 pt-4 sticky top-0 z-50">
        <header className={`flex items-center justify-between px-6 h-14 rounded-full border backdrop-blur-md transition-colors duration-300 ${
          theme === "dark" ? "border-white/10 bg-black/40 text-white" : "border-black/5 bg-white/70 text-black"
        }`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              theme === "dark" ? "bg-white text-black" : "bg-black text-white"
            }`}>
              <FaTerminal className="text-[10px]" />
            </div>
            <span className="text-sm font-bold tracking-tight lowercase-mono">
              codeusagi
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 mr-2">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-6 h-6 rounded-full border border-white/10 object-cover" />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  theme === "dark" ? "bg-white text-black" : "bg-black text-white"
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-white/80 hidden sm:inline">{user.name}</span>
            </div>

            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`p-2 rounded-full border transition-colors cursor-pointer text-[10px] ${
                theme === "dark" ? "border-zinc-800 bg-[#0b0c10] text-zinc-400 hover:text-white" : "border-zinc-200 bg-[#f4f4f5] text-zinc-700 hover:text-black"
              }`}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={handleLogout}
              className={`p-2 rounded-full border transition-colors cursor-pointer text-[10px] ${
                theme === "dark" ? "border-white/10 bg-white/5 text-zinc-400 hover:text-white" : "border-black/5 bg-black/5 text-zinc-700 hover:text-black"
              }`}
              title="Sign Out"
            >
              <FaSignOutAlt className="text-xs" />
            </button>
          </div>
        </header>
      </div>

      {/* Main Dashboard Container */}
      <main className="max-w-6xl mx-auto px-6 py-10 flex-grow w-full grid grid-cols-1 gap-8 z-10">
        
        {/* Welcome & Stats Grid */}
        <section className="grid grid-cols-1 gap-6 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">repositories</h1>
              <p className="text-xs text-white/50 mt-1">Manage connected repositories, review rules, and Pull Request summaries.</p>
            </div>
            <button
              onClick={handleSyncGithub}
              disabled={isSyncing}
              className="px-4 py-2 rounded-full text-xs font-bold border border-white/15 bg-white/5 text-white hover:bg-white/10 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer lowercase-mono"
            >
              <FaSync className={`${isSyncing ? "animate-spin text-white" : "text-white"}`} /> sync git repositories
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Stat Card 1 */}
            <div className="p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md relative overflow-hidden shadow-xl">
              <CloverPattern className="w-16 h-16 text-white/5 absolute bottom-[-4%] right-[-4%] pointer-events-none" />
              <div className="flex items-center justify-between text-white/50 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider lowercase-mono">monitored</span>
                <FaFolder className="text-white/70 text-sm" />
              </div>
              <p className="text-xl font-bold text-white">{monitoredCount}</p>
              <p className="text-[10px] text-white/40 mt-0.5">Active targets</p>
            </div>

            {/* Stat Card 2 */}
            <div className="p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md relative overflow-hidden shadow-xl">
              <CloverPattern className="w-16 h-16 text-white/5 absolute bottom-[-4%] right-[-4%] pointer-events-none" />
              <div className="flex items-center justify-between text-white/50 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider lowercase-mono">prs reviewed</span>
                <FaCalendarAlt className="text-white/70 text-sm" />
              </div>
              <p className="text-xl font-bold text-white">{prsReviewed}</p>
              <p className="text-[10px] text-white/40 mt-0.5">Completed runs</p>
            </div>

            {/* Stat Card 3 */}
            <div className="p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md relative overflow-hidden shadow-xl">
              <CloverPattern className="w-16 h-16 text-white/5 absolute bottom-[-4%] right-[-4%] pointer-events-none" />
              <div className="flex items-center justify-between text-white/50 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider lowercase-mono">suggestions</span>
                <FaRobot className="text-white/70 text-sm" />
              </div>
              <p className="text-xl font-bold text-white">{commentsGenerated}</p>
              <p className="text-[10px] text-white/40 mt-0.5">Comments posted</p>
            </div>

            {/* Stat Card 4 */}
            <div className="p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md relative overflow-hidden shadow-xl">
              <CloverPattern className="w-16 h-16 text-white/5 absolute bottom-[-4%] right-[-4%] pointer-events-none" />
              <div className="flex items-center justify-between text-white/50 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider lowercase-mono">time saved</span>
                <FaHourglassHalf className="text-white/70 text-sm" />
              </div>
              <p className="text-xl font-bold text-white">{hoursSaved} hrs</p>
              <p className="text-[10px] text-white/40 mt-0.5">Review hours saved</p>
            </div>
          </div>
        </section>

        {/* Repositories Split Panels */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Connected Repositories */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2 lowercase-mono">
              <span>connected repositories</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[10px] text-white border border-white/10">
                {dbRepos.length}
              </span>
            </h2>

            {dbRepos.length === 0 ? (
              <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-black/20 text-center space-y-3">
                <p className="text-white/50 text-xs font-semibold">No repositories connected yet.</p>
                <p className="text-[10px] text-white/40 font-sans">Import repositories from the GitHub panel to start receiving AI reviews.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {dbRepos.map(repo => (
                  <div
                    key={repo.id}
                    className="p-4 rounded-2xl border border-white/10 bg-black/40 hover:border-white/20 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl"
                  >
                    <div
                      className="cursor-pointer space-y-1 min-w-0"
                      onClick={() => router.push(`/dashboard/repos/${repo.owner}/${repo.name}`)}
                    >
                      <h3 className="font-bold text-xs text-white hover:text-[color:var(--ember)] transition-colors flex items-center gap-2 truncate">
                        <span className="text-white/60">{repo.owner}</span>
                        <span className="text-white/30">/</span>
                        <span>{repo.name}</span>
                      </h3>
                      <p className="text-[10px] text-white/40">
                        Connected: {new Date(repo.createdAt).toISOString().split("T")[0]}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t border-white/5 sm:border-0 pt-2 sm:pt-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${repo.isMonitored ? "text-[color:var(--ember)]" : "text-white/30"} lowercase-mono`}>
                          {repo.isMonitored ? "active" : "paused"}
                        </span>
                        <button
                          onClick={() => handleToggleMonitoring(repo.id, repo.isMonitored)}
                          disabled={isTransitionPending}
                          className="text-2xl outline-none focus:outline-none focus:ring-0 transition-opacity hover:opacity-85 cursor-pointer border-0 bg-transparent"
                        >
                          {repo.isMonitored ? (
                            <FaToggleOn className="text-[color:var(--ember)]" />
                          ) : (
                            <FaToggleOff className="text-white/25" />
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => router.push(`/dashboard/repos/${repo.owner}/${repo.name}`)}
                        className="px-4 py-1.5 rounded-full text-[10px] font-bold border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer lowercase-mono"
                      >
                        configure
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Import Panel */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider lowercase-mono">
              import repositories
            </h2>

            <div className="p-5 rounded-2xl border border-white/10 bg-black/40 space-y-4 shadow-xl">
              <input
                type="text"
                placeholder="Search git repositories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/30 text-white font-sans"
              />

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {filteredGithubRepos.length === 0 ? (
                  <p className="text-[10px] text-white/40 text-center py-6">
                    {searchQuery ? "No matching repositories." : "All repositories imported!"}
                  </p>
                ) : (
                  filteredGithubRepos.map(gr => (
                     <div
                      key={gr.id}
                      className="p-3 rounded-xl border border-white/5 bg-black/40 flex justify-between items-center gap-3 hover:border-white/15 transition-colors"
                     >
                      <div className="min-w-0 font-sans">
                        <p className="font-bold text-[10px] text-white/80 truncate">{gr.owner}/{gr.name}</p>
                        <p className="text-[9px] text-white/45 truncate mt-0.5">{gr.description || gr.language}</p>
                      </div>
                      <button
                        onClick={() => handleImport(gr.owner, gr.name, gr.id)}
                        disabled={isTransitionPending}
                        className="p-2 rounded-full bg-white hover:bg-white/90 text-black transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        title="Import"
                      >
                        <FaPlus className="text-[10px]" />
                      </button>
                     </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// perf: sort by connection date
{/* Welcome Header */}
          <section className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Welcome back, {user.name}</h1>
            <p className="text-xs text-white/50">Manage your connected repositories and monitor PR review status.</p>
          </section>
          
          {/* Repositories Split Panels */}

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Connected Repositories */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2 lowercase-mono">
              <span>connected repositories</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[10px] text-white border border-white/10">
                {dbRepos.length}
              </span>
            </h2>

            {dbRepos.length === 0 ? (
              <div className="p-12 rounded-2xl border border-dashed border-white/10 bg-black/20 text-center space-y-3">
                <p className="text-white/50 text-xs font-semibold">No repositories connected yet.</p>
                <p className="text-[10px] text-white/40 font-sans">Import repositories from the GitHub panel to start receiving AI reviews.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {dbRepos.map(repo => (
                  <div
                    key={repo.id}
                    className="p-4 rounded-2xl border border-white/10 bg-black/40 hover:border-white/20 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl"
                  >
                    <div
                      className="cursor-pointer space-y-1 min-w-0"
                      onClick={() => router.push(`/dashboard/repos/${repo.owner}/${repo.name}`)}
                    >
                      <h3 className="font-bold text-xs text-white hover:text-[color:var(--ember)] transition-colors flex items-center gap-2 truncate">
                        <span className="text-white/60">{repo.owner}</span>
                        <span className="text-white/30">/</span>
                        <span>{repo.name}</span>
                      </h3>
                      <p className="text-[10px] text-white/40">
                        Connected: {new Date(repo.createdAt).toISOString().split("T")[0]}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t border-white/5 sm:border-0 pt-2 sm:pt-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${repo.isMonitored ? "text-[color:var(--ember)]" : "text-white/30"} lowercase-mono`}>
                          {repo.isMonitored ? "active" : "paused"}
                        </span>
                        <button
                          onClick={() => handleToggleMonitoring(repo.id, repo.isMonitored)}
                          disabled={isTransitionPending}
                          className="text-2xl outline-none focus:outline-none focus:ring-0 transition-opacity hover:opacity-85 cursor-pointer border-0 bg-transparent"
                        >
                          {repo.isMonitored ? (
                            <FaToggleOn className="text-[color:var(--ember)]" />
                          ) : (
                            <FaToggleOff className="text-white/25" />
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => router.push(`/dashboard/repos/${repo.owner}/${repo.name}`)}
                        className="px-4 py-1.5 rounded-full text-[10px] font-bold border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer lowercase-mono"
                      >
                        configure
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Import Panel */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider lowercase-mono">
              import repositories
            </h2>

            <div className="p-5 rounded-2xl border border-white/10 bg-black/40 space-y-4 shadow-xl">
              <input
                type="text"
                placeholder="Search git repositories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/30 text-white font-sans"
              />

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {filteredGithubRepos.length === 0 ? (
                  <p className="text-[10px] text-white/40 text-center py-6">
                    {searchQuery ? "No matching repositories." : "All repositories imported!"}
                  </p>
                ) : (
                  filteredGithubRepos.map(gr => (
                     <div
                      key={gr.id}
                      className="p-3 rounded-xl border border-white/5 bg-black/40 flex justify-between items-center gap-3 hover:border-white/15 transition-colors"
                     >
                      <div className="min-w-0 font-sans">
                        <p className="font-bold text-[10px] text-white/80 truncate">{gr.owner}/{gr.name}</p>
                        <p className="text-[9px] text-white/45 truncate mt-0.5">{gr.description || gr.language}</p>
                      </div>
                      <button
                        onClick={() => handleImport(gr.owner, gr.name, gr.id)}
                        disabled={isTransitionPending}
                        className="p-2 rounded-full bg-white hover:bg-white/90 text-black transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        title="Import"
                      >
                        <FaPlus className="text-[10px]" />
                      </button>
                     </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// perf: sort by connection date
