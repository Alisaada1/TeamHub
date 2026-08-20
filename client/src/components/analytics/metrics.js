export const STATUS_COLORS = { PENDING: "#F59E0B", IN_PROGRESS: "#3B82F6", COMPLETED: "#10B981", DELAYED: "#EF4444" };
export const STATUS_ORDER = ["PENDING", "IN_PROGRESS", "DELAYED", "COMPLETED"];

const DAY_MS = 86400000;

export function localDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const active = total - completed;
  const now = Date.now();
  const overdue = tasks.filter((t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() < now).length;
  const weekEnd = now + 7 * DAY_MS;
  const dueThisWeek = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() >= now && new Date(t.dueDate).getTime() <= weekEnd
  ).length;
  return { total, completed, active, overdue, dueThisWeek, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export function countBy(tasks, key, order, colors, labelFor) {
  const counts = {};
  for (const task of tasks) {
    const k = task[key];
    counts[k] = (counts[k] || 0) + 1;
  }
  const present = Object.keys(counts).filter((k) => counts[k] > 0);
  const ordered = order.filter((k) => present.includes(k));
  for (const k of present) if (!ordered.includes(k)) ordered.push(k);
  const total = tasks.length;
  return ordered.map((k) => ({
    key: k,
    label: labelFor ? labelFor(k) : k,
    value: counts[k],
    color: colors[k] || "#6B7280",
    percent: total > 0 ? Math.round((counts[k] / total) * 100) : 0,
  }));
}

export function upcomingTasks(tasks, days = 7) {
  const now = Date.now();
  const end = now + days * DAY_MS;
  return tasks
    .filter((t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() >= now && new Date(t.dueDate).getTime() <= end)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

export function overdueTasks(tasks) {
  const now = Date.now();
  return tasks
    .filter((t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() < now)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}
