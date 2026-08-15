import { FRONTEND_URL } from "../config/env.js";

const EMAILJS_API = "https://api.emailjs.com/api/v1.0/email/send";

function getConfig() {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!serviceId || !templateId || !publicKey) {
    throw new Error("EmailJS env vars missing: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY");
  }
  return { serviceId, templateId, publicKey, privateKey };
}

async function sendEmail({ to, subject, message }) {
  const { serviceId, templateId, publicKey, privateKey } = getConfig();

  const res = await fetch(EMAILJS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      ...(privateKey && { accessToken: privateKey }),
      template_params: {
        to_email: to,
        subject,
        message,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailJS error ${res.status}: ${text}`);
  }

  console.log(`Email sent to ${to}: ${subject}`);
}

export async function sendNotificationEmail({ recipientEmail, subject, notificationTitle, ctaLink }) {
  const lines = [notificationTitle];
  if (ctaLink) lines.push(`\nView in TeamHub: ${FRONTEND_URL}${ctaLink.startsWith("/") ? ctaLink : "/" + ctaLink}`);
  lines.push("\nLog in to TeamHub for more details.");

  await sendEmail({
    to: recipientEmail,
    subject,
    message: lines.join("\n"),
  });
}

export async function sendTaskReminderEmail({ recipientEmail, taskTitle, taskDueDate, teamName, projectName, isOverdue }) {
  const prefix = isOverdue ? "OVERDUE" : "Reminder";
  const lines = [
    `[${prefix}] ${taskTitle}`,
    "",
  ];
  if (taskDueDate) lines.push(`Due: ${new Date(taskDueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`);
  if (projectName) lines.push(`Project: ${projectName}`);
  if (teamName) lines.push(`Team: ${teamName}`);
  lines.push("\nLog in to TeamHub to update this task.");

  await sendEmail({
    to: recipientEmail,
    subject: `Task ${prefix}: ${taskTitle}`,
    message: lines.join("\n"),
  });
}
