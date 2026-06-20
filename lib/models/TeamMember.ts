// models/TeamMember.ts
import mongoose, { Schema, Document } from "mongoose";

export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type MemberStatus = "active" | "pending" | "invited" | "removed";

export interface ITeamMember extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: string; // Clerk user ID
  email: string;
  role: MemberRole;
  status: MemberStatus;
  invitedBy: string; // Clerk user ID
  invitedAt: Date;
  joinedAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member", "viewer"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["active", "pending", "invited", "removed"],
      default: "invited",
    },
    invitedBy: { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date },
    lastActiveAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes
TeamMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
TeamMemberSchema.index({ organizationId: 1, email: 1 }, { unique: true });
TeamMemberSchema.index({ userId: 1 });

export default mongoose.models.TeamMember ||
  mongoose.model<ITeamMember>("TeamMember", TeamMemberSchema);
