import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import Sheet from "../ui/Sheet";
import { MailIcon } from "../icons/Icons";
import { toast } from "../../utils/toast";
import { inviteUser } from "../../api";

export default function MemberInviteSheet({ open, onClose, teamId, existingMemberIds, onMemberAdded, currentRole }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [emailError, setEmailError] = useState("");
  const [apiError, setApiError] = useState("");

  const roleOptions =
    currentRole === "SUPERVISOR"
      ? ["MEMBER"]
      : ["MEMBER", "SUPERVISOR", "MANAGER"];

  useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("MEMBER");
      setEmailError("");
      setApiError("");
    }
  }, [open, t]);

  function validateEmail(value) {
    if (!value.trim()) return t("auth.errors.emailRequired");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return t("auth.errors.invalidEmail");
    return "";
  }

  const sendMutation = useMutation({
    mutationFn: ({ email: targetEmail, role: targetRole }) => inviteUser(teamId, targetEmail, targetRole),
    onSuccess: (_data, vars) => {
      toast.success(t("invitations.sent", "Invitation sent"), vars.email);
      onMemberAdded();
      onClose();
    },
    onError: (err) => {
      setApiError(err?.response?.data?.error || err?.message || t("common.error"));
    },
  });

  function handleSend() {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;
    setApiError("");
    sendMutation.mutate({ email: email.trim(), role });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("teams.inviteMember")}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800">
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
            <MailIcon size={16} />
          </div>
          <p className="text-xs text-primary-700 dark:text-primary-300">
            {t("teams.inviteMemberDesc", "Send an email invitation to bring someone into this workspace.")}
          </p>
        </div>

        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
            {t("teams.invite.emailLabel")}
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
            className={`w-full px-3 py-2 rounded-lg border bg-bg-light dark:bg-bg-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${emailError ? "border-red-400 dark:border-red-500" : "border-border-light dark:border-border-dark"}`}
            placeholder={t("teams.invite.emailPlaceholder")}
            autoFocus
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-500">{emailError}</p>
          )}
        </div>

        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
            {t("teams.invite.roleLabel", "Role")}
          </label>
          <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)} disabled={sendMutation.isPending}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50">
            <option value="MEMBER">{t("roles.MEMBER")}</option>
            {roleOptions.includes("SUPERVISOR") && <option value="SUPERVISOR">{t("roles.SUPERVISOR")}</option>}
            {roleOptions.includes("MANAGER") && <option value="MANAGER">{t("roles.MANAGER")}</option>}
          </select>
        </div>
        {apiError && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">{apiError}</div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMutation.isPending ? t("teams.invite.sending") : t("teams.invite.send")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={sendMutation.isPending}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
