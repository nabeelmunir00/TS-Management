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
}

export interface InviteMemberInput {
  organizationId: string;
  invitedBy: string;
  email: string;
  role?: "admin" | "member" | "viewer";
}

export interface UpdateMemberInput {
  organizationId: string;
  userId: string;
  role: "admin" | "member" | "viewer";
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

    // Check if slug exists
    const existing = await Organization.findOne({ slug });
    if (existing) {
      return { success: false, error: "Organization name already taken" };
    }

    const organization = await Organization.create({
      name: data.name.trim(),
      slug,
      ownerId: data.userId,
    });

    // Add owner as team member
    await TeamMember.create({
      organizationId: organization._id,
      userId: data.userId,
      email: "", // Will be updated from Clerk
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

// ─── 2. Get Organization Members ──────────────────────────────────────────

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

// ─── 3. Invite Member ──────────────────────────────────────────────────────

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

    // Create invitation
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = await Invitation.create({
      organizationId: data.organizationId,
      email: data.email,
      role: data.role || "member",
      invitedBy: data.invitedBy,
      token,
      expiresAt,
    });

    // Create pending member entry
    await TeamMember.create({
      organizationId: data.organizationId,
      userId: `pending-${uuidv4()}`,
      email: data.email,
      role: data.role || "member",
      status: "invited",
      invitedBy: data.invitedBy,
    });

    // TODO: Send email invitation
    // await sendInvitationEmail(data.email, token, org.name);

    return {
      success: true,
      data: {
        invitationId: invitation._id,
        email: data.email,
        role: data.role || "member",
        token,
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

// ─── 4. Accept Invitation ──────────────────────────────────────────────────

export async function acceptInvitation(token: string, userId: string) {
  try {
    await connectDB();

    const invitation = await Invitation.findOne({ token, status: "pending" });
    if (!invitation) {
      return { success: false, error: "Invalid or expired invitation" };
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return { success: false, error: "Invitation has expired" };
    }

    // Update member entry
    const member = await TeamMember.findOne({
      organizationId: invitation.organizationId,
      email: invitation.email,
    });

    if (member) {
      member.userId = userId;
      member.status = "active";
      member.joinedAt = new Date();
      await member.save();
    }

    invitation.status = "accepted";
    await invitation.save();

    return {
      success: true,
      data: {
        organizationId: invitation.organizationId,
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

// ─── 7. Get User Organizations ─────────────────────────────────────────────

export async function getUserOrganizations(userId: string) {
  try {
    await connectDB();

    const members = await TeamMember.find({
      userId,
      status: "active",
    }).populate("organizationId");

    return {
      success: true,
      data: members.map((m) => ({
        organizationId: m.organizationId._id,
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
