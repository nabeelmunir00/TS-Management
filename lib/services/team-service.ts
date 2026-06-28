// lib/services/team-service.ts
import connectDB from "@/lib/db";
import Organization from "@/lib/models/Organization";
import TeamMember, { MemberRole } from "@/lib/models/TeamMember";
import Invitation from "@/lib/models/Invitation";
import {
  hasPermission,
  canManageMember,
  canChangeRole,
} from "@/lib/permissions";
import { v4 as uuidv4 } from "uuid";
import { sendTeamInviteEmail } from "@/lib/email/email-helper";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  userId: string;
  name: string;
  email: string;
}

export interface InviteMemberInput {
  organizationId: string;
  invitedBy: string;
  email: string;
  role: "admin" | "member" | "viewer";
}

export interface UpdateMemberInput {
  organizationId: string;
  userId: string;
  role: "admin" | "member" | "viewer";
  currentUserId: string; // ✅ Added for permission check
}

export interface RemoveMemberInput {
  organizationId: string;
  userId: string;
  currentUserId: string; // ✅ Added for permission check
}

export interface AcceptInvitationInput {
  token: string;
  userId: string;
  email: string;
}

// ─── Helper: Get User Role ─────────────────────────────────────────────────

export async function getUserRole(organizationId: string, userId: string) {
  const member = await TeamMember.findOne({
    organizationId,
    userId,
    status: "active",
  });

  return member?.role || null;
}

// ─── Helper: Check Permission ──────────────────────────────────────────────

export async function checkPermission(
  organizationId: string,
  userId: string,
  permission: string,
): Promise<boolean> {
  const role = await getUserRole(organizationId, userId);
  if (!role) return false;
  return hasPermission(role, permission as any);
}

// ─── 1. Create Organization ──────────────────────────────────────────────

export async function createOrganization(data: CreateOrganizationInput) {
  try {
    await connectDB();

    if (!data.name || !data.name.trim()) {
      return { success: false, error: "Organization name is required" };
    }

    const slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    const existing = await Organization.findOne({ slug });
    if (existing) {
      return { success: false, error: "Organization name already taken" };
    }

    const organization = await Organization.create({
      name: data.name.trim(),
      slug,
      ownerId: data.userId,
    });

    await TeamMember.create({
      organizationId: organization._id,
      userId: data.userId,
      email: data.email,
      name: "Owner",
      role: "owner",
      status: "active",
      invitedBy: data.userId,
      joinedAt: new Date(),
    });

    return {
      success: true,
      data: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
    };
  } catch (error) {
    console.error("❌ Create organization error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create organization",
    };
  }
}

// ─── 2. Get User Organizations ─────────────────────────────────────────────

export async function getUserOrganizations(userId: string) {
  try {
    await connectDB();

    const members = await TeamMember.find({
      userId,
      status: "active",
    }).populate("organizationId");

    return {
      success: true,
      data: members.map((m: any) => ({
        _id: m.organizationId._id,
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        role: m.role,
      })),
    };
  } catch (error) {
    console.error("❌ Get user organizations error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch organizations",
    };
  }
}

// ─── 3. Get Organization Members ──────────────────────────────────────────

export async function getOrganizationMembers(
  organizationId: string,
  currentUserId?: string, // ✅ Optional, for permissions
) {
  try {
    await connectDB();

    const members = await TeamMember.find({
      organizationId,
      status: { $in: ["active", "pending"] },
    })
      .sort({ role: 1, createdAt: 1 })
      .lean();

    // ✅ Get current user's role
    let currentUserRole: MemberRole | null = null;
    if (currentUserId) {
      const currentUser = members.find((m) => m.userId === currentUserId);
      currentUserRole = currentUser?.role || null;
    }

    return {
      success: true,
      data: members.map((m) => ({
        _id: m._id,
        userId: m.userId,
        email: m.email,
        name: m.name,
        avatar: m.avatar,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        lastActiveAt: m.lastActiveAt,
      })),
      currentUserRole, // ✅ Send current user's role to frontend
    };
  } catch (error) {
    console.error("❌ Get members error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch members",
    };
  }
}

// ─── 4. Invite Member ──────────────────────────────────────────────────────

export async function inviteMember(data: InviteMemberInput) {
  try {
    await connectDB();

    // ✅ Check if user has permission to invite
    const hasInvitePermission = await checkPermission(
      data.organizationId,
      data.invitedBy,
      "invite_members",
    );

    if (!hasInvitePermission) {
      return {
        success: false,
        error: "You don't have permission to invite members",
      };
    }

    const org = await Organization.findById(data.organizationId);
    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    const existing = await TeamMember.findOne({
      organizationId: data.organizationId,
      email: data.email,
    });

    if (existing) {
      return { success: false, error: "User is already a member" };
    }

    const pendingInvite = await Invitation.findOne({
      organizationId: data.organizationId,
      email: data.email,
      status: "pending",
    });

    if (pendingInvite) {
      return { success: false, error: "Invitation already sent" };
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await Invitation.create({
      organizationId: data.organizationId,
      email: data.email,
      role: data.role || "member",
      invitedBy: data.invitedBy,
      token,
      expiresAt,
      status: "pending",
    });

    await TeamMember.create({
      organizationId: data.organizationId,
      userId: `pending-${Date.now()}`,
      email: data.email,
      role: data.role || "member",
      status: "invited",
      invitedBy: data.invitedBy,
      invitedAt: new Date(),
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    const inviter = await TeamMember.findOne({
      organizationId: data.organizationId,
      userId: data.invitedBy,
    });

    const invitedByName = inviter?.name || "Someone";

    // ✅ Send email notification
    await sendTeamInviteEmail({
      userId: data.invitedBy,
      to: data.email,
      organizationName: org.name,
      invitedByName: invitedByName,
      inviteLink: inviteLink,
      role: data.role || "member",
      expiresAt: expiresAt.toLocaleDateString(),
    });

    return {
      success: true,
      data: {
        invitationId: invitation._id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        inviteLink: inviteLink,
        expiresAt: invitation.expiresAt,
      },
    };
  } catch (error) {
    console.error("❌ Invite member error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite member",
    };
  }
}

// ─── 5. Update Member Role (With Permission Check) ─────────────────────────

export async function updateMemberRole(data: UpdateMemberInput) {
  try {
    await connectDB();

    // ✅ Check if user has permission to change roles
    const hasPermission = await checkPermission(
      data.organizationId,
      data.currentUserId,
      "change_roles",
    );

    if (!hasPermission) {
      return {
        success: false,
        error: "You don't have permission to change roles",
      };
    }

    // ✅ Get current user's role
    const currentUserRole = await getUserRole(
      data.organizationId,
      data.currentUserId,
    );

    // ✅ Get target member
    const targetMember = await TeamMember.findOne({
      organizationId: data.organizationId,
      userId: data.userId,
    });

    if (!targetMember) {
      return { success: false, error: "Member not found" };
    }

    // ✅ Cannot change owner
    if (targetMember.role === "owner") {
      return { success: false, error: "Cannot change owner role" };
    }

    // ✅ Check if current user can change this target's role
    const canChange = canChangeRole(
      currentUserRole as any,
      targetMember.role as any,
    );
    if (!canChange) {
      return {
        success: false,
        error: "You don't have permission to change this member's role",
      };
    }

    targetMember.role = data.role;
    await targetMember.save();

    return {
      success: true,
      data: {
        userId: targetMember.userId,
        role: targetMember.role,
      },
    };
  } catch (error) {
    console.error("❌ Update member error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update member",
    };
  }
}

// ─── 6. Remove Member (With Permission Check) ──────────────────────────────

export async function removeMember(data: RemoveMemberInput) {
  try {
    await connectDB();

    // ✅ Check if user has permission to remove members
    const hasPermission = await checkPermission(
      data.organizationId,
      data.currentUserId,
      "remove_members",
    );

    if (!hasPermission) {
      return {
        success: false,
        error: "You don't have permission to remove members",
      };
    }

    const member = await TeamMember.findOne({
      organizationId: data.organizationId,
      userId: data.userId,
    });

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    if (member.role === "owner") {
      return { success: false, error: "Cannot remove owner" };
    }

    // ✅ Check if current user can remove this target
    const currentUserRole = await getUserRole(
      data.organizationId,
      data.currentUserId,
    );
    const canManage = canManageMember(
      currentUserRole as any,
      member.role as any,
    );

    if (!canManage) {
      return {
        success: false,
        error: "You don't have permission to remove this member",
      };
    }

    member.status = "removed";
    await member.save();

    return { success: true };
  } catch (error) {
    console.error("❌ Remove member error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}

// ─── 7. Accept Invitation ──────────────────────────────────────────────────

export async function acceptInvitation(data: AcceptInvitationInput) {
  try {
    await connectDB();

    const invitation = await Invitation.findOne({
      token: data.token,
      status: "pending",
    }).populate("organizationId");

    if (!invitation) {
      return {
        success: false,
        error: "Invalid or expired invitation",
      };
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return {
        success: false,
        error: "Invitation has expired",
      };
    }

    const existingMember = await TeamMember.findOne({
      organizationId: invitation.organizationId,
      userId: data.userId,
    });

    if (existingMember) {
      return {
        success: false,
        error: "You are already a member of this organization",
      };
    }

    if (invitation.email.toLowerCase() !== data.email.toLowerCase()) {
      return {
        success: false,
        error: "This invitation was sent to a different email address",
      };
    }

    const member = await TeamMember.findOne({
      organizationId: invitation.organizationId,
      email: invitation.email,
    });

    if (member) {
      member.userId = data.userId;
      member.status = "active";
      member.joinedAt = new Date();
      await member.save();
    } else {
      await TeamMember.create({
        organizationId: invitation.organizationId,
        userId: data.userId,
        email: invitation.email,
        role: invitation.role,
        status: "active",
        invitedBy: invitation.invitedBy,
        invitedAt: invitation.createdAt,
        joinedAt: new Date(),
      });
    }

    invitation.status = "accepted";
    await invitation.save();

    const organization = invitation.organizationId as any;

    return {
      success: true,
      data: {
        organizationId: organization._id.toString(),
        organizationName: organization.name || "Organization",
        role: invitation.role,
      },
    };
  } catch (error) {
    console.error("❌ Accept invitation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to accept invitation",
    };
  }
}

// ─── 8. Get Invitation Details ─────────────────────────────────────────────

export async function getInvitationDetails(token: string) {
  try {
    await connectDB();

    const invitation = await Invitation.findOne({
      token,
      status: "pending",
    }).populate("organizationId");

    if (!invitation) {
      return {
        success: false,
        error: "Invalid or expired invitation",
      };
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return {
        success: false,
        error: "Invitation has expired",
      };
    }

    const organization = invitation.organizationId as any;

    return {
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        organizationName: organization?.name || "Organization",
        organizationId: organization?._id?.toString() || "",
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy,
        createdAt: invitation.createdAt,
      },
    };
  } catch (error) {
    console.error("❌ Get invitation details error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get invitation details",
    };
  }
}
