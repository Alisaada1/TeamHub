import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as api from "../../api";
import Sheet from "../ui/Sheet";
import ConfirmDialog from "../ui/ConfirmDialog";
import { TrashIcon, SpinnerIcon } from "../icons/Icons";
import { toast } from "../../utils/toast";

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function TaskEditSheet({ open, onClose, task, userRole, editable = true, members, onSaved, onDelete, projectStartDate, projectDueDate }) {
  const { t } = useTranslation();

  const canDelete = userRole === "MANAGER" || userRole === "SUPERVISOR";
  const isMember = userRole === "MEMBER";
  const readOnly = !editable;

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("PENDING");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (payload) => api.updateTask(task.id, payload),
    onSuccess: (res) => {
      toast.success(t("common.saved"));
      onSaved?.(res.data || res);
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteTask(task.id),
    onSuccess: () => {
      toast.success(t("toasts.taskDeleted", "Task deleted"));
      onDelete?.(task.id);
      onClose();
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
    onSettled: () => {
      setDeleteConfirmOpen(false);
    },
  });

  const editDateBounds = useMemo(() => {
    const bounds = { min: "", max: "" };
    if (projectStartDate) bounds.min = new Date(projectStartDate).toISOString().slice(0, 10);
    if (projectDueDate) bounds.max = new Date(projectDueDate).toISOString().slice(0, 10);
    return bounds;
  }, [projectStartDate, projectDueDate]);

  useEffect(() => {
    if (open && task?.id) {
      setEditTitle(task.title || "");
      setEditDescription(task.description || "");
      setEditStatus(task.status || "PENDING");
      setEditPriority(task.priority || "MEDIUM");
      setEditAssigneeId(task.assigneeId || "");
      setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
    }
  }, [open, task?.id]);

  function handleSave(e) {
    e.preventDefault();
    if (readOnly) {
      toast.error(t("tasks.noPermissionEditDetails", "You do not have permission to edit this task's details."));
      return;
    }
    if (!editTitle.trim()) return;
    const payload = {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      status: editStatus,
      priority: editPriority,
      dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
    };
    if (!isMember) {
      payload.assigneeId = editAssigneeId || undefined;
    }
    saveMutation.mutate(payload);
  }

  function handleDelete() {
    deleteMutation.mutate();
  }

  if (!task) return null;

  return (
    <Sheet open={open} onClose={onClose} title={t("tasks.detail.drawerTitle")}>
      <div className="space-y-3.5">
        {readOnly && (
          <div className="p-2.5 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-xs text-text-muted-light dark:text-text-muted-dark">
            {t("tasks.readOnlyHint", "This task is not assigned to you. You can view it, but only its assignee can edit it.")}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.create.titleLabel")}</label>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={saveMutation.isPending || readOnly}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.create.descriptionLabel")}</label>
            <textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} disabled={saveMutation.isPending || readOnly}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">{t("tasks.detail.statusLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setEditStatus(s)} disabled={saveMutation.isPending || readOnly}
                  className={"px-3 py-1.5 text-xs font-semibold rounded-full transition-all " + (editStatus === s ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}>
                  {t("projects.detail.status." + s, s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " "))}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">{t("tasks.detail.priorityLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button key={p} type="button" onClick={() => setEditPriority(p)} disabled={saveMutation.isPending || readOnly}
                  className={"px-3 py-1.5 text-xs font-semibold rounded-full transition-all " + (editPriority === p ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}>
                  {t("projects.detail.priority." + p, p.charAt(0) + p.slice(1).toLowerCase())}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.detail.assigneeLabel")}</label>
              <select value={editAssigneeId} onChange={(e) => setEditAssigneeId(e.target.value)} disabled={saveMutation.isPending || readOnly || isMember}
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors">
                <option value="">{t("tasks.detail.unassigned")}</option>
                {(members || []).map((m) => (
                  <option key={m.userId} value={m.userId}>{m.user?.name || m.userId}</option>
                ))}
              </select>
            </div>
            <div lang="en" dir="ltr">
              <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.detail.dueDateLabel")}</label>
              <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} disabled={saveMutation.isPending || readOnly}
                min={editDateBounds.min || undefined} max={editDateBounds.max || undefined}
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            {canDelete && !readOnly && (
              <button type="button" onClick={() => setDeleteConfirmOpen(true)} disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <TrashIcon size={14} /> {t("tasks.detail.delete")}
              </button>
            )}
            <div className="flex items-center gap-3 ms-auto">
              <button type="button" onClick={onClose} disabled={saveMutation.isPending} className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50">
                {t("tasks.detail.cancel")}
              </button>
              <button type="submit" disabled={readOnly || saveMutation.isPending || !editTitle.trim()}
                title={readOnly ? t("tasks.noPermissionEditDetails", "You do not have permission to edit this task's details.") : undefined}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
                {saveMutation.isPending ? <><SpinnerIcon /> <span>{t("tasks.detail.saving")}</span></> : <span>{t("common.save")}</span>}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={t("tasks.detail.deleteConfirmTitle")}
        description={t("tasks.detail.deleteConfirmMessage", { title: task?.title })}
        confirmLabel={deleteMutation.isPending ? t("common.deleting", "Deleting...") : t("tasks.detail.deleteConfirm")}
        onConfirm={handleDelete}
        danger
      />
    </Sheet>
  );
}
