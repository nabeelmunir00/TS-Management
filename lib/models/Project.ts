import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  color: { type: String, default: "#6366f1" },
  icon: String,
  isFavorite: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);
