import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Task from "@/lib/models/Task";

export async function GET() {
  const { userId } = auth();
  await dbConnect();
  const tasks = await Task.find({ userId });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const { userId } = auth();
  const data = await req.json();
  await dbConnect();
  const task = await Task.create({ ...data, userId });
  return NextResponse.json(task);
}