import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateTeam } from "../../api";
import { toast } from "../../utils/toast";
import Sheet from "../ui/Sheet";
import { SpinnerIcon, TrashIcon } from "../icons/Icons";

export default function TeamSettingsSheet({ open, onClose, team, userRole, onSave, onDelete, onLeave, t }) {
  const [name, setName] = useState(team?.name || "");
  const [description, setDescription] = useState(team?.description || "");
  const isAdmin = userRole === "MANAGER";
  const canEdit = userRole === "MANAGER";

  useEffect(() => {
    if (open && team) {
      setName(team.name || "");
      setDescription(team.description || "");
    }
  }, [open, team]);

  const updateMutation = useMutation({
    mutationFn: (payload) => updateTeam(team.id, payload),
    onSuccess: (_data, payload) => {
      toast.success(t("teams.toasts.teamSettingsUpdated"));
      onSave({ ...team, name: payload.name, description: payload.description });
      onClose();
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    updateMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("nav.settings")}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
            {t("teams.form.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={!canEdit}
            disabled={updateMutation.isPending}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 read-only:opacity-60 read-only:cursor-not-allowed transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
            {t("teams.form.description")}
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            readOnly={!canEdit}
            disabled={updateMutation.isPending}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 read-only:opacity-60 read-only:cursor-not-allowed transition-colors resize-none"
            placeholder={t("teams.form.descPlaceholder")}
          />
        </div>
        {canEdit && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !name.trim()}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {updateMutation.isPending ? <><SpinnerIcon /> <span>{t("common.loading")}</span></> : <span>{t("common.save")}</span>}
            </button>
          </div>
        )}
      </form>

      <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark space-y-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(team)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <TrashIcon size={14} />
            <span>{t("common.delete")}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onLeave}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{t("teams.leaveTeam")}</span>
        </button>
      </div>
    </Sheet>
  );
}