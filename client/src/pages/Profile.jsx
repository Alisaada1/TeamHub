import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import * as api from "../api";
import { useLocalUser } from "../context/LocalUserContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { queryKeys } from "../api/queryKeys";
import Avatar from "../components/ui/Avatar";
import Sheet from "../components/ui/Sheet";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import ErrorState from "../components/ui/ErrorState";
import { toast } from "../utils/toast";
import {
  EditIcon,
  LockIcon,
  CameraIcon,
  MailIcon,
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  SpinnerIcon,
  TrashIcon,
  ChevronRightIcon,
} from "../components/icons/Icons";

const ROLE_STYLES = {
  MANAGER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SUPERVISOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  MEMBER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function ShieldIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ClerkErrorMessage(err, t) {
  const first = err?.errors?.[0];
  if (first?.longMessage) return first.longMessage;
  if (first?.message) return first.message;
  return err?.message || t("common.error");
}

// ===== Inline Sub-Components =====

function PasswordChangeSheet({ open, onClose, t }) {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("profile.errors.allFieldsRequired"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("profile.errors.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("profile.errors.passwordsMismatch"));
      return;
    }
    setSaving(true);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });
      toast.success(t("profile.toasts.passwordUpdated"));
      reset();
      onClose();
    } catch (err) {
      setError(ClerkErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full ps-9 pe-10 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors";

  return (
    <Sheet open={open} onClose={handleClose} title={t("profile.changePassword")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("profile.currentPassword")}</label>
          <div className="relative">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <LockIcon size={16} />
            </span>
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder={t("profile.currentPasswordPlaceholder")}
            />
            <button type="button" onClick={() => setShowCurrent((v) => !v)} disabled={saving} className="absolute inset-y-0 end-0 flex items-center pe-3 text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark disabled:opacity-50">
              {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("profile.newPassword")}</label>
          <div className="relative">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <LockIcon size={16} />
            </span>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder={t("profile.newPasswordPlaceholder")}
            />
            <button type="button" onClick={() => setShowNew((v) => !v)} disabled={saving} className="absolute inset-y-0 end-0 flex items-center pe-3 text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark disabled:opacity-50">
              {showNew ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("profile.confirmNewPassword")}</label>
          <div className="relative">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <LockIcon size={16} />
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
              className={inputClass}
              placeholder={t("profile.confirmNewPasswordPlaceholder")}
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} disabled={saving} className="px-4 py-2.5 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {saving ? <><SpinnerIcon /> <span>{t("common.loading")}</span></> : <span>{t("common.save")}</span>}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function AvatarEditModal({ open, onClose, user, onUpdate, t }) {
  const { user: clerkUser } = useUser();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function persistImageUrl() {
    let imageUrl = clerkUser?.imageUrl || null;
    try {
      await clerkUser?.reload();
      imageUrl = clerkUser?.imageUrl || null;
    } catch {
      // keep previously resolved value
    }
    await api.updateCurrentUser({ imageUrl });
    onUpdate({ imageUrl });
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !clerkUser) return;
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error(t("profile.errors.photoFailed"), t("profile.errors.photoTooLarge"));
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error(t("profile.errors.photoFailed"), t("profile.errors.photoUnsupportedType"));
      return;
    }
    setUploading(true);
    try {
      await clerkUser.setProfileImage({ file });
      await persistImageUrl();
      toast.success(t("profile.toasts.photoUpdated"));
      onClose();
    } catch (err) {
      console.error("Avatar upload failed", err);
      toast.error(t("profile.errors.photoFailed"), err?.message || t("profile.errors.photoGenericError"));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!clerkUser) return;
    setUploading(true);
    try {
      await clerkUser.setProfileImage({ file: null });
      await persistImageUrl();
      toast.success(t("profile.toasts.photoRemoved"));
      onClose();
    } catch (err) {
      toast.error(t("profile.errors.photoFailed"), err?.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("profile.changeAvatar")} size="sm">
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-5">{t("profile.avatarDescription")}</p>

      <div className="flex items-center gap-5 mb-2">
        <div className="rounded-full p-0.5 bg-gradient-to-br from-primary-400 via-secondary-400 to-primary-500">
          <Avatar user={user} name={user?.name} size="2xl" />
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <CameraIcon size={14} />
            {uploading ? t("common.loading") : t("profile.uploadPhoto")}
          </button>
          {user?.imageUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-light dark:border-border-dark px-4 py-1.5 text-xs font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50"
            >
              {t("profile.removePhoto")}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </Modal>
  );
}

function SecurityRow({ icon, title, desc, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-4 px-5 md:px-6 py-3 text-start transition-colors hover:bg-bg-light/60 dark:hover:bg-bg-dark/60"
    >
      <div
        className={
          "p-2.5 rounded-xl shrink-0 transition-colors " +
          (danger
            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
            : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark group-hover:text-primary-600 dark:group-hover:text-primary-300")
        }
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={"text-sm font-semibold " + (danger ? "text-red-600 dark:text-red-400" : "text-text-primary-light dark:text-text-primary-dark")}>
          {title}
        </p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{desc}</p>
      </div>
      <span className="shrink-0 text-text-muted-light dark:text-text-muted-dark transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100">
        <ChevronRightIcon size={16} />
      </span>
    </button>
  );
}

// ===== Main Profile Component =====

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user: clerkUser } = useUser();
  const { user, signOut, updateUser } = useLocalUser();
  const { workspaceId, workspaceName, getUserRole } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: queryKeys.user,
    queryFn: api.getCurrentUser,
    retry: false,
  });
  const profile = profileQuery.data?.data ?? null;
  const loading = profileQuery.isLoading;
  const error = profileQuery.isError ? (profileQuery.error?.message ?? null) : null;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [nameError, setNameError] = useState(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: ({ name }) => api.updateCurrentUser({ name }),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.user, (old) =>
        old ? { ...old, data: res.data } : old
      );
      updateUser({ name: res.data.name });
      setEditing(false);
      toast.success(t("profile.toasts.profileUpdated"));
    },
    onError: (err) => toast.error(t("common.error"), err?.message),
  });
  const saveLoading = saveMutation.isPending;

  const deleteMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      toast.success(t("profile.toasts.accountDeleted"));
      setDeleteOpen(false);
      signOut();
      navigate("/", { replace: true });
    },
    onError: (err) => toast.error(t("common.error"), err?.message),
  });

  function startEditing() {
    setEditName(profile?.name || "");
    setNameError(null);
    setEditing(true);
  }

  function saveProfile() {
    const name = editName.trim();
    if (!name) {
      setNameError(t("profile.errors.nameRequired"));
      return;
    }
    if (name.length < 2) {
      setNameError(t("profile.errors.nameTooShort"));
      return;
    }
    if (name.length > 80) {
      setNameError(t("profile.errors.nameTooLong"));
      return;
    }
    saveMutation.mutate({ name });
  }

  function cancelEditing() {
    setNameError(null);
    setEditing(false);
  }

  function handleAvatarUpdate(patch) {
    queryClient.setQueryData(queryKeys.user, (old) =>
      old ? { ...old, data: { ...(old.data || {}), ...patch } } : old
    );
    updateUser(patch);
  }

  const refetchProfile = () => profileQuery.refetch();

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorState title={t("common.error")} message={error} onRetry={refetchProfile} t={t} />;

  const displayName = profile?.name || user?.name || "";
  const displayEmail = profile?.email || user?.email || "";
  const role = workspaceId && profile?.id ? getUserRole(workspaceId, profile.id) : null;
  const passwordEnabled = Boolean(clerkUser?.passwordEnabled);
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(i18n.language, { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {t("nav.myProfile")}
        </h1>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
          {t("profile.subtitle")}
        </p>
      </div>

      {/* Identity Card */}
      <div className="overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
        <div className="h-20 bg-gradient-to-br from-primary-100 via-secondary-100 to-primary-100 dark:from-primary-900/25 dark:via-secondary-900/25 dark:to-primary-900/25" />
        <div className="px-6 md:px-8 pb-6 md:pb-8 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar uploader */}
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className="relative group shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title={t("profile.changeAvatar")}
              aria-label={t("profile.changeAvatar")}
            >
              <div className="rounded-full p-1 bg-gradient-to-br from-primary-400 via-secondary-400 to-primary-500 shadow-lg shadow-primary-500/20 ring-4 ring-surface-light dark:ring-surface-dark">
                <Avatar user={profile} name={displayName} size="2xl" />
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <div className="flex flex-col items-center text-white">
                  <CameraIcon size={18} />
                  <span className="text-[10px] font-medium mt-0.5">{t("profile.changeAvatar")}</span>
                </div>
              </div>
            </button>

            {/* Identity details */}
            <div className="flex-1 min-w-0 pb-1">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("profile.nameLabel")}</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none"><UserIcon size={16} /></span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                          setNameError(null);
                        }}
                        disabled={saveLoading}
                        className="w-full ps-9 pe-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                        placeholder={t("profile.namePlaceholder")}
                      />
                    </div>
                    {nameError && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{nameError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={saveLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saveLoading ? <><SpinnerIcon /> <span>{t("profile.saving")}</span></> : <span>{t("common.save")}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saveLoading}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
                      {displayName}
                    </h2>
                    {role && (
                      <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold " + (ROLE_STYLES[role] || ROLE_STYLES.MEMBER)}>
                        {t("roles." + role) || role}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={startEditing}
                      className="p-1.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                      title={t("common.edit")}
                      aria-label={t("common.edit")}
                    >
                      <EditIcon size={14} />
                    </button>
                  </div>

                  <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1.5 flex items-center gap-2">
                    <MailIcon size={14} />
                    <span className="truncate">{displayEmail}</span>
                    <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark">
                      {t("profile.emailReadOnly")}
                    </span>
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {workspaceName && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-light dark:bg-bg-dark text-xs font-medium text-text-primary-light dark:text-text-primary-dark">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600 dark:text-primary-300">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {workspaceName}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-light dark:bg-bg-dark text-xs font-medium text-text-muted-light dark:text-text-muted-dark">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {t("profile.memberSince", { date: memberSince })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
        <div className="px-5 md:px-6 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300">
              <ShieldIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
                {t("profile.accountSecurity")}
              </h3>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                {t("profile.accountSecurityDescription")}
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
          {passwordEnabled && (
            <SecurityRow
              icon={<LockIcon size={18} />}
              title={t("profile.changePassword")}
              desc={t("profile.updatePasswordDescription")}
              onClick={() => setPasswordOpen(true)}
            />
          )}
          <SecurityRow
            danger
            icon={<TrashIcon size={18} />}
            title={t("profile.deleteAccount")}
            desc={t("profile.deleteAccountDescription")}
            onClick={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      {/* Sub-feature Overlays */}
      <PasswordChangeSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} t={t} />
      <AvatarEditModal open={avatarOpen} onClose={() => setAvatarOpen(false)} user={profile} onUpdate={handleAvatarUpdate} t={t} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("profile.deleteAccount")}
        description={t("profile.deleteAccountDescription")}
        confirmLabel={t("profile.deleteAccount")}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        danger
      />
    </div>
  );
}
