import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  category: {
    type: String,
    enum: {
      values: [
        "personal",
        "work",
        "ideas",
        "tasks",
        "meeting",
        "study",
        "project",
        "other",
      ],
      message: "Invalid category",
    },
    default: "",
    trim: true,
  },
  reminderDate: {
    type: Date,
    required: false,
  },
  isPinned: { type: Boolean, default: false },
  color: { type: String, default: "#ffffff" },
  tags: [String],
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
