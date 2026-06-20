"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  FileText,
  GitBranch,
  Bot,
  BarChart2,
  Bell,
  Settings,
  Code2,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  User2,
} from "lucide-react";
import { useUser, SignOutButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeVariant?: "default" | "secondary" | "new";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface DashboardCounts {
  tasks: number;
  projects: number;
  notes: number;
}

// ─── Nav Config ──────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      {
        label: "Tasks",
        href: "/dashboard/tasks",
        icon: CheckSquare,
        badge: 0,
      },
      {
        label: "Projects",
        href: "/dashboard/projects",
        icon: FolderOpen,
        badge: 0,
        badgeVariant: "secondary",
      },
      {
        label: "Notes",
        href: "/dashboard/notes",
        icon: FileText,
        badge: 0,
        badgeVariant: "secondary",
      },
      {
        label: "Teams",
        href: "/dashboard/team",
        icon: User2,
        badge: 0,
        badgeVariant: "secondary",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        label: "System Design",
        href: "/dashboard/system-design",
        icon: GitBranch,
      },
      {
        label: "AI Assistant",
        href: "/dashboard/ai",
        icon: Bot,
        badge: "New",
        badgeVariant: "new",
      },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
        badge: 0,
      },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

// ─── Helper Functions ──────────────────────────────────────────────────────

function getUserInitials(user: any) {
  if (!user) return "?";

  if (user.fullName) {
    const names = user.fullName.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  }

  if (user.firstName) {
    return user.firstName.substring(0, 2).toUpperCase();
  }

  if (user.username) {
    return user.username.substring(0, 2).toUpperCase();
  }

  if (user.emailAddresses && user.emailAddresses.length > 0) {
    const email = user.emailAddresses[0].emailAddress;
    return email.substring(0, 2).toUpperCase();
  }

  return "?";
}

function getUserDisplayName(user: any) {
  if (!user) return "User";

  if (user.fullName) return user.fullName;
  if (user.firstName) return user.firstName;
  if (user.username) return user.username;
  if (user.emailAddresses && user.emailAddresses.length > 0) {
    return user.emailAddresses[0].emailAddress.split("@")[0];
  }
  return "User";
}

function getUserRole(user: any) {
  if (user?.publicMetadata?.role) {
    return user.publicMetadata.role as string;
  }
  return "Member";
}

// ─── Components ─────────────────────────────────────────────────────────────

function NavBadgeSkeleton() {
  return <Skeleton className="ml-auto h-4 w-8 rounded-full" />;
}

function NavBadge({
  badge,
  variant,
  loading,
}: {
  badge: NavItem["badge"];
  variant: NavItem["badgeVariant"];
  loading?: boolean;
}) {
  // Show skeleton while loading
  if (loading && (badge === 0 || badge === undefined)) {
    return <NavBadgeSkeleton />;
  }

  if (!badge && badge !== 0) return null;

  // Show 0 as "0" not empty
  if (badge === 0) {
    return (
      <Badge
        variant="outline"
        className="ml-auto text-[10px] h-4 px-1.5 font-medium text-muted-foreground"
      >
        0
      </Badge>
    );
  }

  if (variant === "new") {
    return (
      <span className="ml-auto text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
        {badge}
      </span>
    );
  }

  if (variant === "secondary") {
    return (
      <Badge
        variant="secondary"
        className="ml-auto text-[10px] h-4 px-1.5 font-medium"
      >
        {badge}
      </Badge>
    );
  }

  return (
    <Badge className="ml-auto text-[10px] h-4 px-1.5 font-medium bg-violet-600 hover:bg-violet-600 text-white">
      {badge}
    </Badge>
  );
}

function DesktopNavLink({
  item,
  collapsed,
  active,
  loading,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  loading?: boolean;
}) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group",
        active
          ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "shrink-0 transition-colors",
          collapsed ? "w-5 h-5" : "w-4 h-4",
          active
            ? "text-violet-600 dark:text-violet-400"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          <NavBadge
            badge={item.badge}
            variant={item.badgeVariant}
            loading={loading}
          />
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {item.badge !== undefined && (
            <NavBadge
              badge={item.badge}
              variant={item.badgeVariant}
              loading={loading}
            />
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

// ─── Main Desktop Sidebar ──────────────────────────────────────────────────

export default function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();

  // ─── Fetch Real Data ──────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchCounts() {
      if (!isSignedIn || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const result = await res.json();

        if (result.success && result.data) {
          const data = result.data;
          setCounts({
            tasks: data.tasks?.total || 0,
            projects: data.projects?.total || 0,
            notes: data.notes?.total || 0,
          });
        }
      } catch (error) {
        console.error("❌ Failed to fetch sidebar counts:", error);
        // Set default values on error
        setCounts({ tasks: 0, projects: 0, notes: 0 });
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, [isSignedIn, user?.id]);

  // ─── Update Nav Items with Real Data ──────────────────────────────────────

  const navItemsWithBadges = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.label === "Tasks" && counts) {
        return { ...item, badge: counts.tasks };
      }
      if (item.label === "Projects" && counts) {
        return { ...item, badge: counts.projects };
      }
      if (item.label === "Notes" && counts) {
        return { ...item, badge: counts.notes };
      }
      // Keep static badges for other items (like "New", notifications)
      return item;
    }),
  }));

  const userInitials = isLoaded && isSignedIn ? getUserInitials(user) : "?";
  const userDisplayName =
    isLoaded && isSignedIn ? getUserDisplayName(user) : "Guest";
  const userRole = isLoaded && isSignedIn ? getUserRole(user) : "";

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-background border-r border-border transition-all duration-300 ease-in-out sticky top-0",
          collapsed ? "w-[60px]" : "w-[240px]",
        )}
      >
        {/* ── Logo ── */}
        <div
          className={cn(
            "flex items-center gap-2.5 border-b border-border",
            collapsed ? "px-3 py-4 justify-center" : "px-4 py-4",
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm tracking-tight truncate">
                DevHub
              </span>
              <span className="text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-1.5 py-0.5 rounded-full shrink-0">
                Beta
              </span>
            </div>
          )}
        </div>

        {/* ── User ── */}
        <div
          className={cn(
            "border-b border-border",
            collapsed ? "px-2 py-3" : "px-3 py-3",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-auto p-1.5 gap-2.5 justify-start hover:bg-accent",
                  collapsed && "justify-center px-1",
                )}
              >
                <Avatar className="w-7 h-7">
                  {isLoaded && isSignedIn && user?.imageUrl ? (
                    <AvatarImage src={user.imageUrl} alt={userDisplayName} />
                  ) : (
                    <AvatarFallback className="bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-300 text-[11px]">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-medium truncate">
                        {userDisplayName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {isLoaded && isSignedIn ? userRole : "Not signed in"}
                      </p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">
                {isLoaded && isSignedIn ? userDisplayName : "My Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs">
                <Link href="/dashboard/profile" className="w-full">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">
                <Link href="/dashboard/billing" className="w-full">
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isLoaded && isSignedIn ? (
                <SignOutButton>
                  <DropdownMenuItem className="text-xs text-destructive cursor-pointer">
                    Sign out
                  </DropdownMenuItem>
                </SignOutButton>
              ) : (
                <DropdownMenuItem className="text-xs">
                  <Link href="/sign-in" className="w-full">
                    Sign in
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Nav ── */}
        <ScrollArea className="flex-1 py-2">
          <div className={cn("space-y-4", collapsed ? "px-2" : "px-3")}>
            {navItemsWithBadges.map((section) => (
              <div key={section.title} className="space-y-0.5">
                {!collapsed && (
                  <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest px-2.5 mb-1">
                    {section.title}
                  </p>
                )}
                {collapsed && <Separator className="my-1" />}
                {section.items.map((item) => (
                  <DesktopNavLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    active={pathname === item.href}
                    loading={loading}
                  />
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* ── Collapse Button ── */}
        <div
          className={cn(
            "border-t border-border p-2",
            collapsed ? "flex justify-center" : "",
          )}
        >
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full gap-2 text-muted-foreground hover:text-foreground text-xs h-8",
                  collapsed && "w-8 p-0 justify-center",
                )}
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-4 h-4 shrink-0" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4 shrink-0" />
                    <span>Collapse</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
