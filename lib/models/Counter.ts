// models/Counter.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICounter extends Document {
  userId: string;
  taskSequence: number;
  projectSequence: number;
  noteSequence: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      unique: true,
      index: true,
    },
    taskSequence: {
      type: Number,
      default: 0,
      min: [0, "Sequence cannot be negative"],
    },
    projectSequence: {
      type: Number,
      default: 0,
      min: [0, "Sequence cannot be negative"],
    },
    noteSequence: {
      type: Number,
      default: 0,
      min: [0, "Sequence cannot be negative"],
    },
  },
  {
    timestamps: true,
  },
);

const CounterModel: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);

export default CounterModel;
