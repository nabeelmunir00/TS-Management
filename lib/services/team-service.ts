// lib/services/team-service.ts
import connectDB from "@/lib/db";
import Organization from "@/lib/models/Organization";
import TeamMember from "@/lib/models/TeamMember";
import Invitation from "@/lib/models/Invitation";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  userId: string;
  name: string;
  email: string;
}

export interface GetUserOrganizationsResponse {
  _id: string;
  name: string;
  slug: string;
  role: string;
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
}

export interface AcceptInvitationInput {
  token: string;
  userId: string;
  email: string;
}

// ─── 1. Create Organization ──────────────────────────────────────────────

export async function createOrganization(data: CreateOrganizationInput) {
  try {
    await connectDB();

    // Validate
    if (!data.name || !data.name.trim()) {
      return { success: false, error: "Organization name is required" };
    }

    // Generate slug
    const slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    // Check if slug exists
    const existing = await Organization.findOne({ slug });
    if (existing) {
      return { success: false, error: "Organization name already taken" };
    }

    // Create organization
    const organization = await Organization.create({
      name: data.name.trim(),
      slug,
      ownerId: data.userId,
    });

    // Add owner as team member
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

export async function getOrganizationMembers(organizationId: string) {
  try {
    await connectDB();

    const members = await TeamMember.find({
      organizationId,
      status: { $in: ["active", "pending"] },
    })
      .sort({ role: 1, createdAt: 1 })
      .lean();

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
    };
  } catch (error) {
    console.error("❌ Get members error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch members",
    };
  }
}

// ─── 4. Invite Member (with Token) ─────────────────────────────────────────

export async function inviteMember(data: InviteMemberInput) {
  try {
    await connectDB();

    // Check if organization exists
    const org = await Organization.findById(data.organizationId);
    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    // Check if already a member
    const existing = await TeamMember.findOne({
      organizationId: data.organizationId,
      email: data.email,
    });

    if (existing) {
      return { success: false, error: "User is already a member" };
    }

    // Check for pending invitation
    const pendingInvite = await Invitation.findOne({
      organizationId: data.organizationId,
      email: data.email,
      status: "pending",
    });

    if (pendingInvite) {
      return { success: false, error: "Invitation already sent" };
    }

    // ✅ Generate unique token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // ✅ Create invitation record
    const invitation = await Invitation.create({
      organizationId: data.organizationId,
      email: data.email,
      role: data.role || "member",
      invitedBy: data.invitedBy,
      token,
      expiresAt,
      status: "pending",
    });

    // Create pending member entry
    await TeamMember.create({
      organizationId: data.organizationId,
      userId: `pending-${Date.now()}`,
      email: data.email,
      role: data.role || "member",
      status: "invited",
      invitedBy: data.invitedBy,
      invitedAt: new Date(),
    });

    // ✅ Generate invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    // TODO: Send email invitation
    // await sendInvitationEmail(data.email, org.name, inviteLink);

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

// ─── 5. Update Member Role ─────────────────────────────────────────────────

export async function updateMemberRole(data: UpdateMemberInput) {
  try {
    await connectDB();

    const member = await TeamMember.findOne({
      organizationId: data.organizationId,
      userId: data.userId,
    });

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    if (member.role === "owner") {
      return { success: false, error: "Cannot change owner role" };
    }

    member.role = data.role;
    await member.save();

    return {
      success: true,
      data: {
        userId: member.userId,
        role: member.role,
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

// ─── 6. Remove Member ──────────────────────────────────────────────────────

export async function removeMember(organizationId: string, userId: string) {
  try {
    await connectDB();

    const member = await TeamMember.findOne({
      organizationId,
      userId,
    });

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    if (member.role === "owner") {
      return { success: false, error: "Cannot remove owner" };
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

    // ✅ 1. Find invitation by token
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

    // ✅ 2. Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return {
        success: false,
        error: "Invitation has expired",
      };
    }

    // ✅ 3. Check if user is already a member
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

    // ✅ 4. Check if email matches
    if (invitation.email.toLowerCase() !== data.email.toLowerCase()) {
      return {
        success: false,
        error: "This invitation was sent to a different email address",
      };
    }

    // ✅ 5. Update or create team member
    const member = await TeamMember.findOne({
      organizationId: invitation.organizationId,
      email: invitation.email,
    });

    if (member) {
      // Update existing pending member
      member.userId = data.userId;
      member.status = "active";
      member.joinedAt = new Date();
      await member.save();
    } else {
      // Create new member
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

    // ✅ 6. Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    // ✅ 7. Get organization info
    const organization = await Organization.findById(invitation.organizationId);

    return {
      success: true,
      data: {
        organizationId: invitation.organizationId,
        organizationName: organization?.name,
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

    return {
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organizationId?.name || "Organization",
        expiresAt: invitation.expiresAt,
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

// ─── 9. Cancel Invitation ──────────────────────────────────────────────────

export async function cancelInvitation(organizationId: string, email: string) {
  try {
    await connectDB();

    // Find and update invitation
    const invitation = await Invitation.findOne({
      organizationId,
      email,
      status: "pending",
    });

    if (!invitation) {
      return {
        success: false,
        error: "No pending invitation found",
      };
    }

    invitation.status = "cancelled";
    await invitation.save();

    // Remove pending member entry
    await TeamMember.findOneAndDelete({
      organizationId,
      email,
      status: "invited",
    });

    return {
      success: true,
      data: {
        email: invitation.email,
        status: invitation.status,
      },
    };
  } catch (error) {
    console.error("❌ Cancel invitation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to cancel invitation",
    };
  }
}

// ─── 10. Resend Invitation ──────────────────────────────────────────────────

export async function resendInvitation(organizationId: string, email: string) {
  try {
    await connectDB();

    // Find existing invitation
    const invitation = await Invitation.findOne({
      organizationId,
      email,
      status: "pending",
    });

    if (!invitation) {
      return {
        success: false,
        error: "No pending invitation found",
      };
    }

    // Update token and expiry
    const newToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    invitation.token = newToken;
    invitation.expiresAt = expiresAt;
    await invitation.save();

    // Generate new invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${newToken}`;

    // TODO: Resend email invitation
    // await sendInvitationEmail(email, organizationName, inviteLink);

    return {
      success: true,
      data: {
        email: invitation.email,
        token: invitation.token,
        inviteLink: inviteLink,
        expiresAt: invitation.expiresAt,
      },
    };
  } catch (error) {
    console.error("❌ Resend invitation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resend invitation",
    };
  }
}
