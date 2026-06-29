// lib/services/user-service.ts
import connectDB from "@/lib/db";
import TaskModel from "@/lib/models/Task";
import ProjectModel from "@/lib/models/Project";
import NoteModel from "@/lib/models/Note";
import TeamMember from "@/lib/models/TeamMember";
import Organization from "@/lib/models/Organization";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  totalProjects: number;
  totalNotes: number;
  organizations: number;
  joinedAt: string;
}

// ─── Get User Profile ──────────────────────────────────────────────────────

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  try {
    await connectDB();

    // Get user from Clerk (we'll use clerkClient)
    // This will be called from API route

    return null;
  } catch (error) {
    console.error("❌ Get user profile error:", error);
    return null;
  }
}

// ─── Get User Stats ───────────────────────────────────────────────────────

export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    await connectDB();

    const [tasks, projects, notes, teamMembers] = await Promise.all([
      TaskModel.find({ userId, isArchived: false }),
      ProjectModel.find({ userId, isArchived: false }),
      NoteModel.find({ userId, isArchived: false }),
      TeamMember.find({ userId, status: "active" }),
    ]);

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === "done").length,
      totalProjects: projects.length,
      totalNotes: notes.length,
      organizations: teamMembers.length,
      joinedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Get user stats error:", error);
    return null;
  }
}

// ─── Update User Profile ──────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>,
): Promise<UserProfile | null> {
  try {
    // This will update Clerk user
    // Will be called from API route
    return null;
  } catch (error) {
    console.error("❌ Update user profile error:", error);
    return null;
  }
}
