"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
  Mail,
  ArrowRight,
  Users,
  Shield,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvitationDetails {
  email: string;
  role: "admin" | "member" | "viewer";
  organizationName: string;
  expiresAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS = {
  admin: "Full access to manage team members and settings",
  member: "Can create and manage tasks and projects",
  viewer: "Read-only access to view team content",
};

const ROLE_ICONS = {
  admin: Shield,
  member: Users,
  viewer: Mail,
};

const ROLE_COLORS = {
  admin:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  member: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { redirectToSignIn } = useClerk();

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<InvitationDetails | null>(null);

  // ── Fetch Invitation Details ─────────────────────────────────────────────

  useEffect(() => {
    async function fetchInvitation() {
      if (!token) return;

      try {
        const res = await fetch(`/api/team/invitations/${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Invalid invitation");
        }

        setDetails(data.data);
        setStatus("idle");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Invalid invitation",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  // ── Accept Invitation ─────────────────────────────────────────────────────

  const handleAccept = async () => {
    if (!user) return;

    setAccepting(true);

    try {
      const res = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      setStatus("success");
      setMessage(
        `You have successfully joined ${details?.organizationName || "the organization"}!`,
      );
      toast.success("Welcome to the team! 🎉");

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to accept invitation",
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to accept invitation",
      );
    } finally {
      setAccepting(false);
    }
  };

  // ─── Handle Sign In ──────────────────────────────────────────────────────

  const handleSignIn = () => {
    // ✅ Use redirectToSignIn with redirect URL
    const redirectUrl = `/invite/${token}`;
    redirectToSignIn({ redirectUrl });
  };

  // ─── Loading State ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
              <div className="space-y-2 text-center">
                <Skeleton className="h-6 w-40 mx-auto" />
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Success State ──
  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="max-w-md w-full border-emerald-200 dark:border-emerald-800 shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome aboard! 🎉</h2>
            <p className="text-muted-foreground mb-2">{message}</p>
            {details && (
              <Badge variant="outline" className="mb-4">
                <Building2 className="w-3 h-3 mr-1" />
                {details.organizationName}
              </Badge>
            )}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Redirecting to dashboard...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Error State ──
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-800 shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Invitation Issue</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Not Signed In ──
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-8 h-8 text-violet-500" />
            </div>
            <CardTitle className="text-2xl">You're almost there!</CardTitle>
            <CardDescription>
              Please sign in to accept the invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {details && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium">
                    {details.organizationName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={ROLE_COLORS[details.role]}>
                    {ROLE_LABELS[details.role]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{details.email}</span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSignIn}
              className="bg-violet-600 hover:bg-violet-700 text-white w-full gap-2"
            >
              <Mail className="w-4 h-4" />
              Sign In to Accept
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ─── Accept Invitation (Signed In) ──
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="max-w-md w-full shadow-lg border-violet-200 dark:border-violet-800">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-8 h-8 text-violet-500" />
          </div>
          <CardTitle className="text-2xl">You're Invited! 🎯</CardTitle>
          <CardDescription>
            Join <strong>{details?.organizationName}</strong> and start
            collaborating
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                {user?.emailAddresses?.[0]?.emailAddress
                  ?.slice(0, 2)
                  .toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">
                {user?.fullName || user?.firstName || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
          </div>

          {/* Invitation Details */}
          {details && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {details.organizationName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={ROLE_COLORS[details.role]}>
                    {ROLE_LABELS[details.role]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-xs">{details.email}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(details.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Role Description */}
              <div className="bg-muted/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">What you'll get:</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[details.role]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Accept Button */}
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="bg-violet-600 hover:bg-violet-700 text-white w-full gap-2 text-base py-6"
          >
            {accepting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Accept Invitation
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By accepting, you agree to join this organization.
            <br />
            You can switch between organizations anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
