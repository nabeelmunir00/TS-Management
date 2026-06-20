import mongoose, { Schema, Document } from "mongoose";

export interface IActivity extends Document {
  userId: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "complete"
    | "archive"
    | "unarchive"
    | "pin"
    | "unpin";
  entityType: "task" | "project" | "note" | "comment";
  entityId: mongoose.Types.ObjectId;
  entityName: string;
  changes?: any;
  metadata?: any;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: { type: String, required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "complete",
        "archive",
        "unarchive",
        "pin",
        "unpin",
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: ["task", "project", "note", "comment"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityName: { type: String, required: true },
    changes: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Indexes
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ entityId: 1 });

export default mongoose.models.Activity ||
  mongoose.model<IActivity>("Activity", ActivitySchema);
