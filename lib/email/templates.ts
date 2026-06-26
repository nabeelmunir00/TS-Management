// lib/email/templates.ts

// ─── Shared Styles ──────────────────────────────────────────────────────────

const STYLES = {
  container: `
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    padding: 40px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  `,
  header: `
    text-align: center;
    margin-bottom: 32px;
  `,
  logo: `
    font-size: 24px;
    font-weight: 700;
    color: #8B5CF6;
  `,
  btn: `
    display: inline-block;
    background: #8B5CF6;
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
  `,
  footer: `
    margin-top: 32px;
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
    border-top: 1px solid #e2e8f0;
    padding-top: 20px;
  `,
};

function getBaseHtml(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f1f5f9; padding: 40px; margin: 0; }
        .container { ${STYLES.container} }
        .header { ${STYLES.header} }
        .logo { ${STYLES.logo} }
        .btn { ${STYLES.btn} }
        .footer { ${STYLES.footer} }
        .task-card { background: #f1f5f9; padding: 16px 20px; border-radius: 8px; margin: 16px 0; }
        .comment-box { background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #8B5CF6; }
        .done-icon { font-size: 48px; text-align: center; }
        .text-center { text-align: center; }
        .text-muted { color: #64748b; }
        .mt-16 { margin-top: 16px; }
        .mt-32 { margin-top: 32px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${content}
      </div>
    </body>
    </html>
  `;
}

// ─── 1. Task Assigned Template ────────────────────────────────────────────

export function buildTaskAssignedTemplate(data: {
  taskTitle: string;
  projectName: string;
  dueDate: string;
  priority: string;
  assignedByName: string;
  taskId: string;
  assigneeName: string;
}): string {
  const content = `
    <div class="header">
      <div class="logo">⚡ DevHub</div>
      <h2 style="margin-top: 8px;">You've been assigned a task!</h2>
    </div>

    <p>Hey <strong>${data.assigneeName}</strong>,</p>
    <p><strong>${data.assignedByName}</strong> has assigned you a new task:</p>

    <div class="task-card">
      <h3 style="margin: 0 0 8px 0;">📋 ${data.taskTitle}</h3>
      <p style="margin: 4px 0; color: #475569;">
        📁 ${data.projectName}
      </p>
      <p style="margin: 4px 0; color: #475569;">
        ⏰ Due: ${data.dueDate}
      </p>
      <p style="margin: 4px 0;">
        🔴 Priority: <strong>${data.priority}</strong>
      </p>
    </div>

    <div class="text-center mt-16">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${data.taskId}" class="btn">
        🔗 View Task
      </a>
    </div>

    <div class="footer">
      <p>DevHub - Your dev workflow, finally in one place.</p>
      <p>You're receiving this because you're a member of this project.</p>
    </div>
  `;

  return getBaseHtml(content, "Task Assigned - DevHub");
}

// ─── 2. Task Completed Template ────────────────────────────────────────────

export function buildTaskCompletedTemplate(data: {
  taskTitle: string;
  projectName: string;
  assigneeName: string;
  completedByName: string;
  taskId: string;
}): string {
  const content = `
    <div class="header">
      <div class="logo">⚡ DevHub</div>
      <h2 style="margin-top: 8px;">✅ Task Completed!</h2>
    </div>

    <div class="done-icon">🎉</div>

    <p><strong>${data.completedByName}</strong> has completed <strong>${data.taskTitle}</strong>.</p>

    <p style="color: #475569;">
      📁 Project: ${data.projectName}
    </p>

    <div class="text-center mt-16">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${data.taskId}" class="btn">
        🔗 View Task
      </a>
    </div>

    <div class="footer">
      <p>DevHub - Your dev workflow, finally in one place.</p>
    </div>
  `;

  return getBaseHtml(content, "Task Completed - DevHub");
}

// ─── 3. Comment Added Template ─────────────────────────────────────────────

export function buildCommentAddedTemplate(data: {
  taskTitle: string;
  commenterName: string;
  comment: string;
  taskId: string;
}): string {
  const content = `
    <div class="header">
      <div class="logo">⚡ DevHub</div>
      <h2 style="margin-top: 8px;">💬 New Comment</h2>
    </div>

    <p><strong>${data.commenterName}</strong> commented on <strong>${data.taskTitle}</strong>:</p>

    <div class="comment-box">
      <p style="margin: 0; color: #1e293b;">${data.comment}</p>
    </div>

    <div class="text-center mt-16">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${data.taskId}" class="btn">
        🔗 View Task
      </a>
    </div>

    <div class="footer">
      <p>DevHub - Your dev workflow, finally in one place.</p>
    </div>
  `;

  return getBaseHtml(content, "New Comment - DevHub");
}

// ─── 4. Due Reminder Template ──────────────────────────────────────────────

export function buildDueReminderTemplate(data: {
  taskTitle: string;
  projectName: string;
  dueDate: string;
  taskId: string;
  assigneeName: string;
}): string {
  const content = `
    <div class="header">
      <div class="logo">⚡ DevHub</div>
      <h2 style="margin-top: 8px;">⏰ Task Due Tomorrow!</h2>
    </div>

    <p>Hey <strong>${data.assigneeName}</strong>,</p>
    <p>Reminder: Your task is due <strong>tomorrow</strong>.</p>

    <div class="task-card">
      <h3 style="margin: 0 0 8px 0;">📋 ${data.taskTitle}</h3>
      <p style="margin: 4px 0; color: #475569;">
        📁 ${data.projectName}
      </p>
      <p style="margin: 4px 0; color: #475569;">
        ⏰ Due: ${data.dueDate}
      </p>
    </div>

    <div class="text-center mt-16">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks/${data.taskId}" class="btn">
        🔗 View Task
      </a>
    </div>

    <div class="footer">
      <p>DevHub - Your dev workflow, finally in one place.</p>
    </div>
  `;

  return getBaseHtml(content, "Task Due Reminder - DevHub");
}

// ─── 5. Team Invite Template ───────────────────────────────────────────────

export function buildTeamInviteTemplate(data: {
  organizationName: string;
  invitedByName: string;
  inviteLink: string;
  role: string;
}): string {
  const content = `
    <div class="header">
      <div class="logo">⚡ DevHub</div>
      <h2 style="margin-top: 8px;">🤝 You've been invited!</h2>
    </div>

    <p><strong>${data.invitedByName}</strong> has invited you to join <strong>${data.organizationName}</strong>.</p>

    <p>
      Role: <strong>${data.role}</strong>
    </p>

    <div class="text-center mt-16">
      <a href="${data.inviteLink}" class="btn">
        🔗 Accept Invitation
      </a>
    </div>

    <div class="footer">
      <p>DevHub - Your dev workflow, finally in one place.</p>
    </div>
  `;

  return getBaseHtml(content, "Team Invitation - DevHub");
}
