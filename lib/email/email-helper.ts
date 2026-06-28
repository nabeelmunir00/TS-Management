// lib/email/email-helper.ts
import { sendEmail } from "./email-service";
import {
  buildTaskAssignedTemplate,
  buildTaskCompletedTemplate,
  buildCommentAddedTemplate,
  buildDueReminderTemplate,
  buildTeamInviteTemplate,
} from "./templates";
import EmailLog from "@/lib/models/EmailLog";
import connectDB from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailEventBase {
  userId: string;
  to: string;
  type:
    | "task_assigned"
    | "task_completed"
    | "comment_added"
    | "task_reminder"
    | "team_invite";
}

// ─── Send and Log Email ────────────────────────────────────────────────────

async function sendAndLogEmail(
  event: EmailEventBase,
  subject: string,
  html: string,
): Promise<void> {
  try {
    await connectDB();

    // Send email
    const result = await sendEmail({
      to: event.to,
      subject,
      html,
    });

    // Log result
    await EmailLog.create({
      userId: event.userId,
      to: event.to,
      type: event.type,
      subject,
      status: result.success ? "sent" : "failed",
      messageId: result.messageId,
      error: result.error,
      sentAt: result.success ? new Date() : undefined,
    });

    if (result.success) {
      console.log(`✅ Email sent: ${event.type} to ${event.to}`);
    } else {
      console.error(
        `❌ Email failed: ${event.type} to ${event.to}`,
        result.error,
      );
    }
  } catch (error) {
    console.error(`❌ Failed to send ${event.type} email:`, error);
    // Don't throw - email failure shouldn't break the main flow
  }
}

// ─── Email Sending Functions ───────────────────────────────────────────────

export async function sendTaskAssignedEmail(data: {
  userId: string;
  to: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  priority: string;
  assignedByName: string;
  taskId: string;
  assigneeName: string;
}): Promise<void> {
  const html = buildTaskAssignedTemplate(data);
  await sendAndLogEmail(
    { userId: data.userId, to: data.to, type: "task_assigned" },
    `📋 Task Assigned: ${data.taskTitle}`,
    html,
  );
}

export async function sendTaskCompletedEmail(data: {
  userId: string;
  to: string;
  taskTitle: string;
  projectName: string;
  completedByName: string;
  taskId: string;
  assigneeName: string;
}): Promise<void> {
  const html = buildTaskCompletedTemplate(data);
  await sendAndLogEmail(
    { userId: data.userId, to: data.to, type: "task_completed" },
    `✅ Task Completed: ${data.taskTitle}`,
    html,
  );
}

export async function sendCommentAddedEmail(data: {
  userId: string;
  to: string;
  taskTitle: string;
  commenterName: string;
  comment: string;
  taskId: string;
  recipientName: string;
}): Promise<void> {
  const html = buildCommentAddedTemplate(data);
  await sendAndLogEmail(
    { userId: data.userId, to: data.to, type: "comment_added" },
    `💬 New Comment on: ${data.taskTitle}`,
    html,
  );
}

export async function sendDueReminderEmail(data: {
  userId: string;
  to: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  taskId: string;
  assigneeName: string;
}): Promise<void> {
  const html = buildDueReminderTemplate(data);
  await sendAndLogEmail(
    { userId: data.userId, to: data.to, type: "task_reminder" },
    `⏰ Reminder: ${data.taskTitle} due tomorrow!`,
    html,
  );
}

export async function sendTeamInviteEmail(data: {
  userId: string;
  to: string;
  organizationName: string;
  invitedByName: string;
  inviteLink: string;
  role: string;
  expiresAt: string;
}): Promise<void> {
  const html = buildTeamInviteTemplate(data);
  await sendAndLogEmail(
    { userId: data.userId, to: data.to, type: "team_invite" },
    `🤝 Invited to join ${data.organizationName}`,
    html,
  );
}
