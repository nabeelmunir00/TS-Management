// app/dashboard/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  User,
  Mail,
  Calendar,
  CheckCircle,
  FolderOpen,
  FileText,
  Users,
  Edit,
  Save,
  X,
  Loader2,
  Camera,
  Building2,
  TrendingUp,
  Clock,
  Award,
  Activity,
  Settings,
  LogOut,
  Shield,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalTasks: number;
    completedTasks: number;
    totalProjects: number;
    totalNotes: number;
    organizations: number;
    joinedAt: string;
  };
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card Skeleton */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <Skeleton className="w-28 h-28 rounded-full" />
              <Skeleton className="h-6 w-32 mt-4" />
              <Skeleton className="h-4 w-24 mt-1" />
              <Skeleton className="h-5 w-20 mt-2" />
              <div className="w-full mt-4">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-2 w-full mt-1" />
              </div>
              <Separator className="my-4" />
              <div className="space-y-3 w-full">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Skeleton */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-12 mt-1" />
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtext,
  trend,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  subtext?: string;
  trend?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtext && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {subtext}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-500">{trend}</span>
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0", color)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Activity Item ─────────────────────────────────────────────────────────

function ActivityItem({
  icon: Icon,
  title,
  time,
  color,
}: {
  icon: any;
  title: string;
  time: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn("p-2 rounded-full", color)}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoaded, signOut } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
  });
  const [activeTab, setActiveTab] = useState("overview");

  // ─── Fetch Profile ──────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;

      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();

        if (data.success) {
          setProfile(data.data);
          setFormData({
            firstName: data.data.firstName || "",
            lastName: data.data.lastName || "",
            username: data.data.username || "",
          });
        }
      } catch (error) {
        console.error("❌ Failed to fetch profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded && user) {
      fetchProfile();
    }
  }, [isLoaded, user]);

  // ─── Save Profile ──────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setProfile((prev) => ({
        ...prev!,
        firstName: data.data.firstName,
        lastName: data.data.lastName,
        fullName: data.data.fullName,
        username: data.data.username,
      }));

      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading ──
  if (!isLoaded || loading) {
    return <ProfileSkeleton />;
  }

  // ─── No User ──
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <User className="w-16 h-16 text-muted-foreground/30" />
        <h3 className="text-lg font-medium">Not Signed In</h3>
        <p className="text-sm text-muted-foreground">
          Please sign in to view your profile.
        </p>
      </div>
    );
  }

  // ─── No Profile ──
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  const { stats } = profile;
  const completionRate =
    stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  // ─── Stat Cards ──────────────────────────────────────────────────────────

  const statCards = [
    {
      label: "Tasks",
      value: stats.totalTasks,
      icon: CheckCircle,
      color: "bg-gradient-to-br from-violet-500 to-purple-600",
      subtext: `${stats.completedTasks} completed`,
      trend: `${completionRate}% completion`,
    },
    {
      label: "Projects",
      value: stats.totalProjects,
      icon: FolderOpen,
      color: "bg-gradient-to-br from-blue-500 to-indigo-600",
      subtext: "Active projects",
    },
    {
      label: "Notes",
      value: stats.totalNotes,
      icon: FileText,
      color: "bg-gradient-to-br from-emerald-500 to-teal-600",
      subtext: "Total notes",
    },
    {
      label: "Organizations",
      value: stats.organizations,
      icon: Building2,
      color: "bg-gradient-to-br from-amber-500 to-orange-600",
      subtext: "Teams",
    },
  ];

  // ─── Activity Items ──────────────────────────────────────────────────────

  const activities = [
    {
      icon: CheckCircle,
      title: "Completed a task: " + (profile.fullName || "User"),
      time: "2 hours ago",
      color: "bg-emerald-500",
    },
    {
      icon: FolderOpen,
      title: "Created a new project",
      time: "1 day ago",
      color: "bg-blue-500",
    },
    {
      icon: FileText,
      title: "Updated notes",
      time: "3 days ago",
      color: "bg-violet-500",
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-500" />
              Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal information and activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign out from your account</p>
              </TooltipContent>
            </Tooltip>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  setFormData({
                    firstName: profile.firstName || "",
                    lastName: profile.lastName || "",
                    username: profile.username || "",
                  });
                }
                setIsEditing(!isEditing);
              }}
              className={cn(
                "gap-2",
                isEditing && "bg-violet-600 hover:bg-violet-700 text-white",
              )}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Profile Card ── */}
          <Card className="lg:col-span-1 border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className="relative group">
                  <Avatar className="w-28 h-28 ring-4 ring-violet-100 dark:ring-violet-900/30">
                    <AvatarImage
                      src={profile.avatar || user.imageUrl}
                      alt={profile.fullName}
                    />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      {profile.firstName?.[0] || profile.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-1 right-1 p-2 bg-violet-600 rounded-full text-white hover:bg-violet-700 transition-all shadow-lg hover:scale-110">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Name */}
                <h2 className="text-xl font-bold mt-4">
                  {profile.fullName || "User"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{profile.username || "user"}
                </p>
                <Badge variant="secondary" className="mt-2 text-[10px] gap-1">
                  <Shield className="w-3 h-3" />
                  Member
                </Badge>

                {/* Completion Rate */}
                <div className="w-full mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Completion Rate</span>
                    <span className="font-semibold text-violet-600">
                      {completionRate}%
                    </span>
                  </div>
                  <Progress value={completionRate} className="h-1.5 mt-1.5" />
                </div>

                <Separator className="my-4" />

                {/* Info */}
                <div className="space-y-3 w-full">
                  <div className="flex items-center gap-3 text-sm p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground truncate">
                      {profile.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Joined {format(new Date(profile.createdAt), "MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {stats.totalTasks} tasks created
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Right: Content ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Tabs ── */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* ── Overview Tab ── */}
              <TabsContent value="overview" className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {statCards.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                  ))}
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4 text-violet-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {activities.map((activity, i) => (
                      <ActivityItem key={i} {...activity} />
                    ))}
                    {activities.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No recent activity
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Settings Tab ── */}
              <TabsContent value="settings">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Settings className="w-4 h-4 text-violet-500" />
                      Personal Information
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Update your personal details
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Edit Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          First Name
                        </Label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              firstName: e.target.value,
                            })
                          }
                          disabled={!isEditing}
                          className="text-sm h-10"
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Last Name</Label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lastName: e.target.value,
                            })
                          }
                          disabled={!isEditing}
                          className="text-sm h-10"
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Username</Label>
                      <Input
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        disabled={!isEditing}
                        className="text-sm h-10"
                        placeholder="Username"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        This will be used to identify you across the platform.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Email</Label>
                      <Input
                        value={profile.email}
                        disabled
                        className="text-sm h-10 bg-muted/50 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Email cannot be changed from here. Contact support.
                      </p>
                    </div>

                    {isEditing && (
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              firstName: profile.firstName || "",
                              lastName: profile.lastName || "",
                              username: profile.username || "",
                            });
                            setIsEditing(false);
                          }}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
