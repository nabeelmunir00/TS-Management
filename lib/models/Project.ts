import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  color: { type: String, default: "#6366f1" },
  icon: { type: String, default: "" },
  priority: {
    type: String,
  },
  status: {
    type: String,
    enum: {
      values: ["active", "on-hold", "completed", "archived"],
      message: "Status must be active, on-hold, or completed",
    },
    default: "active",
  },
  isFavorite: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  // Extra fields for frontend
  tags: { type: [String], default: [] },
  startDate: { type: Date },
  endDate: { type: Date },
  teamMembers: [
    {
      name: { type: String, required: true },
      avatar: { type: String },
      role: { type: String },
    },
  ],
  tasksCount: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for better performance
ProjectSchema.index({ userId: 1, isArchived: 1 });
ProjectSchema.index({ userId: 1, isFavorite: 1 });
ProjectSchema.index({ userId: 1, name: 1 });

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);
