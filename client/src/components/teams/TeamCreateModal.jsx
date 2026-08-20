import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTeam, inviteUser } from "../../api";
import { invalidateQueryCache } from "../../api/queryKeys";
import Modal from "../ui/Modal";
import { toast } from "../../utils/toast";
import { PlusIcon } from "../icons/Icons";

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors " + (checked ? "bg-primary-500" : "bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark") + " cursor-pointer"}
    >
      <span className={"inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " + (checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1")} />
    </button>
  );
}

export default function TeamCreateModal({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRows, setInviteRows] = useState([{ email: "", role: "MEMBER" }]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setInviteOpen(false);
      setInviteRows([{ email: "", role: "MEMBER" }]);
      setError(null);
    }
  }, [open]);

  function updateRow(index, field, value) {
    setInviteRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addRow() {
    setInviteRows((prev) => [...prev, { email: "", role: "MEMBER" }]);
  }

  function removeRow(index) {
    setInviteRows((prev) => prev.filter((_, i) => i !== index));
  }

  const createMutation = useMutation({
    mutationFn: async ({ name: trimmed, invites }) => {
      const res = await createTeam({
        name: trimmed,
        description: description.trim() || undefined,
      });
      const created = res.data;
      if (invites.length > 0) {
        const results = await Promise.allSettled(
          invites.map((inv) => inviteUser(created.id, inv.email, inv.role))
        );
        const failures = [];
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            failures.push({
              email: invites[i].email,
              error: r.reason?.response?.data?.error || r.reason?.message || "Failed",
            });
          }
        });
        if (failures.length > 0) {
          created._inviteErrors = failures;
        }
      }
      return created;
    },
    onSuccess: (created) => {
      toast.success(t("teams.toasts.created"), created.name);
      if (created._inviteErrors?.length > 0) {
        for (const fail of created._inviteErrors) {
          toast.error(`${fail.email}: ${fail.error}`);
        }
      }
      invalidateQueryCache(queryClient, "team");
      onClose();
      navigate("/dashboard");
    },
    onError: (err) => {
      setError(err?.response?.data?.error || err?.message || t("common.error"));
    },
  });

  function handleSubmit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("teams.errors.nameRequired"));
      return;
    }

    const invites = [];
    if (inviteOpen) {
      for (const row of inviteRows) {
        const email = row.email.trim();
        if (!email) continue;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError(t("teams.errors.invalidEmail", "Please enter a valid email address"));
          return;
        }
        invites.push({ email, role: row.role || "MEMBER" });
      }
    }

    createMutation.mutate({ name: trimmed, invites });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("teams.createNew")} size="md">
      <div className="space-y-4">
        <div>
          <label htmlFor="team-name" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
            {t("teams.form.name")}
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createMutation.isPending}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
            placeholder={t("teams.form.namePlaceholder")}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="team-desc" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
            {t("teams.form.description")}
          </label>
          <textarea
            id="team-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={createMutation.isPending}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors resize-none"
            placeholder={t("teams.form.descPlaceholder")}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
            {t("teams.form.inviteToggle")}
          </span>
          <ToggleSwitch checked={inviteOpen} onChange={setInviteOpen} />
        </div>

        {inviteOpen && (
          <div className="space-y-3 border border-border-light dark:border-border-dark rounded-lg p-3 bg-bg-light/50 dark:bg-bg-dark/30">
            {inviteRows.map((row, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1 min-w-0" style={{ width: "60%" }}>
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateRow(index, "email", e.target.value)}
                    placeholder={t("teams.form.emailPlaceholder")}
                    disabled={createMutation.isPending}
                    className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                  />
                </div>
                <div className="flex-shrink-0" style={{ width: "40%" }}>
                  <select
                    value={row.role}
                    onChange={(e) => updateRow(index, "role", e.target.value)}
                    disabled={createMutation.isPending}
                    className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
                  >
                    <option value="MEMBER">{t("roles.MEMBER")}</option>
                    <option value="SUPERVISOR">{t("roles.SUPERVISOR")}</option>
                    <option value="MANAGER">{t("roles.MANAGER")}</option>
                  </select>
                </div>
                {inviteRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={createMutation.isPending}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted-light dark:text-text-muted-dark hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
                    title={t("common.remove")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-200 transition-colors disabled:opacity-50"
            >
              <PlusIcon size={14} />
              <span>{t("teams.form.addAnother")}</span>
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50">
            {t("common.cancel")}
          </button>
          <button type="button" onClick={handleSubmit} disabled={createMutation.isPending}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {createMutation.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>{t("common.loading")}</span>
              </>
            ) : (
              <span>{t("teams.createNew")}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
