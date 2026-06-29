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
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" />

      <div className="flex flex-col md:flex-row gap-6">
        <Card className="md:w-[300px] shrink-0">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <Skeleton className="w-24 h-24 rounded-full" />
              <Skeleton className="h-5 w-32 mt-3" />
              <Skeleton className="h-4 w-24 mt-1" />
              <Skeleton className="h-3 w-20 mt-1" />
              <Skeleton className="h-10 w-full mt-4" />
            </div>
            <Separator className="my-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
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
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  subtext?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {subtext && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {subtext}
              </p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
  });

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
      label: "Total Tasks",
      value: stats.totalTasks,
      icon: CheckCircle,
      color: "bg-violet-500",
      subtext: `${stats.completedTasks} completed`,
    },
    {
      label: "Projects",
      value: stats.totalProjects,
      icon: FolderOpen,
      color: "bg-blue-500",
    },
    {
      label: "Notes",
      value: stats.totalNotes,
      icon: FileText,
      color: "bg-emerald-500",
    },
    {
      label: "Organizations",
      value: stats.organizations,
      icon: Building2,
      color: "bg-amber-500",
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <User className="w-6 h-6 text-violet-500" />
            Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal information and settings
          </p>
        </div>
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
          className="gap-2"
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

      {/* Profile Card */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left - Profile Info */}
        <Card className="md:w-[300px] shrink-0">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="relative group">
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={profile.avatar || user.imageUrl}
                    alt={profile.fullName}
                  />
                  <AvatarFallback className="text-2xl bg-violet-100 text-violet-700">
                    {profile.firstName?.[0] || profile.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 p-1.5 bg-violet-600 rounded-full text-white hover:bg-violet-700 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Name */}
              <h2 className="text-xl font-semibold mt-3">
                {profile.fullName || "User"}
              </h2>
              <p className="text-sm text-muted-foreground">
                @{profile.username || "user"}
              </p>
              <Badge variant="outline" className="mt-1 text-[10px]">
                Member
              </Badge>

              {/* Stats */}
              <div className="w-full mt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Completion Rate</span>
                  <span>{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-1.5 mt-1" />
              </div>

              <Separator className="my-4" />

              {/* Info */}
              <div className="space-y-3 w-full">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Joined {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right - Edit Form */}
        <div className="flex-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
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
                      setFormData({ ...formData, lastName: e.target.value })
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

              {isEditing && (
                <div className="flex justify-end gap-2 pt-2">
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
