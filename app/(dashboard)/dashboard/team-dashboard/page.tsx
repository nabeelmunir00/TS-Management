"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  Mail,
  Shield,
  Crown,
  Loader2,
  RefreshCw,
  AlertCircle,
  Building2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  FolderOpen,
  CheckSquare,
  Award,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamDashboardData {
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
  members: {
    total: number;
    active: number;
    invited: number;
    admins: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityName: string;
    user: {
      email: string;
      name?: string;
    };
    createdAt: string;
  }[];
  memberActivity: {
    userId: string;
    email: string;
    name?: string;
    taskCount: number;
    completedTasks: number;
    lastActiveAt?: string;
  }[];
  weeklyStats: {
    day: string;
    tasks: number;
    completed: number;
  }[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACTION_COLORS = {
  create: "text-emerald-500",
  update: "text-blue-500",
  delete: "text-red-500",
  complete: "text-violet-500",
  archive: "text-amber-500",
  unarchive: "text-cyan-500",
  pin: "text-amber-500",
  unpin: "text-gray-500",
};

const STATUS_COLORS = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  invited: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

const CHART_COLORS = ["#8B5CF6", "#F59E0B", "#10B981", "#EF4444"];

// ─── Skeleton ──────────────────────────────────────────────────────────────

function TeamDashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16 mt-2" />
              <Skeleton className="h-3 w-24 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TeamDashboardPage() {
  const { user, isLoaded } = useUser();
  const [data, setData] = useState<TeamDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch Dashboard Data ──
  const fetchDashboard = useCallback(async () => {
    debugger;
    if (!user?.id) return;

    setRefreshing(true);

    try {
      // Get organization ID from localStorage or default
      const orgId = localStorage.getItem("currentOrganizationId");
      //   if (!orgId) {
      //     throw new Error("No organization selected");
      //   }

      const res = await fetch(
        `/api/team/dashboard?organizationId=6a366d73c16ded7cca83962e`,
      );
      if (!res.ok) throw new Error("Failed to fetch team dashboard");

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      toast.error("Failed to load team dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchDashboard();
    }
  }, [isLoaded, user, fetchDashboard]);

  // ── Loading ──
  if (!isLoaded || loading) {
    return <TeamDashboardSkeleton />;
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error || "No data available"}
        </p>
        <Button
          onClick={fetchDashboard}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  }

  const {
    organization,
    members,
    tasks,
    projects,
    recentActivity,
    memberActivity,
    weeklyStats,
  } = data;

  // ─── Stats Cards ──────────────────────────────────────────────────────────

  const statCards = [
    {
      title: "Team Members",
      value: members.total,
      icon: Users,
      color: "text-violet-500",
      subtext: `${members.active} active · ${members.invited} invited`,
    },
    {
      title: "Total Tasks",
      value: tasks.total,
      icon: CheckSquare,
      color: "text-blue-500",
      subtext: `${tasks.completed} completed · ${tasks.inProgress} in progress`,
    },
    {
      title: "Projects",
      value: projects.total,
      icon: FolderOpen,
      color: "text-emerald-500",
      subtext: `${projects.active} active · ${projects.completed} completed`,
    },
    {
      title: "Overdue Tasks",
      value: tasks.overdue,
      icon: AlertCircle,
      color: "text-red-500",
      subtext: `Need attention`,
    },
  ];

  // ─── Task Status Pie Data ──
  const pieData = [
    { name: "Completed", value: tasks.completed, color: "#10B981" },
    { name: "In Progress", value: tasks.inProgress, color: "#F59E0B" },
    { name: "Overdue", value: tasks.overdue, color: "#EF4444" },
    {
      name: "Others",
      value: tasks.total - tasks.completed - tasks.inProgress - tasks.overdue,
      color: "#9CA3AF",
    },
  ].filter((item) => item.value > 0);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-violet-500" />
              Team Dashboard
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {organization.name}
              <Badge variant="outline" className="text-[10px]">
                {members.admins} admins
              </Badge>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {stat.title}
                    </p>
                    <Icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <p className="text-2xl font-semibold mt-2">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {stat.subtext}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                Weekly Team Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis fontSize={12} />
                    <RechartsTooltip />
                    <Bar dataKey="tasks" fill="#8B5CF6" name="Tasks Created" />
                    <Bar
                      dataKey="completed"
                      fill="#10B981"
                      name="Tasks Completed"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Task Status Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4 text-violet-500" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs">{item.name}</span>
                        <span className="text-xs font-medium">
                          ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tasks data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Member Activity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                Member Activity
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {memberActivity.length} active members
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {memberActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No member activity yet
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {memberActivity.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                          {member.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name || member.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <p className="text-sm font-semibold">
                            {member.taskCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Tasks
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-emerald-500">
                            {member.completedTasks}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Done
                          </p>
                        </div>
                        {member.lastActiveAt && (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(member.lastActiveAt),
                                    "MMM d",
                                  )}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Active
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Last active:{" "}
                                {format(new Date(member.lastActiveAt), "PPP")}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-500" />
              Recent Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {recentActivity.slice(0, 10).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium">
                          {activity.user.name?.slice(0, 2).toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {activity.user.name || activity.user.email}
                          </span>
                          <span className="text-muted-foreground mx-1">•</span>
                          <span className="text-muted-foreground">
                            {activity.action}
                          </span>
                          <span className="mx-1">•</span>
                          <span className="font-medium">
                            {activity.entityName}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(
                            new Date(activity.createdAt),
                            "MMM d, yyyy 'at' h:mm a",
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {activity.entityType}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Footer Stats */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{members.active} active members</span>
          </div>
          <Separator orientation="vertical" className="h-3" />
          <span className="text-[11px] text-muted-foreground">
            {members.admins} admins · {tasks.total} total tasks
          </span>
          {tasks.overdue > 0 && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {tasks.overdue} overdue
              </span>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
