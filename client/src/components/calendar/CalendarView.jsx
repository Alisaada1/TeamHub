import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import StatusBadge from "../tasks/StatusBadge";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "../icons/Icons";
import { localDateKey, upcomingTasks, overdueTasks } from "../analytics/metrics";

const PRIORITY_DOT = { URGENT: "#EF4444", HIGH: "#F97316", MEDIUM: "#3B82F6", LOW: "#9CA3AF" };
const PRIORITY_CHIP = {
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function TaskChip({ task, onClick }) {
  const isCompleted = task.status === "COMPLETED";
  const chipClass = PRIORITY_CHIP[task.priority] || PRIORITY_CHIP.MEDIUM;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
      className={
        "w-full text-start text-[10px] font-medium px-1.5 py-0.5 rounded truncate transition-colors hover:opacity-80 " +
        chipClass +
        (isCompleted ? " line-through opacity-60" : "")
      }
    >
      {task.title}
    </button>
  );
}

export default function CalendarView({ tasks, onTaskClick, onCreateTask }) {
  const { t, i18n } = useTranslation();
  const today = new Date();
  const todayKey = localDateKey(today);
  const isRtl = i18n.dir() === "rtl";

  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dayPopover, setDayPopover] = useState(null);

  const tasksByDate = useMemo(() => {
    const map = {};
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = localDateKey(new Date(task.dueDate));
      if (!map[key]) map[key] = [];
      map[key].push(task);
    }
    return map;
  }, [tasks]);

  const upcoming = useMemo(() => upcomingTasks(tasks, 7), [tasks]);
  const overdue = useMemo(() => overdueTasks(tasks), [tasks]);

  const weekdays = useMemo(() => {
    const base = WEEKDAY_KEYS.map((k) => t("calendar.weekdays." + k));
    return isRtl ? [...base].reverse() : base;
  }, [t, isRtl]);

  function goPrev() {
    if (view === "month") setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    else setCursor((c) => addDays(startOfWeek(c), -7));
  }

  function goNext() {
    if (view === "month") setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    else setCursor((c) => addDays(startOfWeek(c), 7));
  }

  function goToday() {
    setCursor(view === "month" ? new Date(today.getFullYear(), today.getMonth(), 1) : startOfWeek(today));
  }

  const monthLabel = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

  const days = useMemo(() => {
    if (view === "month") {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < firstDay; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
      return cells;
    }
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const weekLabel = useMemo(() => {
    if (view !== "week") return "";
    const start = days[0];
    const end = days[6];
    if (!start || !end) return "";
    const fmt = (d) => d.toLocaleDateString(i18n.language, { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [view, days, i18n.language]);

  function hasOverdue(date) {
    const key = localDateKey(date);
    return (tasksByDate[key] || []).some((task) => task.status !== "COMPLETED" && new Date(task.dueDate) < new Date());
  }

  function openDay(date) {
    setDayPopover(date);
  }

  function renderCell(date, isRtlCell) {
    if (!date) return <div className="bg-surface-light dark:bg-surface-dark min-h-[52px]" />;
    const key = localDateKey(date);
    const dayTasks = tasksByDate[key] || [];
    const isToday = key === todayKey;
    const overdueToday = hasOverdue(date);
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate()) && !isToday;
    return (
      <div
        className={
          "group relative bg-surface-light dark:bg-surface-dark min-h-[52px] p-1.5 transition-colors " +
          (isToday ? "ring-2 ring-inset ring-primary-400 dark:ring-primary-500" : "hover:bg-bg-light/60 dark:hover:bg-bg-dark/60") +
          (isPast && dayTasks.length === 0 ? " opacity-60" : "")
        }
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={
              "text-xs font-medium " +
              (isToday
                ? "text-primary-600 dark:text-primary-400 font-bold"
                : overdueToday
                  ? "text-red-500 dark:text-red-400 font-bold"
                  : "text-text-muted-light dark:text-text-muted-dark")
            }
          >
            {date.getDate()}
          </span>
          {onCreateTask && (
            <button
              type="button"
              onClick={() => onCreateTask(key)}
              title={t("calendar.addOnDay", { date: key })}
              aria-label={t("calendar.addOnDay", { date: key })}
              className="p-0.5 rounded text-text-muted-light dark:text-text-muted-dark opacity-0 group-hover:opacity-100 hover:text-primary-600 dark:hover:text-primary-400 transition-opacity"
            >
              <PlusIcon size={12} />
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {dayTasks.slice(0, 3).map((task) => (
            <TaskChip key={task.id} task={task} onClick={onTaskClick} />
          ))}
          {dayTasks.length > 3 && (
            <button
              type="button"
              onClick={() => openDay(date)}
              className="text-[9px] text-text-muted-light dark:text-text-muted-dark px-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {t("calendar.moreTasks", { count: dayTasks.length - 3 })}
            </button>
          )}
        </div>
      </div>
    );
  }

  const popoverTasks = dayPopover ? tasksByDate[localDateKey(dayPopover)] || [] : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-3">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors" aria-label={view === "month" ? t("calendar.prevMonth") : t("calendar.prevWeek")}>
              {isRtl ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
            </button>
            <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors" aria-label={view === "month" ? t("calendar.nextMonth") : t("calendar.nextWeek")}>
              {isRtl ? <ChevronLeftIcon size={16} /> : <ChevronRightIcon size={16} />}
            </button>
            <h3 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark ms-1">
              {view === "month" ? monthLabel : weekLabel}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark text-xs font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
            >
              {t("calendar.today")}
            </button>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
              <button
                type="button"
                onClick={() => { setView("month"); }}
                className={"px-2.5 py-1 text-xs font-semibold rounded-md transition-colors " + (view === "month" ? "bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark shadow-sm" : "text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}
              >
                {t("calendar.monthView")}
              </button>
              <button
                type="button"
                onClick={() => { setView("week"); setCursor(startOfWeek(cursor)); }}
                className={"px-2.5 py-1 text-xs font-semibold rounded-md transition-colors " + (view === "week" ? "bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark shadow-sm" : "text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}
              >
                {t("calendar.weekView")}
              </button>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-7 gap-px bg-border-light dark:bg-border-dark rounded-xl overflow-hidden ${isRtl ? "dir-rtl" : ""}`}>
          {weekdays.map((d) => (
            <div key={d} className="bg-bg-light dark:bg-bg-dark px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">
              {d}
            </div>
          ))}
          {view === "month" ? (
            days.map((date, idx) => <div key={date ? date.getTime() : `e-${idx}`}>{renderCell(date)}</div>)
          ) : (
            days.map((date) => (
              <div key={date.getTime()}>
                <div className={"bg-bg-light dark:bg-bg-dark px-1.5 py-1 text-center border-b border-border-light dark:border-border-dark " + (localDateKey(date) === todayKey ? "text-primary-600 dark:text-primary-400 font-bold" : "")}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("calendar.weekdays." + WEEKDAY_KEYS[date.getDay()])}</span>
                  <span className={"block text-sm tabular-nums " + (localDateKey(date) === todayKey ? "text-primary-600 dark:text-primary-400" : "text-text-primary-light dark:text-text-primary-dark")}>{date.getDate()}</span>
                </div>
                {renderCell(date)}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-3 self-start">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon size={14} className="text-text-muted-light dark:text-text-muted-dark" />
          <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{t("calendar.upcoming")}</h3>
        </div>
        {overdue.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-red-500 dark:text-red-400 mb-1.5">{t("analytics.overdue")}</p>
            <div className="space-y-1">
              {overdue.slice(0, 4).map((task) => (
                <UpcomingButton key={task.id} task={task} overdue onTaskClick={onTaskClick} t={t} i18n={i18n} />
              ))}
            </div>
          </div>
        )}
        <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted-light dark:text-text-muted-dark mb-1.5">{t("calendar.nextSeven")}</p>
        {upcoming.length === 0 ? (
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center py-6">{t("calendar.noUpcoming")}</p>
        ) : (
          <div className="space-y-1">
            {upcoming.slice(0, 6).map((task) => (
              <UpcomingButton key={task.id} task={task} onTaskClick={onTaskClick} t={t} i18n={i18n} />
            ))}
          </div>
        )}
        {onCreateTask && (
          <button
            type="button"
            onClick={() => onCreateTask(localDateKey(today))}
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border-light dark:border-border-dark text-xs font-medium text-text-muted-light dark:text-text-muted-dark hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-400 dark:hover:border-primary-600 transition-colors"
          >
            <PlusIcon size={12} /> {t("calendar.addOnDay", { date: localDateKey(today) })}
          </button>
        )}
      </div>

      <Modal open={!!dayPopover} onClose={() => setDayPopover(null)} title={dayPopover ? dayPopover.toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric" }) : ""}>
        {popoverTasks.length === 0 ? (
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-4">{t("calendar.emptyDay")}</p>
        ) : (
          <div className="space-y-2">
            {popoverTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => { onTaskClick?.(task); setDayPopover(null); }}
                className="w-full text-start rounded-xl border border-border-light dark:border-border-dark p-3 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT[task.priority] || "#9CA3AF" }} />
                  <span className={"text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate " + (task.status === "COMPLETED" ? "line-through opacity-60" : "")}>{task.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} />
                  <span className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
                    {task.assignee?.name || t("tasks.detail.unassigned")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {onCreateTask && dayPopover && (
          <button
            type="button"
            onClick={() => { onCreateTask(localDateKey(dayPopover)); setDayPopover(null); }}
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border-light dark:border-border-dark text-xs font-medium text-text-muted-light dark:text-text-muted-dark hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-400 dark:hover:border-primary-600 transition-colors"
          >
            <PlusIcon size={12} /> {t("calendar.addOnDay", { date: localDateKey(dayPopover) })}
          </button>
        )}
      </Modal>
    </div>
  );
}

function UpcomingButton({ task, overdue, onTaskClick, t, i18n }) {
  return (
    <button type="button" onClick={() => onTaskClick?.(task)} className="w-full text-start flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT[task.priority] || "#9CA3AF" }} />
      <span className={"text-sm truncate flex-1 " + (overdue ? "text-red-600 dark:text-red-400" : "text-text-primary-light dark:text-text-primary-dark")}>{task.title}</span>
      <span className={"text-xs whitespace-nowrap tabular-nums " + (overdue ? "text-red-500 dark:text-red-400 font-semibold" : "text-text-muted-light dark:text-text-muted-dark")}>
        {overdue ? t("analytics.overdue") : new Date(task.dueDate).toLocaleDateString(i18n.language, { weekday: "short", month: "short", day: "numeric" })}
      </span>
    </button>
  );
}
