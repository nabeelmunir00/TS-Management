"use client";

import { useState } from "react";
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
  Menu,
  User,
  LogOut,
  Home,
} from "lucide-react";
import { useUser, SignOutButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

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
        badge: 12,
      },
      {
        label: "Projects",
        href: "/dashboard/projects",
        icon: FolderOpen,
        badge: 4,
        badgeVariant: "secondary",
      },
      {
        label: "Notes",
        href: "/dashboard/notes",
        icon: FileText,
        badge: 7,
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
        badge: 3,
      },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

// ─── Mobile Nav Items (Bottom Tab) ──────────────────────────────────────────

const MOBILE_NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { label: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
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

// ─── Components ─────────────────────────────────────────────────────────────

function NavBadge({
  badge,
  variant,
}: {
  badge: NavItem["badge"];
  variant: NavItem["badgeVariant"];
}) {
  if (!badge) return null;

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

function MobileNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 shrink-0",
          active
            ? "text-violet-600 dark:text-violet-400"
            : "text-muted-foreground",
        )}
      />
      <span className="flex-1">{item.label}</span>
      <NavBadge badge={item.badge} variant={item.badgeVariant} />
    </Link>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around px-2 py-1.5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors relative",
                isActive
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {(() => {
                const badge = (item as any).badge;
                return (
                  badge && typeof badge === "number" && badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] flex items-center justify-center font-medium">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )
                );
              })()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Mobile Navbar ──────────────────────────────────────────────────────

export default function MobileNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();

  const userInitials = isLoaded && isSignedIn ? getUserInitials(user) : "?";
  const userDisplayName =
    isLoaded && isSignedIn ? getUserDisplayName(user) : "Guest";

  return (
    <>
      {/* Mobile Header - visible only on mobile */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm">DevHub</span>
          <Badge variant="secondary" className="text-[9px] h-4 px-1">
            Beta
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  {isLoaded && isSignedIn && user?.imageUrl ? (
                    <AvatarImage src={user.imageUrl} alt={userDisplayName} />
                  ) : (
                    <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs">
                      {userInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">
                {isLoaded && isSignedIn ? userDisplayName : "My Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs">
                <Link href="/dashboard/profile" className="w-full">
                  <User className="w-3.5 h-3.5 mr-2 inline" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">
                <Link href="/dashboard/settings" className="w-full">
                  <Settings className="w-3.5 h-3.5 mr-2 inline" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isLoaded && isSignedIn ? (
                <SignOutButton>
                  <DropdownMenuItem className="text-xs text-destructive cursor-pointer">
                    <LogOut className="w-3.5 h-3.5 mr-2 inline" />
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

          {/* Menu Button - Opens Side Sheet */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
              <SheetHeader className="px-4 py-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                    <Code2 className="w-4 h-4 text-white" />
                  </div>
                  <SheetTitle className="text-sm">DevHub</SheetTitle>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">
                    Beta
                  </Badge>
                </div>
              </SheetHeader>

              {/* User Info in Sheet */}
              <div className="px-4 py-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {isLoaded && isSignedIn && user?.imageUrl ? (
                      <AvatarImage src={user.imageUrl} alt={userDisplayName} />
                    ) : (
                      <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        {userInitials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{userDisplayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {isLoaded && isSignedIn ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="px-3 py-8 space-y-6">
                  {NAV_SECTIONS.map((section) => (
                    <div key={section.title} className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-widest px-2">
                        {section.title}
                      </p>
                      {section.items.map((item) => (
                        <MobileNavLink
                          key={item.href}
                          item={item}
                          active={pathname === item.href}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Bottom Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                {isLoaded && isSignedIn ? (
                  <SignOutButton>
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-destructive hover:text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </Button>
                  </SignOutButton>
                ) : (
                  <Link href="/sign-in" className="w-full">
                    <Button variant="outline" className="w-full gap-2">
                      Sign in
                    </Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
