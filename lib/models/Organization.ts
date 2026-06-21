// models/Organization.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  logo?: string;
  ownerId: string; // Clerk user ID
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: [100, "Organization name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    logo: {
      type: String,
      required: false,
    },
    ownerId: {
      type: String,
      required: [true, "Owner ID is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
OrganizationSchema.index({ slug: 1 });
OrganizationSchema.index({ ownerId: 1 });

export default mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
