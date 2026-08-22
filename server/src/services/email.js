import { FRONTEND_URL } from "../config/env.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_NAME = process.env.SMTP_FROM_NAME || "TeamHub";
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "hubteam434@gmail.com";

function buildBaseLayout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color:#6366f1;padding:24px 32px;">
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">TeamHub</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a2e;">${title}</h2>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background-color:#f8f9fa;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">This is a notification from TeamHub. Log in to manage your preferences.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail({ to, subject, html, text }) {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY env var is missing");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errBody}`);
  }

  console.log(`Email sent to ${to}: ${subject}`);
}

export async function sendNotificationEmail({ recipientEmail, subject, notificationTitle, ctaLink }) {
  const fullUrl = ctaLink
    ? `${FRONTEND_URL}${ctaLink.startsWith("/") ? ctaLink : "/" + ctaLink}`
    : null;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${notificationTitle}</p>
    ${fullUrl ? `<a href="${fullUrl}" style="display:inline-block;padding:10px 24px;background-color:#6366f1;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">View in TeamHub</a>` : ""}
    <p style="margin:${fullUrl ? "24px" : "0"} 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">Log in to TeamHub for more details.</p>
  `;

  const textParts = [notificationTitle];
  if (fullUrl) textParts.push(`View in TeamHub: ${fullUrl}`);
  textParts.push("Log in to TeamHub for more details.");

  await sendEmail({
    to: recipientEmail,
    subject,
    html: buildBaseLayout(notificationTitle, bodyHtml),
    text: textParts.join("\n"),
  });
}

export async function sendTaskReminderEmail({ recipientEmail, taskTitle, taskDueDate, teamName, projectName, isOverdue }) {
  const prefix = isOverdue ? "Overdue" : "Reminder";
  const title = `[${prefix}] ${taskTitle}`;

  const detailRows = [];
  if (taskDueDate) {
    const formatted = new Date(taskDueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    detailRows.push(`<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;width:80px;vertical-align:top;">Due date</td><td style="padding:4px 0;font-size:14px;color:#374151;">${formatted}</td></tr>`);
  }
  if (projectName) {
    detailRows.push(`<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Project</td><td style="padding:4px 0;font-size:14px;color:#374151;">${projectName}</td></tr>`);
  }
  if (teamName) {
    detailRows.push(`<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Team</td><td style="padding:4px 0;font-size:14px;color:#374151;">${teamName}</td></tr>`);
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;color:${isOverdue ? "#dc2626" : "#374151"};line-height:1.6;font-weight:600;">${prefix}: ${taskTitle}</p>
    ${detailRows.length > 0 ? `<table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">${detailRows.join("")}</table>` : ""}
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">Log in to TeamHub to update this task.</p>
  `;

  const textLines = [title, ""];
  if (taskDueDate) textLines.push(`Due: ${new Date(taskDueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`);
  if (projectName) textLines.push(`Project: ${projectName}`);
  if (teamName) textLines.push(`Team: ${teamName}`);
  textLines.push("Log in to TeamHub to update this task.");

  await sendEmail({
    to: recipientEmail,
    subject: title,
    html: buildBaseLayout(title, bodyHtml),
    text: textLines.join("\n"),
  });
}
