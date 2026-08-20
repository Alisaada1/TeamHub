import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"];

const STATUS_COLORS = {
  PENDING: "bg-amber-400",
  IN_PROGRESS: "bg-blue-400",
  COMPLETED: "bg-emerald-400",
  DELAYED: "bg-red-400",
};

const STATUS_BG = {
  PENDING: "bg-amber-50/40 dark:bg-amber-900/10",
  IN_PROGRESS: "bg-blue-50/40 dark:bg-blue-900/10",
  COMPLETED: "bg-emerald-50/40 dark:bg-emerald-900/10",
  DELAYED: "bg-red-50/40 dark:bg-red-900/10",
};

export default function KanbanBoard({ tasks, onTaskClick, onStatusChange, renderCard, canDragTask = () => true }) {
  const { t } = useTranslation();
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const columns = useMemo(() => {
    const cols = { PENDING: [], IN_PROGRESS: [], COMPLETED: [], DELAYED: [] };
    for (const task of tasks) {
      if (cols[task.status]) cols[task.status].push(task);
    }
    return cols;
  }, [tasks]);

  const handleDragStart = useCallback((e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      onStatusChange(taskId, status);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, [onStatusChange]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUSES.map((status) => {
        const columnTasks = columns[status] || [];
        const isOver = dragOverColumn === status;
        return (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className={"rounded-xl border border-border-light dark:border-border-dark p-2.5 " + (STATUS_BG[status] || "")}>
              <div className="flex items-center gap-2 mb-2">
                <div className={"w-2.5 h-2.5 rounded-full " + (STATUS_COLORS[status] || "bg-slate-400")} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary-light dark:text-text-primary-dark">
                  {t("projects.detail.status." + status)}
                </h3>
                <span className="text-[10px] font-medium text-text-muted-light dark:text-text-muted-dark bg-surface-light dark:bg-surface-dark px-1.5 py-0.5 rounded-full ms-auto">
                  {columnTasks.length}
                </span>
              </div>
              <div
                className={`space-y-2 min-h-[120px] rounded-lg border-2 border-dashed p-1.5 transition-colors ${
                  isOver
                    ? "border-primary-400 bg-primary-50/60 dark:bg-primary-900/20"
                    : "border-border-light dark:border-border-dark bg-surface-light/50 dark:bg-surface-dark/30"
                }`}
              >
                {columnTasks.map((task) => {
                  const draggable = canDragTask(task);
                  return (
                    <div
                      key={task.id}
                      draggable={draggable}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={(task.id === draggedTaskId ? "opacity-50 " : "") + (draggable ? "" : "cursor-default")}
                    >
                      {renderCard ? (
                        renderCard(task)
                      ) : (
                        <div
                          className="rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-3 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer"
                          onClick={() => onTaskClick?.(task)}
                        >
                          <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                            {task.title}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {columnTasks.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-xs text-text-muted-light dark:text-text-muted-dark">
                    {t("projects.detail.noTasks")}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
