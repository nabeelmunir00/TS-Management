"use client";

import { useState, useEffect, useCallback } from "react";
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
  Target,
  Award,
  Activity,
  Loader2,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "todo" | "in-progress" | "review" | "done";

interface Task {
  _id: string;
  id?: string;
  title: string;
  project?: string;
  projectName?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
}

interface Project {
  _id: string;
  id?: string;
  name: string;
  tasksCount: number;
  completedTasks: number;
  color: string;
}

interface Note {
  _id: string;
  id?: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  totalProjects: number;
  activeProjects: number;
  totalNotes: number;
  pinnedNotes: number;
  dueToday: number;
  inProgress: number;
  todo: number;
  review: number;
  highPriority: number;
  overdue: number;
  completionRate: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> =
  {
    urgent: {
      label: "Urgent",
      className: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    },
    high: {
      label: "High",
      className:
        "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
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
  review: <AlertCircle className="w-3.5 h-3.5 text-purple-500" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  review: "Review",
  done: "Done",
};

const PROJECT_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-pink-500",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getRandomColor() {
  return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
}

// ─── Skeleton Components ───────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <Skeleton className="h-3 w-48 mb-1" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2 pt-4 px-4">
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>

            <Card className="border-border shadow-none">
              <CardHeader className="pb-2 pt-4 px-4">
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-[120px] flex items-center justify-center">
                  <Skeleton className="h-[100px] w-[100px] rounded-full" />
                </div>
                <div className="flex justify-center gap-3 mt-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Skeleton className="w-2.5 h-2.5 rounded-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </CardHeader>
              <Skeleton className="h-0.5 mx-4 mb-3" />
              <CardContent className="px-4 pb-4 space-y-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 px-2">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Skeleton className="h-4 w-12 rounded-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-16" />
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-2 w-2 rounded-full" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-1 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2.5">
                    <Skeleton className="w-7 h-7 rounded-lg shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-4 w-24 mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-border shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-border space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();

  // ── State ──
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalNotes: 0,
    pinnedNotes: 0,
    dueToday: 0,
    inProgress: 0,
    todo: 0,
    review: 0,
    highPriority: 0,
    overdue: 0,
    completionRate: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Fetch Dashboard Data (Single API Call) ──────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ Single API call for everything
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const result = await res.json();

      if (result.success && result.data) {
        const data = result.data;

        // ─── Set Stats ──────────────────────────────────────────────────
        if (data.tasks) {
          setStats({
            totalTasks: data.tasks.total || 0,
            completedTasks: data.tasks.completed || 0,
            inProgress: data.tasks.inProgress || 0,
            todo: data.tasks.todo || 0,
            review: data.tasks.review || 0,
            highPriority: data.tasks.highPriority || 0,
            overdue: data.tasks.overdue || 0,
            completionRate: data.tasks.completionRate || 0,
            totalProjects: data.projects?.total || 0,
            activeProjects: data.projects?.active || 0,
            totalNotes: data.notes?.total || 0,
            pinnedNotes: data.notes?.pinned || 0,
            dueToday: data.tasks.dueToday || 0,
          });
        }

        // ─── Set Tasks ──────────────────────────────────────────────────
        if (data.recentTasks && Array.isArray(data.recentTasks)) {
          setTasks(
            data.recentTasks.map((t: any) => ({
              _id: t._id || t.id,
              id: t._id || t.id,
              title: t.title || "Untitled",
              project: t.projectName || t.project?.name || "No Project",
              projectName: t.projectName || t.project?.name,
              priority: t.priority || "medium",
              status: t.status || "todo",
              dueDate: t.dueDate,
            })),
          );
        } else {
          setTasks([]);
        }

        // ─── Set Projects ──────────────────────────────────────────────
        // ✅ Projects list directly from dashboard API
        if (data.projects?.list && Array.isArray(data.projects.list)) {
          setProjects(
            data.projects.list.map((p: any) => ({
              _id: p._id || p.id,
              id: p._id || p.id,
              name: p.name || "Untitled Project",
              tasksCount: p.tasksCount || 0,
              completedTasks: p.completedTasks || 0,
              color: p.color || getRandomColor(),
            })),
          );
        } else {
          setProjects([]);
        }

        // ─── Set Notes ──────────────────────────────────────────────────
        if (data.recentNotes && Array.isArray(data.recentNotes)) {
          setNotes(
            data.recentNotes.map((n: any) => ({
              _id: n._id || n.id,
              id: n._id || n.id,
              title: n.title || "Untitled Note",
              content: n.content || "",
              tags: n.tags || [],
              createdAt: n.createdAt || new Date().toISOString(),
            })),
          );
        } else {
          setNotes([]);
        }
      }
    } catch (err) {
      console.error("❌ Failed to fetch dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchDashboardData();
    }
  }, [isLoaded, user, fetchDashboardData]);

  // ── Handlers ──
  const toggleTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-status" }),
      });

      if (!res.ok) throw new Error("Failed to toggle task");

      const data = await res.json();
      const updatedTask = data.data || data;

      setTasks((prev) =>
        prev.map((t) =>
          t._id === id || t.id === id
            ? { ...t, status: updatedTask.status }
            : t,
        ),
      );

      const currentTask = tasks.find((t) => t._id === id || t.id === id);
      const wasCompleted = currentTask?.status === "done";
      const isNowCompleted = updatedTask.status === "done";

      if (wasCompleted !== isNowCompleted) {
        setStats((prev) => ({
          ...prev,
          completedTasks: isNowCompleted
            ? prev.completedTasks + 1
            : prev.completedTasks - 1,
        }));
      }
    } catch (err) {
      console.error("❌ Toggle error:", err);
    }
  };

  const getUserName = () => {
    if (!isLoaded) return "Loading...";
    if (!isSignedIn) return "Guest";
    if (user.fullName) return user.fullName;
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      return user.emailAddresses[0].emailAddress.split("@")[0];
    }
    return "User";
  };

  const userName = getUserName();
  const completedCount = stats.completedTasks;
  const totalTasks = stats.totalTasks;

  // ── Chart Data ──
  const taskStatusData = [
    { name: "Todo", value: stats.todo, color: "#9CA3AF" },
    { name: "In Progress", value: stats.inProgress, color: "#F59E0B" },
    { name: "Review", value: stats.review, color: "#8B5CF6" },
    { name: "Done", value: stats.completedTasks, color: "#10B981" },
  ].filter((item) => item.value > 0);

  // ── Stats Cards ──
  const STATS_CARDS = [
    {
      label: "Total tasks",
      value: totalTasks,
      sub: `${stats.dueToday} due today`,
      icon: CheckSquare,
      color: "text-violet-600",
      href: "/tasks",
    },
    {
      label: "Active projects",
      value: stats.activeProjects,
      sub: `${stats.totalProjects} total`,
      icon: FolderOpen,
      color: "text-blue-600",
      href: "/projects",
    },
    {
      label: "Notes",
      value: stats.totalNotes,
      sub: `${stats.pinnedNotes} pinned`,
      icon: FileText,
      color: "text-emerald-600",
      href: "/notes",
    },
    {
      label: "Completed",
      value: `${stats.completionRate}%`,
      sub: `${completedCount}/${totalTasks || 1} tasks done`,
      icon: CheckCircle2,
      color: "text-emerald-500",
      href: "/tasks",
    },
  ];

  // ── Loading State ──
  if (!isLoaded || loading) {
    return <DashboardSkeleton />;
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background ">
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
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="gap-1.5 text-xs h-8"
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            Refresh
          </Button>
          <Link href="/tasks/new">
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              New task
            </Button>
          </Link>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS_CARDS.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.label} href={s.href}>
                  <Card className="border-border shadow-none hover:border-violet-200 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">
                          {s.label}
                        </p>
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
                </Link>
              );
            })}
          </div>

          {/* ── Charts Row ── */}
          {taskStatusData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Completion Rate */}
              <Card className="border-border shadow-none">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-500" />
                    Task Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress
                        value={stats.completionRate}
                        className="h-2 bg-muted [&>div]:bg-violet-500"
                      />
                    </div>
                    <span className="text-2xl font-bold text-violet-500">
                      {stats.completionRate}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {completedCount} of {totalTasks} tasks completed
                  </p>
                </CardContent>
              </Card>

              {/* Task Status Distribution */}
              <Card className="border-border shadow-none">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-500" />
                    Task Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {taskStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-1">
                    {taskStatusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {item.name} ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tasks — takes 2 cols */}
            <Card className="lg:col-span-2 border-border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-medium">
                  Recent tasks
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{totalTasks} done
                  </span>
                  <Link href="/tasks">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                    >
                      View all <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <Progress
                value={totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0}
                className="h-0.5 mx-4 mb-3 bg-muted [&>div]:bg-violet-500"
              />
              <CardContent className="px-4 pb-4 space-y-1">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No tasks yet
                    </p>
                    <Link href="/tasks/new">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create your first task
                      </Button>
                    </Link>
                  </div>
                ) : (
                  tasks.slice(0, 5).map((task) => (
                    <div
                      key={task._id || task.id}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-accent/50 cursor-pointer group transition-colors"
                      onClick={() => toggleTask(task._id || task.id!)}
                    >
                      <button className="shrink-0" aria-label="Toggle task">
                        {STATUS_ICON[task.status] || (
                          <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
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
                          {task.project || "No Project"}
                          {task.status && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              {STATUS_LABEL[task.status] || task.status}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority && (
                          <span
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              PRIORITY_CONFIG[task.priority]?.className ||
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {PRIORITY_CONFIG[task.priority]?.label ||
                              task.priority}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
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
                  <Link href="/projects">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                    >
                      View all <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {projects.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground">
                        No active projects
                      </p>
                      <Link href="/projects/new">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Create project
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    projects.slice(0, 4).map((p) => {
                      const pct =
                        p.tasksCount > 0
                          ? Math.round((p.completedTasks / p.tasksCount) * 100)
                          : 0;
                      return (
                        <Link key={p._id || p.id} href={`/projects/${p._id}`}>
                          <div className="space-y-1.5 cursor-pointer hover:bg-accent/30 p-1 rounded-lg transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    p.color || getRandomColor(),
                                  )}
                                />
                                <span className="text-xs font-medium truncate">
                                  {p.name}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {p.completedTasks || 0}/{p.tasksCount || 0}
                              </span>
                            </div>
                            <Progress
                              value={pct}
                              className="h-1 bg-muted [&>div]:bg-violet-500"
                            />
                          </div>
                        </Link>
                      );
                    })
                  )}
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
                        {stats.dueToday > 0
                          ? `You have ${stats.dueToday} task${
                              stats.dueToday > 1 ? "s" : ""
                            } due today. Focus on high-priority items first.`
                          : stats.overdue > 0
                            ? `You have ${stats.overdue} overdue task${
                                stats.overdue > 1 ? "s" : ""
                              }. Consider rescheduling or prioritizing them.`
                            : "You're all caught up! Great job staying on top of your tasks."}
                      </p>
                      <Link href="/tasks">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-0 text-[11px] text-violet-600 hover:text-violet-700 hover:bg-transparent mt-1 gap-1"
                        >
                          View all tasks <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
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
              <Link href="/notes">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {notes.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <Link href="/notes/new">
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create your first note
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {notes.slice(0, 3).map((note) => (
                    <Link key={note._id || note.id} href={`/notes/${note._id}`}>
                      <div className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          {note.tags && note.tags.length > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4 px-1.5 font-medium"
                            >
                              #{note.tags[0]}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(note.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </div>
                        <p className="text-xs font-medium truncate">
                          {note.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {note.content
                            ? note.content.slice(0, 60) + "..."
                            : "No content"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Quick stats row ── */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {totalTasks > 0
                  ? `${stats.completionRate}% tasks completed`
                  : "No tasks yet"}
              </span>
            </div>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-[11px] text-muted-foreground">
              {stats.activeProjects} active projects · {stats.totalNotes} notes
            </span>
            {stats.overdue > 0 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-[11px] text-red-500 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {stats.overdue} overdue
                </span>
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
