import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import EmptyState from "../ui/EmptyState";
import { FolderIcon } from "../icons/Icons";
import {
  STATUS_COLORS,
  STATUS_ORDER,
  countBy,
  computeStats,
  localDateKey,
} from "./metrics";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(date, lang, opts) {
  return new Date(date).toLocaleDateString(lang, opts || { month: "short", day: "numeric" });
}

function Card({ title, sub, action, children }) {
  return (
    <div className="rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-end gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{title}</h3>
          {sub && <span className="text-[10px] uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark font-medium">{sub}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const ROW_H = 28;
const COL_W = 40;
const LABEL_W = 190;
const AXIS_H = 18;

// ---- Task Flow (Tasks page): horizontal Gantt-style chart ----
// Tasks are rows; every day from the project's start->due date is a column.
// Each task is a thin horizontal line from its start day to its end day; at the
// end a same-colored dashed vertical line drops down to the day axis.
function TaskTimeline({ tasks, projects, i18n, selectedProjectId }) {
  const { t } = useTranslation();

  const effectiveProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const projTasks = useMemo(() => {
    if (!effectiveProject) return tasks;
    const pid = effectiveProject.id;
    return tasks.filter((task) => (task.projectId || task.project?.id) === pid);
  }, [tasks, effectiveProject]);

  const { days } = useMemo(() => {
    let s = effectiveProject?.startDate ? new Date(effectiveProject.startDate) : null;
    let e = effectiveProject?.dueDate ? new Date(effectiveProject.dueDate) : null;
    if (!s || !e || e <= s) {
      let min = Infinity;
      let max = -Infinity;
      for (const task of projTasks) {
        if (task.createdAt) min = Math.min(min, new Date(task.createdAt).getTime());
        if (task.dueDate) max = Math.max(max, new Date(task.dueDate).getTime());
      }
      if (isFinite(min)) s = new Date(min);
      if (isFinite(max)) e = new Date(max);
    }
    const arr = [];
    if (s && e && e > s) {
      for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
        arr.push(new Date(d));
        if (arr.length >= 366) break;
      }
    }
    return { days: arr };
  }, [effectiveProject, projTasks]);

  const rows = useMemo(() => {
    if (days.length === 0) return [];
    return [...projTasks]
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .slice(0, 40)
      .map((task) => {
        const sKey = localDateKey(task.createdAt ? new Date(task.createdAt) : days[0]);
        const eKey = localDateKey(task.dueDate ? new Date(task.dueDate) : days[0]);
        let sIdx = days.findIndex((d) => localDateKey(d) === sKey);
        let eIdx = days.findIndex((d) => localDateKey(d) === eKey);
        if (sIdx === -1) sIdx = 0;
        if (eIdx === -1) eIdx = days.length - 1;
        if (eIdx < sIdx) eIdx = sIdx;
        return { task, sIdx, eIdx };
      });
  }, [projTasks, days]);

  const monthGroups = useMemo(() => {
    const groups = [];
    let cur = null;
    days.forEach((d, i) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!cur || cur.key !== key) {
        cur = {
          key,
          label: d.toLocaleDateString(i18n.language, { month: "long", year: "numeric" }),
          startIdx: i,
        };
        groups.push(cur);
      }
      cur.endIdx = i;
    });
    return groups;
  }, [days, i18n.language]);

  if (projTasks.length === 0) {
    return <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center py-8">{t("analytics.noTasksInProject")}</p>;
  }

  if (days.length === 0 || rows.length === 0) {
    return <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center py-8">{t("analytics.noTimelineData")}</p>;
  }

  const fullDate = (d) => d.toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const axisRowStart = rows.length + 1;
  const axisBottomRow = rows.length + 3;
  const borderColor = "rgba(148,163,184,0.22)";

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${LABEL_W}px repeat(${days.length}, ${COL_W}px)`,
            gridTemplateRows: `repeat(${rows.length}, ${ROW_H}px) ${AXIS_H}px ${AXIS_H}px`,
            width: "max-content",
            minWidth: "100%",
          }}
        >
          {/* vertical day-column guides spanning the whole plot */}
          <div
            style={{
              gridColumn: `2 / ${days.length + 2}`,
              gridRow: `1 / ${axisBottomRow}`,
              backgroundImage: `repeating-linear-gradient(to right, transparent 0 ${COL_W - 1}px, ${borderColor} ${COL_W - 1}px ${COL_W}px)`,
              pointerEvents: "none",
            }}
          />

          {/* task labels (Y axis) */}
          {rows.map(({ task }, r) => (
            <div
              key={task.id}
              style={{ gridColumn: 1, gridRow: r + 1 }}
              className="flex items-center gap-1.5 px-2 border-b border-r border-border-light/50 dark:border-border-dark/50 min-w-0"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[task.status] || "#6B7280" }} />
              <span className="text-[11px] font-bold text-text-primary-light dark:text-text-primary-dark shrink-0">{t("analytics.taskNumber", { count: r + 1 })}</span>
              <span className="text-[11px] text-text-muted-light dark:text-text-muted-dark truncate" title={task.title}>{task.title}</span>
            </div>
          ))}

          {/* horizontal task lines (thin, status-colored, straight) */}
          {rows.map(({ task, sIdx, eIdx }, r) => (
            <div
              key={`line-${task.id}`}
              style={{ gridColumn: `${sIdx + 2} / ${eIdx + 3}`, gridRow: r + 1 }}
              className="relative border-b border-border-light/40 dark:border-border-dark/40"
              title={`${task.title}\n${fullDate(days[sIdx])} → ${fullDate(days[eIdx])}`}
            >
              <div
                className="absolute rounded-full"
                style={{
                  left: 3,
                  right: 3,
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: 3,
                  backgroundColor: STATUS_COLORS[task.status] || "#6B7280",
                  opacity: task.status === "COMPLETED" ? 0.55 : 0.85,
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  right: 0,
                  top: "50%",
                  transform: "translate(50%, -50%)",
                  width: 7,
                  height: 7,
                  backgroundColor: STATUS_COLORS[task.status] || "#6B7280",
                }}
              />
            </div>
          ))}

          {/* dashed drop lines marking each task's end date on the axis */}
          {rows.map(({ task, eIdx }, r) => (
            <div
              key={`dash-${task.id}`}
              style={{ gridColumn: eIdx + 2, gridRow: `${r + 1} / ${axisBottomRow}` }}
              className="relative"
            >
              <div
                className="absolute"
                style={{
                  right: 0,
                  top: `${ROW_H / 2}px`,
                  bottom: 0,
                  borderRight: `2px dashed ${STATUS_COLORS[task.status] || "#6B7280"}`,
                  opacity: 0.45,
                }}
              />
            </div>
          ))}

          {/* axis corner: date range */}
          <div
            style={{ gridColumn: 1, gridRow: `${axisRowStart} / ${axisBottomRow}` }}
            className="flex items-center px-2 border-r border-t border-border-light/50 dark:border-border-dark/50 bg-bg-light dark:bg-bg-dark min-w-0"
          >
            <span className="text-[9px] font-semibold text-text-muted-light dark:text-text-muted-dark truncate" title={`${fullDate(days[0])} → ${fullDate(days[days.length - 1])}`}>
              {fmtDate(days[0], i18n.language, { month: "short", day: "numeric", year: "numeric" })} → {fmtDate(days[days.length - 1], i18n.language, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* month tier */}
          {monthGroups.map((g) => (
            <div
              key={g.key}
              style={{ gridColumn: `${g.startIdx + 2} / ${g.endIdx + 3}`, gridRow: axisRowStart }}
              className="flex items-center justify-center border-r border-t border-border-light/50 dark:border-border-dark/50 bg-bg-light dark:bg-bg-dark px-1"
            >
              <span className="text-[9px] font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark truncate">{g.label}</span>
            </div>
          ))}

          {/* day tier: every single day from start to end */}
          {days.map((d, i) => (
            <div
              key={localDateKey(d)}
              title={fullDate(d)}
              style={{ gridColumn: i + 2, gridRow: axisRowStart + 1 }}
              className={
                "flex items-center justify-center text-[9px] tabular-nums border-r border-t border-border-light/50 dark:border-border-dark/50 bg-bg-light dark:bg-bg-dark " +
                (d.getDay() === 0 || d.getDay() === 6 ? "text-red-400/70 dark:text-red-500/60" : "text-text-muted-light dark:text-text-muted-dark")
              }
            >
              {d.getDate()}
            </div>
          ))}
        </div>
      </div>
      {rows.length === 40 && projTasks.length > 40 && (
        <p className="mt-1.5 text-[10px] text-text-muted-light dark:text-text-muted-dark">{t("analytics.showingTasks", { count: 40 })}</p>
      )}
    </div>
  );
}

// ---- Project Timeline Matrix (Projects page): day squares across the project span ----
function TimelineMatrix({ project, tasks, i18n }) {
  const { t } = useTranslation();

  const tasksByDate = useMemo(() => {
    const map = {};
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = localDateKey(new Date(task.dueDate));
      if (!map[key]) map[key] = [];
      map[key].push(task.title);
    }
    return map;
  }, [tasks]);

  const { days } = useMemo(() => {
    let s = project?.startDate ? new Date(project.startDate) : null;
    let e = project?.dueDate ? new Date(project.dueDate) : null;
    if (!s || !e || e <= s) {
      let min = Infinity;
      let max = -Infinity;
      for (const task of tasks) {
        if (task.createdAt) min = Math.min(min, new Date(task.createdAt).getTime());
        if (task.dueDate) max = Math.max(max, new Date(task.dueDate).getTime());
      }
      if (isFinite(min)) s = new Date(min);
      if (isFinite(max)) e = new Date(max);
    }
    const out = [];
    if (s && e && e > s) {
      for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
        out.push(new Date(d));
        if (out.length >= 372) break;
      }
    }
    return { days: out };
  }, [project, tasks]);

  const todayKey = localDateKey(new Date());

  if (!days || days.length === 0) {
    return <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center py-8">{t("analytics.noTimelineData")}</p>;
  }

  const fullDate = (d) => d.toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      <div className="flex flex-wrap gap-[3px]">
        {days.map((d) => {
          const key = localDateKey(d);
          const dayTasks = tasksByDate[key] || [];
          const hasTasks = dayTasks.length > 0;
          const isToday = key === todayKey;
          const tip = hasTasks ? `${fullDate(d)}\n${dayTasks.map((title) => `• ${title}`).join("\n")}` : fullDate(d);
          return (
            <div
              key={key}
              title={tip}
              className={
                "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px] transition-colors " +
                (hasTasks
                  ? "bg-primary-500 dark:bg-primary-400 border border-primary-600 dark:border-primary-500"
                  : "bg-bg-light dark:bg-bg-dark border border-border-light/70 dark:border-border-dark/70") +
                (isToday ? " ring-1 ring-primary-500/70 ring-offset-0" : "")
              }
            />
          );
        })}
      </div>
      {days.length >= 372 && (
        <p className="mt-1.5 text-[10px] text-text-muted-light dark:text-text-muted-dark">{t("analytics.timelineTooLong")}</p>
      )}
      <div className="flex items-center gap-4 mt-2.5 text-[10px] text-text-muted-light dark:text-text-muted-dark">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-primary-500 dark:bg-primary-400" /> {t("analytics.daysWithTasks")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-bg-light dark:bg-bg-dark border border-border-light/70 dark:border-border-dark/70" /> {t("analytics.noTasksOnDay")}
        </span>
      </div>
    </div>
  );
}

// ---- Completion rate: zero-baseline vertical bars, sits below the task flow ----
function CompletionBars({ tasks, stats, t }) {
  const statusDist = useMemo(
    () => countBy(tasks, "status", STATUS_ORDER, STATUS_COLORS, (k) => t("projects.detail.status." + k, k)),
    [tasks, t]
  );
  const max = Math.max(...statusDist.map((d) => d.value), 1);
  const gridColor = "rgba(148,163,184,0.28)";

  return (
    <div className="rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{t("analytics.completionRate")}</h3>
        <span className="text-xl font-bold text-emerald-500 tabular-nums">{stats.completionRate}%</span>
      </div>

      <div className="mt-1">
        {/* chart area: each status is a clearly defined column slot with 25% guide lines */}
        <div
          className="flex items-stretch h-24 divide-x divide-border-light/40 dark:divide-border-dark/40"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 calc(25% - 1px), ${gridColor} calc(25% - 1px) 25%)`,
            backgroundColor: "rgba(148,163,184,0.05)",
          }}
        >
          {statusDist.map((d) => (
            <div key={d.key} className="flex flex-col items-center flex-1 h-full min-w-0">
              <span className="text-[11px] font-bold tabular-nums text-text-primary-light dark:text-text-primary-dark mt-1.5" title={`${d.label}: ${d.value}`}>
                {d.value}
              </span>
              <div className="flex-1 w-full flex items-end justify-center min-h-0">
                <div
                  className="w-7 sm:w-9 rounded-t transition-all"
                  style={{
                    height: d.value > 0 ? `${Math.round((d.value / max) * 100)}%` : "3px",
                    backgroundColor: d.color,
                    opacity: d.value > 0 ? 1 : 0.45,
                  }}
                  title={`${d.label}: ${d.value}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* zero baseline axis */}
        <div className="h-[2px] w-full" style={{ backgroundColor: "rgba(148,163,184,0.85)" }} />

        {/* bar labels under the axis, aligned to each column slot */}
        <div className="flex mt-2 divide-x divide-border-light/40 dark:divide-border-dark/40">
          {statusDist.map((d) => (
            <div key={d.key} className="flex-1 min-w-0 px-1 text-center" title={d.label}>
              <span className="text-[10px] font-semibold text-text-primary-light dark:text-text-primary-dark leading-tight break-words">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2.5 text-[10px] text-text-muted-light dark:text-text-muted-dark">{t("analytics.completedCount")}: {stats.completed}/{stats.total}</p>
    </div>
  );
}

export default function AnalyticsPanel({ tasks, projects, project, currentUserId, onTaskClick, scope = "team", timeline = "bars" }) {
  const { t, i18n } = useTranslation();

  const [scopeMode, setScopeMode] = useState("all");
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const baseTasks = useMemo(() => {
    if (scopeMode === "mine" && currentUserId) return tasks.filter((ts) => ts.assigneeId === currentUserId);
    return tasks;
  }, [tasks, scopeMode, currentUserId]);

  const defaultProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    let best = projects[0];
    let bestCount = -1;
    for (const p of projects) {
      const c = baseTasks.filter((task) => (task.projectId || task.project?.id) === p.id).length;
      if (c > bestCount) {
        bestCount = c;
        best = p;
      }
    }
    return best;
  }, [projects, baseTasks]);

  const activeProjectId = selectedProjectId || defaultProject?.id || "";
  const activeProject = useMemo(
    () => (projects || []).find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const stats = useMemo(() => computeStats(baseTasks), [baseTasks]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-6">
        <EmptyState icon={<FolderIcon size={32} />} title={t("analytics.noData")} description={t("analytics.emptyDescription")} />
      </div>
    );
  }

  const timelineTitle = timeline === "matrix" ? t("analytics.projectTimeline") : t("analytics.taskFlow");

  const rangeProject = timeline === "matrix" ? project : activeProject;
  const rangeSub =
    rangeProject?.startDate && rangeProject?.dueDate
      ? `${fmtDate(rangeProject.startDate, i18n.language, { month: "short", day: "numeric", year: "numeric" })} – ${fmtDate(rangeProject.dueDate, i18n.language, { month: "short", day: "numeric", year: "numeric" })}`
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
          <button
            type="button"
            onClick={() => setScopeMode("all")}
            className={"px-3 py-1 text-xs font-semibold rounded-md transition-colors " + (scopeMode === "all" ? "bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark shadow-sm" : "text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}
          >
            {t("analytics.scopeAll")}
          </button>
          <button
            type="button"
            onClick={() => setScopeMode("mine")}
            className={"px-3 py-1 text-xs font-semibold rounded-md transition-colors " + (scopeMode === "mine" ? "bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark shadow-sm" : "text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}
          >
            {t("analytics.scopeMine")}
          </button>
        </div>
      </div>

      {timeline === "matrix" ? (
        <Card title={timelineTitle} sub={rangeSub}>
          <TimelineMatrix project={project} tasks={baseTasks} i18n={i18n} />
        </Card>
      ) : (
        <Card
          title={timelineTitle}
          sub={rangeSub}
          action={
            projects && projects.length > 1 ? (
              <select
                value={activeProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="text-xs px-2 py-1 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-500 max-w-[180px]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : null
          }
        >
          <TaskTimeline tasks={baseTasks} projects={projects} i18n={i18n} selectedProjectId={activeProjectId} />
        </Card>
      )}

      <CompletionBars tasks={baseTasks} stats={stats} t={t} />
    </div>
  );
}
