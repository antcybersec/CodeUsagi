"use client";

import { useSession, signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Globe,
  Github,
  ChevronDown,
  Search,
  Plus,
  GitPullRequest,
  Grid3x3,
  Linkedin,
  Sparkles,
  Flame,
  FileCode,
  Terminal,
  Sun,
  Moon,
} from "lucide-react";
import { toast } from "sonner";

const caveHero = "/cave-hero.jpg";
const avatar = "/avatar.jpg";

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState(false);

  // Theme state: default is dark
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  };

  const handleLogin = async () => {
    try {
      setLoggingIn(true);
      toast.loading("Connecting to GitHub OAuth...");
      await signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
      });
    } catch (err: any) {
      setLoggingIn(false);
      toast.dismiss();
      toast.error("GitHub Login failed: " + err.message);
    }
  };

  return (
    <div className={`relative min-h-screen overflow-hidden bg-background text-foreground ${theme}`}>

      {/* Hero background */}
      <div className="absolute inset-x-0 top-0 h-[860px]">
        <img
          src={caveHero}
          alt=""
          className="cave-hero h-full w-full object-cover opacity-90"
          width={1920}
          height={1280}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-6 rounded-full border border-white/10 bg-black/40 px-5 py-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 pr-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-black">
                <Terminal className="h-3.5 w-3.5" />
              </div>
              <span className="font-display text-lg leading-none">CodeUsagi</span>
            </div>
            <div className="h-4 w-px bg-white/15" />
            <nav className="flex items-center gap-5 text-sm text-white/85">
              <a href="#playground" className="hover:text-white">Playground</a>
              <a href="#features" className="flex items-center gap-1 hover:text-white">
                Features <ChevronDown className="h-3.5 w-3.5" />
              </a>
              <a href="#customers" className="hover:text-white">Customers</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1.5 backdrop-blur-xl">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/85 hover:text-white cursor-pointer">
              <Globe className="h-4 w-4" /> English
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/85 hover:text-white cursor-pointer"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <a 
              href="https://github.com/antcybersec/CodeUsagi"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white hover:bg-white/10 cursor-pointer"
            >
              Check repo
            </a>
            <button 
              onClick={session ? () => router.push("/dashboard") : handleLogin}
              disabled={isPending || loggingIn}
              className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-white/90 cursor-pointer"
            >
              <Github className="h-4 w-4" /> {session ? "Dashboard" : "Sign In"}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pt-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3.5 py-1.5 text-xs text-white/80 ring-1 ring-white/10 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ember)]" />
            Smart way of code reviews
          </div>

          <h1 className="mt-6 font-display text-6xl leading-[1.05] tracking-tight text-white sm:text-7xl">
            AI code reviewer that
            <br /> makes your code smarter.
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-white/70">
            Get real-time feedback during review. CodeUsagi pulls context from
            your codebase and past pull requests in under a second.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button 
              onClick={session ? () => router.push("/dashboard") : handleLogin}
              disabled={isPending || loggingIn}
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white backdrop-blur hover:bg-white/10 cursor-pointer"
            >
              {session ? "Go to dashboard" : "Sign In"}
            </button>
            <a 
              href="#faq"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 cursor-pointer"
            >
              Check docs
            </a>
          </div>

          {/* Product mock */}
          <div className="mx-auto mt-16 max-w-4xl">
            <ProductMock />
          </div>
        </section>

        {/* Trusted by */}
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
          <p className="text-sm text-white/60">Trusted by developer teams</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-14 gap-y-6 text-white/50">
            <Logo>vercel</Logo>
            <Logo><span className="italic">/\/\</span>&nbsp;monday<span className="text-white/40">.com</span></Logo>
            <Logo><Flame className="mr-1.5 inline h-4 w-4" />Podium</Logo>
            <Logo>Linked<span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/50 text-[10px] font-bold text-black"><Linkedin className="h-3 w-3" /></span></Logo>
            <Logo className="font-display text-2xl italic">Harvey</Logo>
            <Logo>lyft</Logo>
          </div>
        </section>

        <ProcessSteps />
        <WhatsDriving />
        <Testimonials />
        <Faq />
        <CtaCard handleLogin={handleLogin} session={session} loggingIn={loggingIn} isPending={isPending} router={router} />
        <Footer />
      </div>
    </div>
  );
}

function Logo({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`text-xl font-semibold tracking-tight ${className}`}>
      {children}
    </span>
  );
}

function ProductMock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex gap-3">
        {/* Sidebar */}
        <aside className="flex w-14 flex-col items-center gap-4 rounded-xl bg-white/[0.03] py-4">
          <SidebarItem active icon={<Grid3x3 className="h-4 w-4" />} label="Reviews" />
          <SidebarItem icon={<Sparkles className="h-4 w-4" />} label="Context" />
          <SidebarItem icon={<Search className="h-4 w-4" />} label="Insight" />
          <SidebarItem icon={<GitPullRequest className="h-4 w-4" />} label="PRs" />
          <SidebarItem icon={<FileCode className="h-4 w-4" />} label="Files" />
        </aside>

        {/* Main */}
        <div className="flex-1 space-y-3">
          {/* Search bar */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Search className="h-4 w-4" />
              Search files, PRs, comments
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/60">⌘ +K</span>
              <button className="rounded-md bg-white/5 p-1.5 text-white/70">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <img src={avatar} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" loading="lazy" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Question card */}
            <div className="col-span-2 space-y-3 rounded-xl bg-white/[0.03] p-4 text-left">
              <h3 className="text-sm font-medium text-white">
                Question: Can it automatically raise PR fixes?
              </h3>
              <p className="text-xs leading-relaxed text-white/60">
                CodeUsagi detects issues in real-time and can commit fixes on a
                new branch. Ask &quot;@codeusagi fix this&quot; in any comment and it
                opens a PR with the change ready for review.
              </p>
              <div className="inline-flex items-center gap-2 rounded-md border border-[color:var(--ember)]/40 bg-[color:var(--ember)]/10 px-2.5 py-1 text-[11px] text-[color:var(--ember)]">
                Answered based on CodeUsagi agent
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] p-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-red-600">
                  <GitPullRequest className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/85">Search config housekeeping…</p>
                  <p className="text-[10px] text-white/40">Prev PR 12 min ago</p>
                </div>
                <button className="rounded-md bg-white/5 p-1.5">
                  <Plus className="h-3.5 w-3.5 text-white/70" />
                </button>
              </div>
            </div>

            {/* Platform card */}
            <div className="space-y-3 rounded-xl bg-white/[0.03] p-4 text-left">
              <h3 className="text-sm font-medium text-white">Works with any stack</h3>
              <div className="grid grid-cols-4 gap-2">
                {["#4285F4", "#E01E5A", "#0A66C2", "#FF6B35"].map((c, i) => (
                  <div key={i} className="flex h-10 items-center justify-center rounded-md bg-white/[0.04]">
                    <div className="h-4 w-4 rounded-sm" style={{ background: c }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.04]">
                  <Github className="h-4 w-4 text-white/70" />
                </div>
                <div className="flex flex-1 items-center rounded-md bg-white/[0.04] px-3 py-2 text-xs text-white/70">
                  + 40 Others
                </div>
              </div>
              <div className="rounded-md bg-gradient-to-r from-[color:var(--ember)]/20 to-transparent p-2 text-[11px] text-white/70">
                Notify on push
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          active ? "bg-white text-black" : "bg-white/[0.04] text-white/60"
        }`}
      >
        {icon}
      </div>
      <span className="text-[9px] text-white/50">{label}</span>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div id="features" className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3.5 py-1.5 text-xs text-white/80 ring-1 ring-white/10 backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ember)]" />
      {children}
    </div>
  );
}

function ProcessSteps() {
  const steps = [
    {
      n: "01",
      title: "Submit a pull request",
      body:
        "Push your branch and open a PR. CodeUsagi intercepts changes through webhooks — no config, no setup.",
      mock: (
        <div className="space-y-2 font-mono text-xs text-white/70">
          <div className="text-white/40">file_explorer.json</div>
          <div className="pl-3">📁 src/</div>
          <div className="pl-6">📁 app/</div>
          <div className="flex justify-between pl-9">
            <span>📄 page.tsx</span>
            <span className="rounded-md bg-[color:var(--ember)]/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[color:var(--ember)]">
              modified
            </span>
          </div>
          <div className="pl-6">📁 components/</div>
        </div>
      ),
    },
    {
      n: "02",
      title: "Configure review rules",
      body:
        "Tailor comments to your codebase guidelines. Choose supportive or direct tone styles per repo.",
      mock: (
        <div className="relative h-40">
          <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-white/80">Git</span>
          <span className="absolute right-6 top-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-white/80">Rule</span>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:var(--ember)]/50 bg-[color:var(--ember)]/10 px-4 py-1.5 text-xs text-[color:var(--ember)]">AI</span>
          <span className="absolute bottom-6 left-8 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-white/80">Tone</span>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 160" preserveAspectRatio="none">
            <path d="M60 30 L200 80 L340 30 M60 30 L200 80 L110 130 M340 30 L200 80 L290 130" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 4" fill="none" />
          </svg>
        </div>
      ),
    },
    {
      n: "03",
      title: "Run automated checks",
      body:
        "Verify logic, styling rules, and find bugs. CodeUsagi scans every change against your full context.",
      mock: (
        <div className="rounded-md border border-white/10 bg-black/40 p-3 font-mono text-xs">
          <div className="flex items-center justify-between text-white/50">
            <span>analysis_output.log</span>
            <span className="text-[color:var(--ember)]">34ms</span>
          </div>
          <div className="mt-2 space-y-1 text-white/75">
            <div>✓ types resolved (128 files)</div>
            <div>✓ styling rules match</div>
            <div className="text-[color:var(--ember)]">! 2 suggestions ready</div>
          </div>
        </div>
      ),
    },
    {
      n: "04",
      title: "Raise PR fixes",
      body:
        'Ask the bot to write fixes ("@codeusagi fix it") and raise a pull request back automatically.',
      mock: (
        <div className="space-y-2 font-mono text-xs">
          <div className="rounded-md border border-white/10 bg-black/40 p-2.5">
            <div className="text-white/50">jbrooks215 (author)</div>
            <div className="mt-1 text-white/85">@codeusagi fix this by wrapping in try-catch</div>
          </div>
          <div className="rounded-md border border-[color:var(--ember)]/30 bg-[color:var(--ember)]/5 p-2.5">
            <div className="text-[color:var(--ember)]">codeusagi (bot)</div>
            <div className="mt-1 text-white/85">✓ Committed changes and raised PR #2</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="playground" className="mx-auto max-w-5xl px-6 pt-16 pb-24">
      <div className="text-center">
        <SectionEyebrow>How it works</SectionEyebrow>
        <h2 className="mt-6 font-display text-5xl leading-tight tracking-tight text-white sm:text-6xl">
          A complete loop for
          <br /> active code reviews.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm text-white/60">
          Replicating automated review chains on every code push.
        </p>
      </div>

      <div className="mt-20 space-y-16">
        {steps.map((s, i) => (
          <div key={s.n} className={`grid grid-cols-1 items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <div className="font-display text-5xl italic text-white/25">{s.n}</div>
              <h3 className="mt-3 font-display text-3xl text-white">{s.title}</h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">{s.body}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/50 p-5 shadow-xl backdrop-blur-xl">
              {s.mock}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhatsDriving() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div>
          <SectionEyebrow>Under the hood</SectionEyebrow>
          <h2 className="mt-6 font-display text-5xl leading-tight tracking-tight text-white">
            What&apos;s driving <span className="italic text-white/70">the reviews.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
            We leverage contextual file lookups and semantic codebase
            understanding to give you the highest fidelity code reviews.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="font-mono">analysis_load_profile</span>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[color:var(--ember)]">34ms latency</span>
          </div>
          <svg viewBox="0 0 400 140" className="mt-6 w-full">
            <defs>
              <linearGradient id="pulse" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--ember)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--ember)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 110 Q 60 80 100 90 T 200 45 T 300 95 T 400 40 L400 140 L0 140 Z" fill="url(#pulse)" />
            <path d="M0 110 Q 60 80 100 90 T 200 45 T 300 95 T 400 40" stroke="white" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "CodeUsagi slashed our pull request review times in half. It feels like having a senior engineer reviewing commits 24/7.",
      name: "Charles",
      role: "Partner, VC Tech",
    },
    {
      quote:
        "The automated PR creation when asking it to fix issues via comments is absolute magic. Saves hours of context-switching.",
      name: "Dr. Arthur",
      role: "Advisor, AI Labs",
    },
    {
      quote:
        "Adding custom ignore patterns and tone rules let us enforce code quality that matches our guidelines perfectly.",
      name: "Sean",
      role: "Engineer, SaaS Corp",
    },
  ];
  return (
    <section id="customers" className="mx-auto max-w-5xl px-6 py-24 text-center">
      <SectionEyebrow>Loved by teams</SectionEyebrow>
      <h2 className="mt-6 font-display text-5xl leading-tight tracking-tight text-white">
        Using CodeUsagi at <span className="italic text-white/70">active teams.</span>
      </h2>
      <p className="mt-4 text-sm text-white/60">
        Trusted by over 15,000+ developers worldwide.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-white/10 bg-black/40 p-6 text-left backdrop-blur-xl"
          >
            <p className="font-display text-lg italic leading-relaxed text-white/90">
              &quot;{t.quote}&quot;
            </p>
            <div className="mt-8 border-t border-white/10 pt-4">
              <div className="text-sm text-white">{t.name}</div>
              <div className="text-xs text-white/50">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: "What is CodeUsagi?",
      a: "CodeUsagi is an AI code reviewer. It hooks into your Git repositories and reviews pull requests line-by-line, posting comments on logical errors and suggestions.",
    },
    {
      q: "How is it different?",
      a: "Unlike simple review bots, CodeUsagi runs interactive chat threads directly inside files and lets you command it (e.g. \"@codeusagi fix this\") to write changes and raise PRs for you.",
    },
    {
      q: "Who owns the code?",
      a: "You own 100% of your code and comments. CodeUsagi operates inside your local environment, using SQLite, and forwards diff context safely.",
    },
    {
      q: "Can I run it on my own cloud?",
      a: "Yes. Since the project uses SQLite and Next.js, you can deploy it in a Docker container to any hosting service with minimal effort.",
    },
  ];
  return (
    <section id="faq" className="mx-auto max-w-5xl px-6 py-24">
      <div className="text-center">
        <SectionEyebrow>FAQ</SectionEyebrow>
        <h2 className="mt-6 font-display text-5xl leading-tight tracking-tight text-white">
          Questions, <span className="italic text-white/70">answered.</span>
        </h2>
      </div>
      <div className="mt-14 grid grid-cols-1 gap-x-16 gap-y-10 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.q}>
            <div className="font-display text-xl text-white">{it.q}</div>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{it.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaCard({ 
  handleLogin, 
  session, 
  loggingIn, 
  isPending, 
  router 
}: { 
  handleLogin: () => void; 
  session: any; 
  loggingIn: boolean; 
  isPending: boolean; 
  router: any;
}) {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/50 px-6 py-20 text-center backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <img src={caveHero} alt="" className="h-full w-full object-cover opacity-30" width={1920} height={1280} loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        </div>
        <div className="absolute -top-24 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-[color:var(--ember)]/20 blur-3xl" />

        <SectionEyebrow>Get started</SectionEyebrow>
        <h2 className="mx-auto mt-6 max-w-2xl font-display text-6xl leading-[1.05] tracking-tight text-white">
          Clone. Connect. <span className="italic text-white/80">Ship smarter.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/70">
          Integrate CodeUsagi in minutes. Sign in with GitHub, connect your
          repository, and receive automated PR summaries and fixes immediately.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <button 
            onClick={session ? () => router.push("/dashboard") : handleLogin}
            disabled={isPending || loggingIn}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 cursor-pointer"
          >
            <Github className="h-4 w-4" /> {session ? "Go to Dashboard" : "Start now with GitHub"}
          </button>
          <a 
            href="https://github.com/antcybersec/CodeUsagi"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white backdrop-blur hover:bg-white/10 cursor-pointer"
          >
            Check repository ›
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-white/50">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-black">
            <Terminal className="h-3 w-3" />
          </div>
          <span className="font-display text-base text-white/80 font-semibold">CodeUsagi</span>
          <span className="ml-2 text-white/40">© 2026. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a href="https://www.coderabbit.ai/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white">Privacy Policy</a>
          <a href="https://www.coderabbit.ai/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

// style: updated margin layout

// state: logs validation
