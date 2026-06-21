// lib/permissions.ts
import { MemberRole } from "@/lib/models/TeamMember";

export type Permission =
  | "view_members"
  | "invite_members"
  | "change_roles"
  | "remove_members"
  | "delete_organization"
  | "manage_settings";

export const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [
    "view_members",
    "invite_members",
    "change_roles",
    "remove_members",
    "delete_organization",
    "manage_settings",
  ],
  admin: [
    "view_members",
    "invite_members",
    "change_roles",
    "remove_members",
    "manage_settings",
  ],
  member: ["view_members"],
  viewer: ["view_members"],
};

export function hasPermission(
  role: MemberRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export function canManageMember(
  currentRole: MemberRole,
  targetRole: MemberRole,
): boolean {
  const roleHierarchy: Record<MemberRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return roleHierarchy[currentRole] > roleHierarchy[targetRole];
}

export function canChangeRole(
  currentRole: MemberRole,
  targetRole: MemberRole,
): boolean {
  if (currentRole === "owner") return true;
  if (currentRole === "admin" && targetRole !== "owner") return true;
  return false;
}
