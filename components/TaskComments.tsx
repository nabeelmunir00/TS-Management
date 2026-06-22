"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  MessageSquare,
  Send,
  Edit,
  Trash2,
  ThumbsUp,
  Heart,
  Laugh,
  Sandwich,
  Angry,
  MoreVertical,
  User,
  AtSign,
  Loader2,
  Reply,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Comment {
  _id: string;
  taskId: string;
  userId: string;
  email: string;
  userName: string;
  avatar?: string;
  content: string;
  parentId?: string;
  mentions: string[];
  reactions: {
    type: "like" | "heart" | "laugh" | "sad" | "angry";
    userId: string;
  }[];
  edited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface TaskCommentsProps {
  taskId: string;
  taskTitle?: string;
}

// ─── Reaction Icons ─────────────────────────────────────────────────────────

const REACTION_ICONS = {
  like: ThumbsUp,
  heart: Heart,
  laugh: Laugh,
  sad: Sandwich,
  angry: Angry,
};

const REACTION_EMOJIS = {
  like: "👍",
  heart: "❤️",
  laugh: "😂",
  sad: "😢",
  angry: "😡",
};

const REACTION_COLORS = {
  like: "text-blue-500",
  heart: "text-red-500",
  laugh: "text-yellow-500",
  sad: "text-indigo-500",
  angry: "text-orange-500",
};

// ─── Helper Functions ──────────────────────────────────────────────────────

function getUserInitials(user: any): string {
  if (!user) return "?";

  if (user.fullName) {
    const names = user.fullName.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.fullName.slice(0, 2).toUpperCase();
  }

  if (user.firstName) {
    return user.firstName.slice(0, 2).toUpperCase();
  }

  if (user.username) {
    return user.username.slice(0, 2).toUpperCase();
  }

  if (user.emailAddresses && user.emailAddresses.length > 0) {
    return user.emailAddresses[0].emailAddress.slice(0, 2).toUpperCase();
  }

  return "?";
}

function getUserDisplayName(user: any): string {
  if (!user) return "User";

  if (user.fullName) return user.fullName;
  if (user.firstName) return user.firstName;
  if (user.username) return user.username;
  if (user.emailAddresses && user.emailAddresses.length > 0) {
    return user.emailAddresses[0].emailAddress.split("@")[0];
  }
  return "User";
}

function getUserEmail(user: any): string {
  if (!user) return "";
  if (user.emailAddresses && user.emailAddresses.length > 0) {
    return user.emailAddresses[0].emailAddress;
  }
  return "";
}

function getUserAvatar(user: any): string {
  if (!user) return "";
  return user.imageUrl || "";
}

// ─── Comment Item ──────────────────────────────────────────────────────────

function CommentItem({
  comment,
  taskId,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  currentUserId,
}: {
  comment: Comment;
  taskId: string;
  onReply: (comment: Comment) => void;
  onEdit: (comment: Comment, newContent: string) => void;
  onDelete: (commentId: string) => void;
  onReaction: (commentId: string, reaction: string) => void;
  currentUserId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);
  const isOwner = comment.userId === currentUserId;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment, editContent);
    }
    setIsEditing(false);
  };

  const handleReaction = (reaction: string) => {
    onReaction(comment._id, reaction);
  };

  const getReactionCount = (type: string) => {
    return comment.reactions.filter((r) => r.type === type).length;
  };

  const hasUserReacted = (type: string) => {
    return comment.reactions.some(
      (r) => r.type === type && r.userId === currentUserId,
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="w-8 h-8 shrink-0">
          {comment.avatar ? (
            <AvatarImage src={comment.avatar} alt={comment.userName} />
          ) : null}
          <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
            {getInitials(comment.userName || comment.email || "User")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                {comment.userId === currentUserId
                  ? "You"
                  : comment.userName || comment.email}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                {comment.edited && <span className="ml-1">(edited)</span>}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Reactions */}
              <div className="flex items-center gap-0.5">
                {Object.keys(REACTION_ICONS).map((reaction) => {
                  const count = getReactionCount(reaction);
                  const hasReacted = hasUserReacted(reaction);
                  const Icon =
                    REACTION_ICONS[reaction as keyof typeof REACTION_ICONS];

                  return (
                    <button
                      key={reaction}
                      onClick={() => handleReaction(reaction)}
                      className={cn(
                        "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors",
                        hasReacted
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                          : "hover:bg-muted",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-3 h-3",
                          hasReacted &&
                            REACTION_COLORS[
                              reaction as keyof typeof REACTION_COLORS
                            ],
                        )}
                      />
                      {count > 0 && (
                        <span className="text-[10px]">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    className="text-xs gap-2 cursor-pointer"
                    onClick={() => onReply(comment)}
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Reply
                  </DropdownMenuItem>
                  {isOwner && (
                    <>
                      <DropdownMenuItem
                        className="text-xs gap-2 cursor-pointer"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs gap-2 text-destructive cursor-pointer"
                        onClick={() => onDelete(comment._id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="text-sm min-h-[60px]"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {/* Replies toggle */}
          {comment.replies && comment.replies.length > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              {showReplies ? "Hide" : "Show"} {comment.replies.length} replies
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && showReplies && (
        <div className="ml-10 space-y-2 border-l-2 border-muted pl-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              taskId={taskId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReaction={onReaction}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TaskComments({ taskId, taskTitle }: TaskCommentsProps) {
  const { user, isLoaded } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Fetch Comments ──────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();

      if (data.success) {
        setComments(data.data);
      }
    } catch (error) {
      console.error("❌ Failed to fetch comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ─── Submit Comment ─────────────────────────────────────────────────────

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ Get user data from Clerk
      const userData = {
        userId: user.id,
        email: getUserEmail(user),
        userName: getUserDisplayName(user),
        avatar: getUserAvatar(user),
      };

      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          parentId: replyingTo?._id || null,
          ...userData, // ✅ Send user data to API
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to post comment");
      }

      toast.success("Comment added!");
      setNewComment("");
      setReplyingTo(null);
      await fetchComments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to post comment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Update Comment ─────────────────────────────────────────────────────

  const handleEditComment = async (comment: Comment, newContent: string) => {
    try {
      const res = await fetch(`/api/comments/${comment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update comment");
      }

      toast.success("Comment updated!");
      await fetchComments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update comment",
      );
    }
  };

  // ─── Delete Comment ─────────────────────────────────────────────────────

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete comment");
      }

      toast.success("Comment deleted!");
      await fetchComments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete comment",
      );
    }
  };

  // ─── Add Reaction ──────────────────────────────────────────────────────

  const handleReaction = async (commentId: string, reaction: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add reaction");
      }

      await fetchComments();
    } catch (error) {
      toast.error("Failed to add reaction");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-violet-500" />
          Comments ({comments.length})
        </h3>
        {taskTitle && (
          <Badge variant="outline" className="text-[10px]">
            {taskTitle}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Comment Input */}
      <div className="space-y-2">
        {replyingTo && (
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Replying to{" "}
              <span className="font-medium">
                {replyingTo.userName || replyingTo.email}
              </span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setReplyingTo(null)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="text-sm resize-none min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {replyingTo ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Comments List */}
      <ScrollArea className="max-h-[400px] pr-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground">
              Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                taskId={taskId}
                onReply={setReplyingTo}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                onReaction={handleReaction}
                currentUserId={user?.id || ""}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
