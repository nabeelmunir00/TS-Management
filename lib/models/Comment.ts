// models/Comment.ts
import mongoose, { Schema, Document } from "mongoose";

export type CommentReaction = "like" | "heart" | "laugh" | "sad" | "angry";

export interface IComment extends Document {
  taskId: mongoose.Types.ObjectId;
  userId: string;
  content: string;
  parentId?: mongoose.Types.ObjectId;
  mentions: string[];
  reactions: {
    type: CommentReaction;
    userId: string;
  }[];
  edited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  userName: string;
  avatar?: string;
}

const CommentSchema = new Schema<IComment>(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task ID is required"],
      index: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [5000, "Comment cannot exceed 5000 characters"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      trim: true,
    },
    userName: {
      type: String,
      required: [true, "username is required"],
    },
    avatar: {
      type: String,
      default: "",
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    mentions: {
      type: [String],
      default: [],
    },
    reactions: [
      {
        type: {
          type: String,
          enum: ["like", "heart", "laugh", "sad", "angry"],
        },
        userId: {
          type: String,
          required: true,
        },
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
  },
);

// Indexes
CommentSchema.index({ taskId: 1, createdAt: -1 });
CommentSchema.index({ taskId: 1, parentId: 1 });
CommentSchema.index({ userId: 1 });

export default mongoose.models.Comment ||
  mongoose.model<IComment>("Comment", CommentSchema);
