import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Code2,
  CheckSquare,
  GitBranch,
  Bot,
  FileText,
  Sparkles,
  ChevronRight,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden">
      {/* ── Ambient glow background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full bg-violet-800/8 blur-[120px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">DevHub</span>
          <span className="text-[10px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
            Beta
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <button className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
              Sign in
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="flex items-center gap-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 transition-colors px-4 py-2 rounded-lg">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pt-20 pb-16 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-300 font-medium">
            AI-powered workspace for developers
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-[56px] md:text-[72px] font-bold leading-[1.05] tracking-tight mb-6">
          Your dev workflow,
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400">
            finally in one place
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Tasks, notes, system design canvas, and an AI assistant — built for
          developers who want to move fast without losing track.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/sign-up">
            <button className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/25 text-sm">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/sign-in">
            <button className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all text-sm">
              Sign in to your workspace
            </button>
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-xs text-gray-600 mt-6">
          No credit card required · Free during beta
        </p>
      </section>

      {/* ── Dashboard preview mockup ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-24">
        <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur overflow-hidden shadow-2xl shadow-black/50">
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/[0.02]">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-white/10" />
              <span className="w-3 h-3 rounded-full bg-white/10" />
              <span className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white/5 border border-white/8 rounded-md px-3 py-1 text-[11px] text-gray-500 max-w-[200px]">
                devhub.app/dashboard
              </div>
            </div>
          </div>

          {/* Mockup content */}
          <div className="flex h-[340px]">
            {/* Fake sidebar */}
            <div className="w-44 border-r border-white/8 p-3 space-y-0.5 shrink-0">
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-violet-600/20 mb-3">
                <div className="w-4 h-4 rounded bg-violet-500/40" />
                <span className="text-[11px] text-violet-300 font-medium">
                  Dashboard
                </span>
              </div>
              {[
                "Tasks",
                "Projects",
                "Notes",
                "System Design",
                "AI Assistant",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                >
                  <div className="w-4 h-4 rounded bg-white/8" />
                  <span className="text-[11px] text-gray-500">{item}</span>
                </div>
              ))}
            </div>

            {/* Fake dashboard */}
            <div className="flex-1 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-36 bg-white/8 rounded mb-1.5" />
                  <div className="h-3 w-24 bg-white/5 rounded" />
                </div>
                <div className="h-7 w-20 bg-violet-600/40 rounded-lg" />
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Tasks", val: "12", color: "bg-violet-500/20" },
                  { label: "Projects", val: "4", color: "bg-blue-500/20" },
                  { label: "Notes", val: "7", color: "bg-emerald-500/20" },
                  { label: "Streak", val: "5d", color: "bg-amber-500/20" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`${s.color} rounded-xl p-3 border border-white/5`}
                  >
                    <div className="text-[10px] text-gray-500 mb-1">
                      {s.label}
                    </div>
                    <div className="text-lg font-bold text-white">{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Task rows */}
              <div className="space-y-2">
                {[
                  {
                    title: "Setup Clerk authentication",
                    done: true,
                    priority: "bg-red-500",
                  },
                  {
                    title: "Build sidebar component",
                    done: false,
                    priority: "bg-orange-500",
                  },
                  {
                    title: "Design dashboard UI",
                    done: false,
                    priority: "bg-amber-500",
                  },
                ].map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5"
                  >
                    <span
                      className={`w-1 h-6 rounded-full shrink-0 ${t.priority}`}
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${t.done ? "bg-emerald-500 border-emerald-500" : "border-white/20"}`}
                    >
                      {t.done && (
                        <span className="text-[8px] text-white">✓</span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] flex-1 ${t.done ? "line-through text-gray-600" : "text-gray-300"}`}
                    >
                      {t.title}
                    </span>
                    <span className="text-[10px] text-gray-600">Today</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Glow under mockup */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-violet-600/15 blur-3xl rounded-full" />
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-medium text-violet-400 uppercase tracking-widest mb-3">
            Everything you need
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Built for how developers actually work
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: CheckSquare,
              color: "bg-violet-500/15 text-violet-400",
              title: "Task Management",
              desc: "Create tasks, set priorities, track subtasks. Board and list views. Filter by status, priority, or assignee.",
              tags: ["Kanban board", "Subtasks", "Due dates"],
            },
            {
              icon: FileText,
              color: "bg-blue-500/15 text-blue-400",
              title: "Notes",
              desc: "Quick notes with tags and pinning. Never lose an idea, code snippet, or meeting note again.",
              tags: ["Tagging", "Pinned notes", "Search"],
            },
            {
              icon: GitBranch,
              color: "bg-emerald-500/15 text-emerald-400",
              title: "System Design Canvas",
              desc: "Visual architecture canvas with drag-and-drop components. Design databases, APIs, microservices and more.",
              tags: ["12 node types", "Export PNG", "Connections"],
            },
            {
              icon: Bot,
              color: "bg-amber-500/15 text-amber-400",
              title: "AI Assistant",
              desc: "Describe a task and AI fills description, tags, subtasks, and priority. Generate entire system architectures in seconds.",
              tags: ["Gemini AI", "Task generation", "Architecture AI"],
            },
            {
              icon: Shield,
              color: "bg-red-500/15 text-red-400",
              title: "Secure Auth",
              desc: "Powered by Clerk. OAuth with Google and GitHub, secure sessions, and user management out of the box.",
              tags: ["OAuth", "Clerk", "Secure"],
            },
            {
              icon: Zap,
              color: "bg-pink-500/15 text-pink-400",
              title: "Built to be fast",
              desc: "Next.js App Router, MongoDB, real-time updates. No page refreshes when you create or edit tasks.",
              tags: ["Next.js 14", "MongoDB", "Real-time"],
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {f.desc}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-gray-600 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 py-20 border-t border-white/5">
        <div className="text-center mb-14">
          <p className="text-xs font-medium text-violet-400 uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Up and running in minutes
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              icon: Globe,
              title: "Sign up free",
              desc: "Create your account with email, Google, or GitHub. No credit card needed.",
            },
            {
              step: "02",
              icon: CheckSquare,
              title: "Set up your workspace",
              desc: "Create projects, add tasks, and organize your notes. Import existing work in seconds.",
            },
            {
              step: "03",
              icon: Sparkles,
              title: "Let AI help",
              desc: "Use AI to generate task details, system architecture diagrams, and smart suggestions.",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="relative">
                <div className="text-[11px] font-bold text-violet-500/50 tracking-widest mb-4">
                  {s.step}
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 py-20">
        <div className="relative rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-blue-600/5 p-12 text-center overflow-hidden">
          {/* Inner glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-violet-300 font-medium">
              Free during beta
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to take control
            <br />
            of your dev workflow?
          </h2>
          <p className="text-gray-400 text-base mb-8 max-w-md mx-auto">
            Join developers using DevHub to ship faster and stay organized.
          </p>

          <Link href="/sign-up">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/30 text-sm">
              Create your free account
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-400">DevHub</span>
          </div>
          <p className="text-xs text-gray-600">
            Built for developers · Powered by Next.js, MongoDB & Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}
