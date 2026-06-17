import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: {
    type: String,
    enum: ["todo", "in-progress", "review", "done"],
    default: "todo",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },
  dueDate: Date,
  estimatedHours: Number,
  actualHours: Number,
  assignedTo: String,
  tags: [String],
  subtasks: [
    {
      title: String,
      done: { type: Boolean, default: false },
    },
  ],
  attachments: [
    {
      name: String,
      url: String,
      type: String,
    },
  ],
  aiSuggestions: String,
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);
