"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Users,
  UserPlus,
  UserCog,
  UserX,
  Mail,
  Shield,
  Crown,
  Loader2,
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Member {
  _id: string;
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "pending" | "invited" | "removed";
  joinedAt?: string;
  lastActiveAt?: string;
}

interface Organization {
  _id: string;
  name: string;
  slug: string;
  role: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  owner: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  admin:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  member: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400",
};

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: UserCog,
  viewer: Users,
};

const STATUS_COLORS = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  invited: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  removed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const STATUS_ICONS = {
  active: CheckCircle,
  pending: Clock,
  invited: Mail,
  removed: XCircle,
};

// ─── Skeleton ──────────────────────────────────────────────────────────────

function TeamSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
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
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TeamPage() {
  const { user, isLoaded } = useUser();

  // ── State ──
  const [members, setMembers] = useState<Member[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create Organization Dialog
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Invite Dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">(
    "member",
  );
  const [inviting, setInviting] = useState(false);

  // Remove Dialog
  const [removeOpen, setRemoveOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  // Role Change Dialog
  const [roleOpen, setRoleOpen] = useState(false);
  const [memberToUpdate, setMemberToUpdate] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "member" | "viewer">(
    "member",
  );
  const [updating, setUpdating] = useState(false);

  // ── Fetch Organizations ──
  const fetchOrganizations = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch("/api/team/organizations");
      if (!res.ok) throw new Error("Failed to fetch organizations");
      const data = await res.json();

      if (data.success) {
        setOrganizations(data.data);
        setLoading(() => false);
        if (data.data.length > 0 && !currentOrg) {
          setCurrentOrg(data.data[0]._id);
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch organizations:", error);
      toast.error("Failed to load organizations");
    }
  }, [user?.id, currentOrg]);

  // ── Fetch Members ──
  const fetchMembers = useCallback(async () => {
    if (!currentOrg) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/team/members?organizationId=${currentOrg}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();

      if (data.success) {
        setMembers(data.data);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load members",
      );
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  // ── Initial Load ──
  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchOrganizations();
    }
  }, [isLoaded, user, fetchOrganizations]);

  useEffect(() => {
    if (currentOrg) {
      fetchMembers();
    }
  }, [currentOrg, fetchMembers]);

  // ── Stats ──
  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    invited: members.filter((m) => m.status === "invited").length,
    admins: members.filter((m) => m.role === "admin" || m.role === "owner")
      .length,
  };

  // ── Handlers ──

  // Create Organization
  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setCreatingOrg(true);

    try {
      const res = await fetch("/api/team/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      toast.success(`Organization "${orgName}" created successfully!`);
      setCreateOrgOpen(false);
      setOrgName("");
      await fetchOrganizations();

      // Set the new organization as current
      if (data.data?._id) {
        setCurrentOrg(data.data._id);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create organization",
      );
    } finally {
      setCreatingOrg(false);
    }
  };

  // Invite Member
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setInviting(true);

    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: currentOrg,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to invite member");
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      await fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  // Remove Member
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setRemoving(true);

    try {
      const res = await fetch(
        `/api/team/members?organizationId=${currentOrg}&memberId=${memberToRemove.userId}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      toast.success(`${memberToRemove.email} removed from team`);
      setRemoveOpen(false);
      setMemberToRemove(null);
      await fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove");
    } finally {
      setRemoving(false);
    }
  };

  // Update Role
  const handleUpdateRole = async () => {
    if (!memberToUpdate) return;

    setUpdating(true);

    try {
      const res = await fetch("/api/team/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: currentOrg,
          userId: memberToUpdate.userId,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
      setRoleOpen(false);
      setMemberToUpdate(null);
      await fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  // ── Filter Members ──
  const filteredMembers = members.filter(
    (m) =>
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Loading ──
  if (!isLoaded || loading) {
    return <TeamSkeleton />;
  }

  // ── No Organization ──
  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Building2 className="w-16 h-16 text-muted-foreground/30" />
        <h3 className="text-lg font-medium">No Organization</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Create an organization to start managing your team and projects.
        </p>
        <Button
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          onClick={() => setCreateOrgOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Create Organization
        </Button>

        {/* Create Organization Dialog */}
        <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-500" />
                Create Organization
              </DialogTitle>
              <DialogDescription>
                Create a new organization to manage your team and projects.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  placeholder="e.g. Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This will be used to generate a unique URL for your
                  organization.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOrgOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={creatingOrg || !orgName.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {creatingOrg ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-500" />
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your team members and their roles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMembers}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setInviteOpen(true)}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </div>
        </div>

        {/* ── Organization Selector ── */}
        {organizations.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">
              Organization:
            </Label>
            <Select value={currentOrg} onValueChange={setCurrentOrg}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Total Members</p>
                <Users className="w-4 h-4 text-violet-500" />
              </div>
              <p className="text-2xl font-semibold mt-2">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Active</p>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-semibold mt-2">{stats.active}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Invited</p>
                <Mail className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-semibold mt-2">{stats.invited}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Admins</p>
                <Shield className="w-4 h-4 text-violet-500" />
              </div>
              <p className="text-2xl font-semibold mt-2">{stats.admins}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Search ── */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredMembers.length} members
          </Badge>
        </div>

        {/* ── Members Table ── */}
        <Card>
          <CardContent className="p-0">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-sm font-medium">No members found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {search
                    ? "Try adjusting your search"
                    : "Invite your first team member"}
                </p>
                {!search && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setInviteOpen(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-500px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => {
                      const RoleIcon = ROLE_ICONS[member.role] || Users;
                      const StatusIcon =
                        STATUS_ICONS[member.status] || CheckCircle;

                      return (
                        <TableRow key={member._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                {member.avatar ? (
                                  <AvatarImage
                                    src={member.avatar}
                                    alt={member.email}
                                  />
                                ) : (
                                  <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                                    {member.email.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {member.name || member.email.split("@")[0]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-xs",
                                ROLE_COLORS[member.role],
                              )}
                            >
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {ROLE_LABELS[member.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-xs",
                                STATUS_COLORS[member.status],
                              )}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {member.status.charAt(0).toUpperCase() +
                                member.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {member.joinedAt
                                ? new Date(member.joinedAt).toLocaleDateString()
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {member.role !== "owner" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-40"
                                >
                                  <DropdownMenuLabel className="text-xs">
                                    Actions
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-xs gap-2 cursor-pointer"
                                    onClick={() => {
                                      setMemberToUpdate(member);
                                      setNewRole(member.role as any);
                                      setRoleOpen(true);
                                    }}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-xs gap-2 text-destructive cursor-pointer"
                                    onClick={() => {
                                      setMemberToRemove(member);
                                      setRemoveOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {member.role === "owner" && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs">
                                    <Crown className="w-3 h-3 mr-1 text-amber-500" />
                                    Owner
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Organization owner</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* ── Create Organization Dialog ── */}
        <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-500" />
                Create Organization
              </DialogTitle>
              <DialogDescription>
                Create a new organization to manage your team and projects.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  placeholder="e.g. Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This will be used to generate a unique URL for your
                  organization.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOrgOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={creatingOrg || !orgName.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {creatingOrg ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Invite Dialog ── */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-violet-500" />
                Invite Team Member
              </DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v: any) => setInviteRole(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Remove Dialog ── */}
        <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <UserX className="w-5 h-5" />
                Remove Member
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <strong>{memberToRemove?.email}</strong> from the team?
                <br />
                <span className="text-xs text-muted-foreground">
                  This action can be undone by re-inviting them.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveMember}
                disabled={removing}
              >
                {removing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove Member"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Role Change Dialog ── */}
        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-violet-500" />
                Change Role
              </DialogTitle>
              <DialogDescription>
                Update role for <strong>{memberToUpdate?.email}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={updating}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Role"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
