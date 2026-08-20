import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Modal from "../ui/Modal";
import { createProject } from "../../api";
import { toast } from "../../utils/toast";
import { SpinnerIcon } from "../icons/Icons";

const STATUS_OPTIONS = ["ACTIVE", "PENDING", "ON_HOLD", "COMPLETED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_LABELS = { ACTIVE: "Active", PENDING: "Pending", ON_HOLD: "On Hold", COMPLETED: "Completed" };
const PRIORITY_LABELS = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };

export default function ProjectCreateModal({ open, onClose, teamId, onCreated, t }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [priority, setPriority] = useState("MEDIUM");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState(null);

  const createMutation = useMutation({
    mutationFn: () => createProject(teamId, {
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      priority: priority || undefined,
      startDate: startDate || undefined,
      dueDate: endDate || undefined,
    }),
    onSuccess: (res) => {
      toast.success(t("projectCreate.toasts.projectCreated"));
      reset();
      onClose();
      onCreated(res.data);
    },
    onError: (err) => {
      if (err.response?.status === 403) {
        setError(t("projectCreate.noWorkspace"));
      } else {
        setError(err?.response?.data?.error || err?.message || t("projectCreate.toasts.errorOccurred"));
      }
    },
  });

  const missingTeam = !teamId;

  function reset() {
    setName("");
    setDescription("");
    setStatus("ACTIVE");
    setPriority("MEDIUM");
    setStartDate("");
    setEndDate("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("projectCreate.nameRequired"));
      return;
    }
    if (!teamId) {
      setError(t("projectCreate.noTeam", "No team selected. Please select a team first."));
      return;
    }
    createMutation.mutate();
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("projectCreate.title")} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("projectCreate.nameLabel")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createMutation.isPending}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
            placeholder={t("projectCreate.namePlaceholder")}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("projectCreate.descriptionLabel")}</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={createMutation.isPending}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors resize-none"
            placeholder={t("projectCreate.descPlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">{t("projectCreate.statusLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={"px-3 py-1.5 text-xs font-semibold rounded-full transition-all " + (status === s ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}>
                {t("projects.detail.status." + s, STATUS_LABELS[s])}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">{t("projectCreate.priorityLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)}
                className={"px-3 py-1.5 text-xs font-semibold rounded-full transition-all " + (priority === p ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}>
                {t("projects.detail.priority." + p, PRIORITY_LABELS[p])}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div lang="en" dir="ltr">
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("projectCreate.startDateLabel")}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={createMutation.isPending}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors" />
          </div>
          <div lang="en" dir="ltr">
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("projectCreate.endDateLabel")}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={createMutation.isPending}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors" />
          </div>
        </div>
        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} disabled={createMutation.isPending} className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={createMutation.isPending || !name.trim() || missingTeam} className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {createMutation.isPending ? <><SpinnerIcon /> <span>{t("projectCreate.submitting")}</span></> : <span>{t("projectCreate.submit")}</span>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
