import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocalUser } from "../../context/LocalUserContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { deleteTeam, leaveTeam } from "../../api";
import { invalidateQueryCache } from "../../api/queryKeys";
import { toast } from "../../utils/toast";
import Logo from "./Logo";
import Sheet from "../ui/Sheet";
import ConfirmDialog from "../ui/ConfirmDialog";
import TeamCreateModal from "../teams/TeamCreateModal";
import TeamSettingsSheet from "../teams/TeamSettingsSheet";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "../icons/Icons";

const ICONS = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  teams: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  projects: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  tasks: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  comments: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  members: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  notifications: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  help: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const navItems = [
  { key: "dashboard", path: "/dashboard" },
  { key: "projects", path: "/projects" },
  { key: "tasks", path: "/tasks" },
  { key: "members", path: "/members" },
  { key: "comments", path: "/comments" },
  { key: "notifications", path: "/notifications" },
];

export default function Sidebar({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const { user } = useLocalUser();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === "ar";
  const [helpOpen, setHelpOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [settingsTeamId, setSettingsTeamId] = useState(null);
  const [deleteTeamTarget, setDeleteTeamTarget] = useState(null);
  const [leaveTeamId, setLeaveTeamId] = useState(null);

  const { workspaceId, workspaceName, teams, setWorkspace, canManageTeam, loadTeams } = useWorkspace();
  const settingsTeam = teams.find((t) => t.id === settingsTeamId) || null;
  const settingsUserRole = settingsTeam
    ? (settingsTeam.members || []).find((m) => m.userId === user?.id)?.role || null
    : null;

  function linkClass(isActive) {
    return `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
        : "text-text-muted-light dark:text-text-muted-dark hover:bg-primary-50 dark:hover:bg-surface-dark/60"
    }`;
  }

  function handleWorkspaceSelect(id, name) {
    setWorkspace(id, name);
    setWorkspaceOpen(false);
    setSettingsTeamId(null);
    setDeleteTeamTarget(null);
    setLeaveTeamId(null);
  }

  function handleSettingsClick(e, teamId) {
    e.stopPropagation();
    setSettingsTeamId(teamId);
  }

  async function handleCreateTeamClose() {
    setCreateTeamOpen(false);
    await loadTeams();
  }

  function handleSettingsSave(_updatedTeam) {
    loadTeams();
  }

  function handleSettingsDelete() {
    setDeleteTeamTarget(settingsTeamId);
    setSettingsTeamId(null);
  }

  const deleteTeamMutation = useMutation({
    mutationFn: (teamId) => deleteTeam(teamId),
    onSuccess: () => {
      toast.success(t("teams.toasts.teamDeleted"));
      setDeleteTeamTarget(null);
      setSettingsTeamId(null);
      invalidateQueryCache(queryClient, "team", "member");
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  const leaveTeamMutation = useMutation({
    mutationFn: (teamId) => leaveTeam(teamId),
    onSuccess: () => {
      toast.success(t("teams.toasts.leftTeam"));
      setLeaveTeamId(null);
      setSettingsTeamId(null);
      setWorkspaceOpen(false);
      invalidateQueryCache(queryClient, "team", "member");
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  function handleConfirmDelete() {
    if (!deleteTeamTarget) return;
    deleteTeamMutation.mutate(deleteTeamTarget);
  }

  function handleSettingsLeave() {
    if (!leaveTeamId || !user) return;
    leaveTeamMutation.mutate(leaveTeamId);
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 bg-surface-light dark:bg-surface-dark flex flex-col overflow-y-auto sidebar-scroll shrink-0 ${
          isRTL ? "border-l" : "border-r"
        } border-border-light dark:border-border-dark fixed top-0 h-full z-40 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:shadow-none lg:translate-x-0 lg:z-auto lg:h-screen ${
          isRTL ? "right-0" : "left-0"
        } ${
          isOpen
            ? "translate-x-0"
            : isRTL
              ? "translate-x-full"
              : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-3.5 border-b border-border-light dark:border-border-dark flex items-start gap-3 shrink-0">
          <Logo size="sm" className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-base text-text-primary-light dark:text-text-primary-dark">
              {t("app.name")}
            </p>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark leading-tight mt-0.5">
              {t("app.tagline")}
            </p>
          </div>
        </div>

        {/* Workspace Switcher — Teams */}
        <div className="border-b border-border-light dark:border-border-dark shrink-0">
          <button
            type="button"
            onClick={() => setWorkspaceOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-start hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary-500">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                {t("nav.teams")}
              </p>
              <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                {workspaceName || "—"}
              </p>
            </div>
            <ChevronDownIcon size={14} />
          </button>

          {workspaceOpen && (
            <div className="flex flex-col pb-2">
              <div className="px-3 space-y-0.5 max-h-[35vh] overflow-y-auto">
                {teams.map((tm) => {
                  const isActive = tm.id === workspaceId;
                  const showSettings = user && canManageTeam(tm.id, user.id);
                  return (
                    <button
                      key={tm.id}
                      type="button"
                      onClick={() => handleWorkspaceSelect(tm.id, tm.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200 font-medium"
                          : "text-text-muted-light dark:text-text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark"
                      }`}
                    >
                      <span className="w-4 shrink-0 flex items-center justify-center">
                        {isActive && <CheckIcon size={13} />}
                      </span>
                      <span className="truncate flex-1 text-start">{tm.name}</span>
                      {showSettings && (
                        <button
                          type="button"
                          onClick={(e) => handleSettingsClick(e, tm.id)}
                          className="shrink-0 p-1 rounded-md text-text-muted-light dark:text-text-muted-dark hover:text-primary-500 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title={t("settings.title")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLeaveTeamId(tm.id); }}
                        className="shrink-0 p-1 rounded-md text-text-muted-light dark:text-text-muted-dark hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t("teams.leaveTeam")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                      </button>
                    </button>
                  );
                })}
              </div>
              <div className="px-3 pt-2 mt-1 border-t border-border-light dark:border-border-dark sticky bottom-0 bg-surface-light dark:bg-surface-dark">
                <button
                  type="button"
                  onClick={() => { setWorkspaceOpen(false); setCreateTeamOpen(true); }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition-colors"
                >
                  <PlusIcon size={14} />
                  <span>{t("teams.createNew")}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto shrink-0">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end
              className={({ isActive }) => linkClass(isActive)}
            >
              <span className="shrink-0">{ICONS[item.key]}</span>
              <span>{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border-light dark:border-border-dark space-y-1 shrink-0 mt-auto">
          <NavLink
            to="/profile"
            end
            className={({ isActive }) => linkClass(isActive)}
          >
            <span className="shrink-0">{ICONS.profile}</span>
            <span>{t("nav.profile")}</span>
          </NavLink>
          <NavLink
            to="/settings"
            end
            className={({ isActive }) => linkClass(isActive)}
          >
            <span className="shrink-0">{ICONS.settings}</span>
            <span>{t("nav.settings")}</span>
          </NavLink>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-text-muted-light dark:text-text-muted-dark hover:bg-primary-50 dark:hover:bg-surface-dark/60"
          >
            <span className="shrink-0">{ICONS.help}</span>
            <span>{t("nav.help")}</span>
          </button>
        </div>
      </aside>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title={t("nav.help")}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark uppercase tracking-wider mb-3">{t("help.quickStart")}</h3>
            <div className="space-y-3">
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300 text-xs font-bold">1</span>
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{t("help.step1Title")}</p>
                </div>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark ms-10">{t("help.step1Desc")}</p>
              </div>
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300 text-xs font-bold">2</span>
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{t("help.step2Title")}</p>
                </div>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark ms-10">{t("help.step2Desc")}</p>
              </div>
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300 text-xs font-bold">3</span>
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{t("help.step3Title")}</p>
                </div>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark ms-10">{t("help.step3Desc")}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border-light dark:border-border-dark pt-6">
            <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark uppercase tracking-wider mb-3">{t("help.keyboardShortcuts")}</h3>
            <div className="space-y-2">
              {[
                { keys: "Ctrl + K", desc: t("help.shortcutDesc") },
                { keys: "Ctrl + B", desc: t("help.shortcutSidebar") },
                { keys: "Escape", desc: t("help.shortcutClose") },
                { keys: "Ctrl + /", desc: t("help.shortcutSearch") },
              ].map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-text-primary-light dark:text-text-primary-dark">{shortcut.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-xs text-text-muted-light dark:text-text-muted-dark font-mono">{shortcut.keys}</kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border-light dark:border-border-dark pt-6">
            <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark uppercase tracking-wider mb-3">{t("help.roleGuide")}</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10">
                <span className="text-lg shrink-0 mt-0.5">👑</span>
                <div>
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{t("help.roleAdmin")}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{t("help.roleAdminDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/10">
                <span className="text-lg shrink-0 mt-0.5">⭐</span>
                <div>
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{t("help.roleSupervisor")}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{t("help.roleSupervisorDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/10">
                <span className="text-lg shrink-0 mt-0.5">🔹</span>
                <div>
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{t("help.roleMember")}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{t("help.roleMemberDesc")}</p>
                </div>
              </div>
            </div>
          </div>

              <div className="border-t border-border-light dark:border-border-dark pt-6">
                <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark uppercase tracking-wider mb-3">{t("help.contactTitle")}</h3>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-3">{t("help.contactDesc")}</p>
                <div className="space-y-3 p-4 rounded-xl bg-bg-light dark:bg-bg-dark">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                      {t("help.contactEmailLabel")}
                    </span>
                    <a
                      href="mailto:hubteam434@gmail.com"
                      className="text-sm text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 font-medium transition-colors"
                    >
                      hubteam434@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                      {t("help.contactPhoneLabel")}
                    </span>
                    <a
                      href="tel:+963935036746"
                      className="text-sm text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 font-medium transition-colors"
                      dir="ltr"
                    >
                      +963935036746
                    </a>
                  </div>
                </div>
              </div>
            </div>
      </Sheet>
      <TeamSettingsSheet
        open={!!settingsTeamId}
        onClose={() => setSettingsTeamId(null)}
        team={settingsTeam}
        userRole={settingsUserRole}
        onSave={handleSettingsSave}
        onDelete={handleSettingsDelete}
        onLeave={() => setLeaveTeamId(settingsTeamId)}
        t={t}
      />

      <ConfirmDialog
        open={!!leaveTeamId}
        onClose={() => setLeaveTeamId(null)}
        title={t("confirmDelete.leaveTeamTitle")}
        description={t("confirmDelete.leaveTeamDescription")}
        confirmLabel={t("confirmDelete.leaveTeamConfirmLabel")}
        onConfirm={handleSettingsLeave}
        danger
      />

      <ConfirmDialog
        open={!!deleteTeamTarget}
        onClose={() => setDeleteTeamTarget(null)}
        title={t("settings.team.confirmDelete.title")}
        description={t("settings.team.confirmDelete.description")}
        confirmLabel={t("settings.team.confirmDelete.confirmLabel")}
        onConfirm={handleConfirmDelete}
        danger
      />

      <TeamCreateModal open={createTeamOpen} onClose={handleCreateTeamClose} />

      <style>{`
        .sidebar-scroll::-webkit-scrollbar{display:none}
        .sidebar-scroll{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </>
  );
}
