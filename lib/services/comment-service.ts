// lib/services/comment-service.ts
import connectDB from "@/lib/db";
import Comment from "@/lib/models/Comment";
import Task from "@/lib/models/Task";
import Activity from "@/lib/models/Activity";
import { Types } from "mongoose";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateCommentInput {
  taskId: string;
  userId: string;
  content: string;
  parentId?: string;
  mentions?: string[];
  email: string; // ✅ Added
  userName: string; // ✅ Added
  avatar?: string; // ✅ Added
}

export interface UpdateCommentInput {
  commentId: string;
  userId: string;
  content: string;
}

export interface AddReactionInput {
  commentId: string;
  userId: string;
  reaction: "like" | "heart" | "laugh" | "sad" | "angry";
}

export interface AssignTaskInput {
  taskId: string;
  assignedTo: string;
  assignedByName: string;
  assignedToAvatar?: string;
  assignedBy: string;
}

// ─── Helper: Log Activity ─────────────────────────────────────────────────

async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: Types.ObjectId,
  entityName: string,
  metadata?: any,
) {
  try {
    await Activity.create({
      userId,
      action,
      entityType,
      entityId,
      entityName,
      metadata,
    });
  } catch (error) {
    console.error("❌ Failed to log activity:", error);
  }
}

// ─── 1. Create Comment ──────────────────────────────────────────────────────

export async function createComment(data: CreateCommentInput) {
  try {
    await connectDB();

    // ✅ Validate
    if (!data.content.trim()) {
      return { success: false, error: "Comment content is required" };
    }

    if (!data.email) {
      return { success: false, error: "Email is required" };
    }

    if (!data.userName) {
      return { success: false, error: "Username is required" };
    }

    // Check if task exists
    const task = await Task.findById(data.taskId);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // If parent comment, check if it exists
    if (data.parentId) {
      const parent = await Comment.findById(data.parentId);
      if (!parent) {
        return { success: false, error: "Parent comment not found" };
      }
    }

    // ✅ Create comment with user data
    const comment = await Comment.create({
      taskId: data.taskId,
      userId: data.userId,
      content: data.content.trim(),
      parentId: data.parentId || null,
      mentions: data.mentions || [],
      email: data.email,
      userName: data.userName,
      avatar: data.avatar || "",
    });

    // Increment task comment count
    await Task.findByIdAndUpdate(data.taskId, {
      $inc: { commentCount: 1 },
    });

    // Log activity
    await logActivity(
      data.userId,
      "comment",
      "task",
      new Types.ObjectId(data.taskId),
      task.title,
      { commentId: comment._id },
    );

    return {
      success: true,
      data: comment,
    };
  } catch (error) {
    console.error("❌ Create comment error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create comment",
    };
  }
}

// ─── 2. Get Task Comments ──────────────────────────────────────────────────

export async function getTaskComments(taskId: string) {
  try {
    await connectDB();

    const comments = await Comment.find({
      taskId,
      isDeleted: false,
      parentId: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          taskId,
          parentId: comment._id,
          isDeleted: false,
        })
          .sort({ createdAt: 1 })
          .lean();

        return {
          ...comment,
          replies,
        };
      }),
    );

    return {
      success: true,
      data: commentsWithReplies,
    };
  } catch (error) {
    console.error("❌ Get comments error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get comments",
    };
  }
}

// ─── 3. Update Comment ──────────────────────────────────────────────────────

export async function updateComment(data: UpdateCommentInput) {
  try {
    await connectDB();

    const comment = await Comment.findOne({
      _id: data.commentId,
      userId: data.userId,
    });

    if (!comment) {
      return { success: false, error: "Comment not found or unauthorized" };
    }

    if (!data.content.trim()) {
      return { success: false, error: "Comment content is required" };
    }

    comment.content = data.content.trim();
    comment.edited = true;
    await comment.save();

    return {
      success: true,
      data: comment,
    };
  } catch (error) {
    console.error("❌ Update comment error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update comment",
    };
  }
}

// ─── 4. Delete Comment ──────────────────────────────────────────────────────

export async function deleteComment(commentId: string, userId: string) {
  try {
    await connectDB();

    const comment = await Comment.findOne({
      _id: commentId,
      userId: userId,
    });

    if (!comment) {
      return { success: false, error: "Comment not found or unauthorized" };
    }

    // Soft delete
    comment.isDeleted = true;
    await comment.save();

    // Decrement task comment count
    await Task.findByIdAndUpdate(comment.taskId, {
      $inc: { commentCount: -1 },
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Delete comment error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete comment",
    };
  }
}

// ─── 5. Add Reaction ────────────────────────────────────────────────────────

export async function addReaction(data: AddReactionInput) {
  try {
    await connectDB();

    const comment = await Comment.findById(data.commentId);
    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    // Check if user already reacted with this type
    const existingReactionIndex = comment.reactions.findIndex(
      (r) => r.userId === data.userId && r.type === data.reaction,
    );

    if (existingReactionIndex !== -1) {
      // Remove reaction if already exists
      comment.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      comment.reactions.push({
        type: data.reaction,
        userId: data.userId,
      });
    }

    await comment.save();

    return {
      success: true,
      data: comment.reactions,
    };
  } catch (error) {
    console.error("❌ Add reaction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add reaction",
    };
  }
}

// ─── 6. Assign Task to User ─────────────────────────────────────────────────

export async function assignTask(data: AssignTaskInput) {
  try {
    await connectDB();

    const task = await Task.findById(data.taskId);
    if (!task) {
      return { success: false, error: "Task not found" };
    }

    task.assignedTo = data.assignedTo;
    task.assignedByName = data.assignedByName;
    task.assignedToAvatar = data.assignedToAvatar;
    task.assignedAt = new Date();
    task.assignedBy = data.assignedBy;
    await task.save();

    // Log activity
    await logActivity(
      data.assignedBy,
      "assign",
      "task",
      new Types.ObjectId(data.taskId),
      task.title,
      { assignedTo: data.assignedTo },
    );

    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error("❌ Assign task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign task",
    };
  }
}

// ─── 7. Get Task Assignees ──────────────────────────────────────────────────

export async function getTaskAssignees(taskId: string) {
  try {
    await connectDB();

    const task = await Task.findById(taskId).select(
      "assignedTo assignedByName assignedToAvatar assignedAt assignedBy",
    );

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    return {
      success: true,
      data: {
        assignedTo: task.assignedTo,
        assignedByName: task.assignedByName,
        assignedToAvatar: task.assignedToAvatar,
        assignedAt: task.assignedAt,
        assignedBy: task.assignedBy,
      },
    };
  } catch (error) {
    console.error("❌ Get assignees error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get assignees",
    };
  }
}

// ─── 8. Get Comment by ID ──────────────────────────────────────────────────

export async function getCommentById(commentId: string) {
  try {
    await connectDB();

    const comment = await Comment.findById(commentId).lean();

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    return {
      success: true,
      data: comment,
    };
  } catch (error) {
    console.error("❌ Get comment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get comment",
    };
  }
}

// ─── 9. Get User Comments ──────────────────────────────────────────────────

export async function getUserComments(userId: string, limit: number = 20) {
  try {
    await connectDB();

    const comments = await Comment.find({
      userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return {
      success: true,
      data: comments,
    };
  } catch (error) {
    console.error("❌ Get user comments error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get user comments",
    };
  }
}
