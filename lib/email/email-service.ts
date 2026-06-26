// lib/email/email-service.ts
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Transporter (Singleton) ──────────────────────────────────────────────

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn(
        "⚠️ SMTP credentials not configured. Emails will be logged only.",
      );
      // Create a dummy transporter for development
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "dummy@ethereal.email",
          pass: "dummy",
        },
      });
      return transporter;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log("✅ Email transporter configured");
  }

  return transporter;
}

// ─── Send Email ──────────────────────────────────────────────────────────────

export async function sendEmail(
  options: EmailOptions,
): Promise<SendEmailResult> {
  try {
    // ✅ Development mode - log only
    if (process.env.NODE_ENV === "development" && !process.env.SMTP_USER) {
      console.log("📧 [DEV] Email would be sent:");
      console.log("   To:", options.to);
      console.log("   Subject:", options.subject);
      console.log("   HTML:", options.html.substring(0, 200) + "...");
      return { success: true, messageId: "dev-mode" };
    }

    const transporter = getTransporter();
    const from = process.env.EMAIL_FROM || "DevHub <noreply@devhub.app>";

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });

    console.log(`✅ Email sent to ${options.to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// ─── Test Email ──────────────────────────────────────────────────────────────

export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>
      body { font-family: 'Inter', sans-serif; background: #f8fafc; padding: 40px; }
      .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      .logo { font-size: 24px; font-weight: 700; color: #8B5CF6; text-align: center; }
      .success { color: #10B981; text-align: center; font-size: 48px; }
    </style></head>
    <body>
      <div class="container">
        <div class="logo">⚡ DevHub</div>
        <div class="success">✅</div>
        <h2 style="text-align: center;">Email Test Successful!</h2>
        <p style="text-align: center; color: #475569;">
          Your email notification system is working perfectly.
        </p>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 32px;">
          DevHub - Your dev workflow, finally in one place.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: "✅ DevHub Email Test",
    html,
  });
}
