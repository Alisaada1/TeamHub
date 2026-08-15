const NOTIFICATION_KEYS = {
  TASK_ASSIGNED: "taskAssigned",
  TASK_UNASSIGNED: "taskUnassigned",
  STATUS_CHANGED: "statusChanged",
  COMMENT_ADDED: "commentAdded",
  DUE_SOON: "dueSoon",
  OVERDUE: "overdue",
  INVITATION: "invitation",
  INVITATION_ACCEPTED: "invitationAccepted",
  INVITATION_REJECTED: "invitationRejected",
  MEMBER_ADDED: "memberAdded",
  MEMBER_REMOVED: "memberRemoved",
  ROLE_CHANGED: "roleChanged",
  MEMBER_LEFT: "memberLeft",
};

function formatDueDate(iso, lang) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function getNotificationMessage(n, t, lang) {
  if (!n?.type) return null;
  const key = NOTIFICATION_KEYS[n.type];
  if (!key) return null;
  const d = n.data || {};
  const actor = n.actor?.name || t("common.someone", "Someone");
  const status = d.to ? t("projects.detail.status." + d.to, d.to) : null;
  const role = d.role ? t("roles." + d.role, d.role) : null;

  if (key === "dueSoon" || key === "overdue") {
    const base = t(`notifications.types.${key}`, { defaultValue: "", task: d.taskTitle || "" });
    const date = formatDueDate(d.dueDate, lang);
    return date ? `${base} ${t("notifications.types.dueLabel", { defaultValue: "", date })}` : base;
  }

  return t(`notifications.types.${key}`, {
    defaultValue: "",
    actor,
    task: d.taskTitle || "",
    team: d.teamName || "",
    status: status || "",
    role: role || "",
  });
}

export function getActivitySentence(item, t) {
  if (!item?.action) return item?.details || "";
  const d = item.data || {};
  const status = d.status ? t("projects.detail.status." + d.status, d.status) : null;
  const role = d.role ? t("roles." + d.role, d.role) : null;
  const text = t(`activity.actions.${item.action}`, {
    defaultValue: "",
    task: d.task || "",
    project: d.project || "",
    team: d.team || "",
    status: status || "",
    role: role || "",
  });
  return text || item?.details || "";
}
