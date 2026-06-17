"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  CheckSquare,
  FolderOpen,
  FileText,
  Bot,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  Circle,
  AlertCircle,
  CheckCircle2,
  Flame,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low";
type TaskStatus = "todo" | "in-progress" | "done";

interface Task {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  status: TaskStatus;
  due: string;
}

interface Project {
  id: string;
  name: string;
  tasks: number;
  done: number;
  color: string;
}

interface Note {
  id: string;
  title: string;
  preview: string;
  tag: string;
  time: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const TASKS: Task[] = [
  {
    id: "1",
    title: "Setup authentication with Clerk",
    project: "DevHub",
    priority: "high",
    status: "done",
    due: "Today",
  },
  {
    id: "2",
    title: "Build sidebar component",
    project: "DevHub",
    priority: "high",
    status: "in-progress",
    due: "Today",
  },
  {
    id: "3",
    title: "Design dashboard UI",
    project: "DevHub",
    priority: "medium",
    status: "in-progress",
    due: "Tomorrow",
  },
  {
    id: "4",
    title: "Integrate MongoDB with Mongoose",
    project: "DevHub",
    priority: "medium",
    status: "todo",
    due: "Jun 20",
  },
  {
    id: "5",
    title: "Setup OpenAI API integration",
    project: "DevHub",
    priority: "low",
    status: "todo",
    due: "Jun 22",
  },
];

const PROJECTS: Project[] = [
  { id: "1", name: "DevHub", tasks: 18, done: 6, color: "bg-violet-500" },
  { id: "2", name: "Portfolio v3", tasks: 12, done: 9, color: "bg-blue-500" },
  {
    id: "3",
    name: "E-commerce API",
    tasks: 24,
    done: 11,
    color: "bg-emerald-500",
  },
  { id: "4", name: "Mobile App", tasks: 8, done: 2, color: "bg-amber-500" },
];

const NOTES: Note[] = [
  {
    id: "1",
    title: "System Design — Auth Flow",
    preview: "Clerk webhook → MongoDB user sync → JWT...",
    tag: "Architecture",
    time: "2h ago",
  },
  {
    id: "2",
    title: "API Endpoints Plan",
    preview: "POST /tasks, GET /tasks/:id, PATCH...",
    tag: "Backend",
    time: "Yesterday",
  },
  {
    id: "3",
    title: "UI Components Checklist",
    preview: "Sidebar ✅, Navbar ✅, Dashboard...",
    tag: "Frontend",
    time: "2 days ago",
  },
];

const STATS = [
  {
    label: "Total tasks",
    value: 12,
    sub: "4 due today",
    icon: CheckSquare,
    color: "text-violet-600",
  },
  {
    label: "Active projects",
    value: 4,
    sub: "2 in progress",
    icon: FolderOpen,
    color: "text-blue-600",
  },
  {
    label: "Notes",
    value: 7,
    sub: "1 pinned",
    icon: FileText,
    color: "text-emerald-600",
  },
  {
    label: "Streak",
    value: "5d",
    sub: "Keep it up!",
    icon: Flame,
    color: "text-amber-500",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> =
  {
    high: {
      label: "High",
      className: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    },
    medium: {
      label: "Medium",
      className:
        "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    },
    low: {
      label: "Low",
      className:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
  };

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle className="w-3.5 h-3.5 text-muted-foreground" />,
  "in-progress": <AlertCircle className="w-3.5 h-3.5 text-blue-500" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "done" ? "todo" : "done" }
          : t,
      ),
    );
  }

  const completedCount = tasks.filter((t) => t.status === "done").length;

  // Get user's display name from Clerk
  const getUserName = () => {
    if (!isLoaded) return "Loading...";
    if (!isSignedIn) return "Guest";

    // Try to get full name first
    if (user.fullName) return user.fullName;

    // Fallback to first name
    if (user.firstName) return user.firstName;

    // Fallback to username
    if (user.username) return user.username;

    // Final fallback to email
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      return user.emailAddresses[0].emailAddress.split("@")[0];
    }

    return "User";
  };

  // Get user's avatar
  const getUserAvatar = () => {
    if (!isLoaded || !isSignedIn) return null;
    return user.imageUrl;
  };

  const userName = getUserName();
  const userAvatar = getUserAvatar();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              {getGreeting()}, {userName} 👋
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSignedIn && (
            <Badge variant="outline" className="text-xs gap-1.5 h-8">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <Bot className="w-3.5 h-3.5" />
            Ask AI
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            New task
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="border-border shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <Icon className={cn("w-4 h-4", s.color)} />
                    </div>
                    <p className="text-2xl font-semibold tracking-tight">
                      {s.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {s.sub}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tasks — takes 2 cols */}
            <Card className="lg:col-span-2 border-border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-medium">
                  Today's tasks
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{tasks.length} done
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <Progress
                value={(completedCount / tasks.length) * 100}
                className="h-0.5 mx-4 mb-3 bg-muted [&>div]:bg-violet-500"
              />
              <CardContent className="px-4 pb-4 space-y-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-accent/50 cursor-pointer group transition-colors"
                    onClick={() => toggleTask(task.id)}
                  >
                    <button className="shrink-0" aria-label="Toggle task">
                      {STATUS_ICON[task.status]}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm truncate",
                          task.status === "done" &&
                            "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <FolderOpen className="w-3 h-3" />
                        {task.project}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                          PRIORITY_CONFIG[task.priority].className,
                        )}
                      >
                        {PRIORITY_CONFIG[task.priority].label}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.due}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Right col */}
            <div className="space-y-4">
              {/* Projects */}
              <Card className="border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">
                    Projects
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {PROJECTS.map((p) => {
                    const pct = Math.round((p.done / p.tasks) * 100);
                    return (
                      <div key={p.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                p.color,
                              )}
                            />
                            <span className="text-xs font-medium truncate">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {p.done}/{p.tasks}
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          className="h-1 bg-muted [&>div]:bg-violet-500"
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* AI Tip */}
              <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">
                        AI Suggestion
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        You have 2 high-priority tasks due today. Focus on the
                        auth setup first — it unblocks everything else.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-0 text-[11px] text-violet-600 hover:text-violet-700 hover:bg-transparent mt-1 gap-1"
                      >
                        Ask AI for help <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Recent Notes ── */}
          <Card className="border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-medium">
                Recent notes
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {NOTES.map((note, i) => (
                  <div key={note.id}>
                    <div className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1.5 font-medium"
                        >
                          {note.tag}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {note.time}
                        </span>
                      </div>
                      <p className="text-xs font-medium truncate">
                        {note.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {note.preview}
                      </p>
                    </div>
                    {i < NOTES.length - 1 && <div className="md:hidden mt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Quick stats row ── */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                Productivity up{" "}
                <span className="text-emerald-600 font-medium">18%</span> this
                week
              </span>
            </div>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-[11px] text-muted-foreground">
              Last updated just now
            </span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
