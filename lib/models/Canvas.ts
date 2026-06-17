import mongoose from "mongoose";

const CanvasSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  name: { type: String, required: true },
  elements: [
    {
      id: String,
      type: {
        type: String,
        enum: ["box", "arrow", "text", "database", "api", "server", "client"],
      },
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      content: String,
      color: String,
      style: mongoose.Schema.Types.Mixed,
    },
  ],
  connections: [
    {
      from: String,
      to: String,
      label: String,
      style: mongoose.Schema.Types.Mixed,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Canvas || mongoose.model("Canvas", CanvasSchema);
