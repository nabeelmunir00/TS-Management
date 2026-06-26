// lib/email/templates.ts

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  // Colors
  bg: "#0D0D14", // near-black page bg
  card: "#16161F", // card bg
  cardBorder: "#25253A", // card border
  violet: "#7C3AED", // primary accent
  violetLight: "#A78BFA", // lighter violet for text
  violetBg: "#1E1535", // violet tint bg
  text: "#E2E8F0", // primary text
  textMuted: "#64748B", // muted text
  textSub: "#94A3B8", // sub text
  divider: "#1E1E2E", // divider
  white: "#FFFFFF",

  // Priority colors
  urgent: { bg: "#2D0A0A", text: "#F87171", border: "#7F1D1D" },
  high: { bg: "#1F1100", text: "#FB923C", border: "#7C2D12" },
  medium: { bg: "#1C1700", text: "#FCD34D", border: "#78350F" },
  low: { bg: "#0A1F14", text: "#4ADE80", border: "#14532D" },
};

// ─── Base Shell ───────────────────────────────────────────────────────────────

function shell(body: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${subject}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:${T.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
  a{color:${T.violetLight};text-decoration:none;}
  @media(max-width:600px){
    .wrapper{padding:16px!important;}
    .card{padding:28px 20px!important;border-radius:12px!important;}
    .btn{padding:13px 24px!important;font-size:14px!important;}
    .grid-2{display:block!important;}
    .grid-2 td{display:block!important;width:100%!important;padding:6px 0!important;}
  }
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td class="wrapper" style="padding:40px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;">

        <!-- Logo -->
        <tr>
          <td style="padding-bottom:28px;text-align:center;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="display:inline-table;">
              <tr>
                <td style="background:${T.violet};border-radius:10px;padding:9px 16px;">
                  <span style="color:${T.white};font-size:15px;font-weight:700;letter-spacing:-0.3px;">DevHub</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td class="card" style="background:${T.card};border:1px solid ${T.cardBorder};border-radius:16px;padding:36px 36px 32px;overflow:hidden;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="font-size:11px;color:${T.textMuted};line-height:1.7;">
              Sent by <strong style="color:${T.textSub};">DevHub</strong> &nbsp;·&nbsp;
              <a href="${APP_URL}/settings/notifications" style="color:${T.textMuted};text-decoration:underline;text-underline-offset:2px;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Reusable Blocks ──────────────────────────────────────────────────────────

function heroBlock(emoji: string, headline: string, accent: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
    <tr>
      <td style="text-align:center;padding:28px 0 24px;">
        <div style="font-size:36px;line-height:1;margin-bottom:14px;">${emoji}</div>
        <h1 style="font-size:22px;font-weight:700;color:${accent};letter-spacing:-0.4px;margin:0;">${headline}</h1>
      </td>
    </tr>
    <tr><td style="height:1px;background:${T.divider};"></td></tr>
  </table>`;
}

function ctaButton(label: string, href: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
    <tr>
      <td style="text-align:center;">
        <a class="btn" href="${href}"
           style="display:inline-block;background:${T.violet};color:${T.white};padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.1px;text-decoration:none;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function infoRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${T.divider};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="font-size:11px;font-weight:600;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.6px;width:36%;">${label}</td>
          <td style="font-size:13px;font-weight:500;color:${T.text};text-align:right;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function priorityChip(priority: string): string {
  const p = priority?.toLowerCase() as keyof typeof T;
  const cfg =
    (T[p] as { bg: string; text: string; border: string }) ?? T.medium;
  return `<span style="display:inline-block;background:${cfg.bg};color:${cfg.text};border:1px solid ${cfg.border};font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:0.3px;text-transform:uppercase;">${priority}</span>`;
}

function taskBlock(title: string, extra: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:${T.violetBg};border:1px solid #2D1B5E;border-radius:12px;margin:20px 0;overflow:hidden;">
    <tr>
      <td style="padding:18px 20px;">
        <p style="font-size:11px;font-weight:600;color:${T.violetLight};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Task</p>
        <p style="font-size:16px;font-weight:600;color:${T.white};margin-bottom:14px;line-height:1.4;">${title}</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${extra}
        </table>
      </td>
    </tr>
  </table>`;
}

function greetLine(name: string): string {
  return `<p style="font-size:15px;color:${T.textSub};margin-bottom:20px;">Hey <strong style="color:${T.violetLight};">${name}</strong> 👋</p>`;
}

function senderLine(from: string, action: string): string {
  return `<p style="font-size:14px;color:${T.textMuted};margin-bottom:4px;"><strong style="color:${T.text};">${from}</strong> ${action}</p>`;
}

// ─── 1. Task Assigned ────────────────────────────────────────────────────────

export function buildTaskAssignedTemplate(data: {
  taskTitle: string;
  projectName: string;
  dueDate: string;
  priority: string;
  assignedByName: string;
  taskId: string;
  assigneeName: string;
}): string {
  const body = `
    ${heroBlock("📋", "New Task Assigned", T.violetLight)}
    ${greetLine(data.assigneeName)}
    ${senderLine(data.assignedByName, "assigned you a task.")}

    ${taskBlock(
      data.taskTitle,
      `
      ${infoRow("Project", data.projectName)}
      ${infoRow("Priority", priorityChip(data.priority))}
      ${infoRow("Due date", data.dueDate)}
    `,
    )}

    ${ctaButton("View Task →", `${APP_URL}/dashboard/tasks/${data.taskId}`)}

    <p style="font-size:12px;color:${T.textMuted};text-align:center;margin-top:20px;">
      You're receiving this because a task was assigned to you.
    </p>
  `;
  return shell(body, `Task Assigned: ${data.taskTitle}`);
}

// ─── 2. Task Completed ───────────────────────────────────────────────────────

export function buildTaskCompletedTemplate(data: {
  taskTitle: string;
  projectName: string;
  assigneeName: string;
  completedByName: string;
  taskId: string;
}): string {
  const body = `
    ${heroBlock("✅", "Task Completed", "#4ADE80")}
    ${greetLine(data.assigneeName)}
    ${senderLine(data.completedByName, "marked a task as done.")}

    ${taskBlock(
      data.taskTitle,
      `
      ${infoRow("Project", data.projectName)}
      ${infoRow("Completed by", data.completedByName)}
    `,
    )}

    ${ctaButton("View Task →", `${APP_URL}/dashboard/tasks/${data.taskId}`)}

    <p style="font-size:12px;color:${T.textMuted};text-align:center;margin-top:20px;">
      You're receiving this because you're a member of this project.
    </p>
  `;
  return shell(body, `Task Completed: ${data.taskTitle}`);
}

// ─── 3. Comment Added ────────────────────────────────────────────────────────

export function buildCommentAddedTemplate(data: {
  taskTitle: string;
  commenterName: string;
  comment: string;
  taskId: string;
  recipientName: string;
}): string {
  const body = `
    ${heroBlock("💬", "New Comment", T.violetLight)}
    ${greetLine(data.recipientName)}
    ${senderLine(data.commenterName, `commented on <strong style="color:${T.text};">${data.taskTitle}</strong>`)}

    <!-- Quote block -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="margin:20px 0;border-left:3px solid ${T.violet};background:${T.violetBg};border-radius:0 10px 10px 0;overflow:hidden;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="font-size:14px;color:${T.text};line-height:1.7;font-style:italic;">"${data.comment}"</p>
        </td>
      </tr>
    </table>

    ${ctaButton("Reply to Comment →", `${APP_URL}/dashboard/tasks/${data.taskId}`)}

    <p style="font-size:12px;color:${T.textMuted};text-align:center;margin-top:20px;">
      You're receiving this because you're watching this task.
    </p>
  `;
  return shell(body, `New comment on: ${data.taskTitle}`);
}

// ─── 4. Due Reminder ─────────────────────────────────────────────────────────

export function buildDueReminderTemplate(data: {
  taskTitle: string;
  projectName: string;
  dueDate: string;
  taskId: string;
  assigneeName: string;
}): string {
  const body = `
    ${heroBlock("⏰", "Due Tomorrow", "#F87171")}
    ${greetLine(data.assigneeName)}
    <p style="font-size:14px;color:${T.textMuted};margin-bottom:4px;">
      A task assigned to you is due <strong style="color:#F87171;">tomorrow</strong>.
    </p>

    ${taskBlock(
      data.taskTitle,
      `
      ${infoRow("Project", data.projectName)}
      ${infoRow("Due date", `<span style="color:#F87171;font-weight:600;">${data.dueDate}</span>`)}
    `,
    )}

    ${ctaButton("View Task →", `${APP_URL}/dashboard/tasks/${data.taskId}`)}

    <p style="font-size:12px;color:${T.textMuted};text-align:center;margin-top:20px;">
      Complete the task on time to keep your streak going! 🔥
    </p>
  `;
  return shell(body, `Due Tomorrow: ${data.taskTitle}`);
}

// ─── 5. Team Invite ──────────────────────────────────────────────────────────

export function buildTeamInviteTemplate(data: {
  organizationName: string;
  invitedByName: string;
  inviteLink: string;
  role: string;
  expiresAt?: string;
}): string {
  const roleLabel = data.role.charAt(0).toUpperCase() + data.role.slice(1);

  const body = `
    ${heroBlock("🤝", "You're Invited", T.violetLight)}

    <p style="font-size:15px;color:${T.textSub};margin-bottom:20px;">
      <strong style="color:${T.text};">${data.invitedByName}</strong> invited you to join
      <strong style="color:${T.violetLight};">${data.organizationName}</strong> on DevHub.
    </p>

    <!-- Role card -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="background:${T.violetBg};border:1px solid #2D1B5E;border-radius:12px;margin:20px 0;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="font-size:11px;font-weight:600;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">Your role</p>
          <p style="font-size:20px;font-weight:700;color:${T.violetLight};margin:0;">${roleLabel}</p>
        </td>
      </tr>
    </table>

    <!-- Feature list -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">
      ${[
        ["📋", "Tasks", "Create, assign & track work"],
        ["📝", "Notes", "Shared team knowledge base"],
        ["🏗️", "System Design", "Architecture diagrams"],
        ["🤖", "AI Assistant", "Gemini-powered suggestions"],
      ]
        .map(
          ([icon, title, desc]) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${T.divider};">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="width:32px;font-size:16px;vertical-align:middle;">${icon}</td>
              <td style="vertical-align:middle;">
                <span style="font-size:13px;font-weight:600;color:${T.text};">${title}</span>
                <span style="font-size:12px;color:${T.textMuted};margin-left:6px;">— ${desc}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
        )
        .join("")}
    </table>

    ${ctaButton("Accept Invitation →", data.inviteLink)}

    ${
      data.expiresAt
        ? `
    <p style="font-size:12px;color:${T.textMuted};text-align:center;margin-top:16px;">
      ⏳ This invite expires on <strong style="color:${T.textSub};">${data.expiresAt}</strong>
    </p>`
        : ""
    }

    <!-- Fallback link -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px;padding-top:20px;border-top:1px solid ${T.divider};">
      <tr>
        <td>
          <p style="font-size:11px;color:${T.textMuted};line-height:1.6;">
            Button not working? Paste this into your browser:<br/>
            <a href="${data.inviteLink}" style="color:${T.violetLight};word-break:break-all;">${data.inviteLink}</a>
          </p>
        </td>
      </tr>
    </table>
  `;
  return shell(body, `Invitation to join ${data.organizationName}`);
}
