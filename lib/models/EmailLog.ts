// models/EmailLog.ts
import mongoose, { Schema, Document } from "mongoose";

export type EmailType =
  | "task_assigned"
  | "task_completed"
  | "task_reminder"
  | "comment_added"
  | "team_invite"
  | "weekly_digest";

export interface IEmailLog extends Document {
  userId: string;
  to: string;
  type: EmailType;
  subject: string;
  status: "sent" | "failed" | "queued";
  error?: string;
  messageId?: string;
  sentAt?: Date;
  createdAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    userId: { type: String, required: true, index: true },
    to: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_completed",
        "task_reminder",
        "comment_added",
        "team_invite",
        "weekly_digest",
      ],
      required: true,
    },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ["sent", "failed", "queued"],
      default: "queued",
    },
    error: { type: String },
    messageId: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Indexes
EmailLogSchema.index({ userId: 1, createdAt: -1 });
EmailLogSchema.index({ status: 1 });

export default mongoose.models.EmailLog ||
  mongoose.model<IEmailLog>("EmailLog", EmailLogSchema);
