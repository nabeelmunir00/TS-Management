// models/Invitation.ts
import mongoose, { Schema, Document } from "mongoose";
import { IOrganization } from "./Organization";

export interface IInvitation extends Document {
  organizationId: mongoose.Types.ObjectId | IOrganization;
  email: string;
  role: "admin" | "member" | "viewer";
  invitedBy: string;
  token: string;
  expiresAt: Date;
  status: "pending" | "accepted" | "expired" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "member",
    },
    invitedBy: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// Indexes
InvitationSchema.index({ token: 1 });
InvitationSchema.index({ organizationId: 1, email: 1 });
InvitationSchema.index({ expiresAt: 1 });
InvitationSchema.index({ organizationId: 1 });
InvitationSchema.index({ email: 1 });

// ✅ Register model properly
const Invitation =
  mongoose.models.Invitation ||
  mongoose.model<IInvitation>("Invitation", InvitationSchema);

export default Invitation;
