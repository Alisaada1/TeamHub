import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { useLocalUser } from "../context/LocalUserContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useOnWorkspaceChange } from "../hooks/useOnWorkspaceChange";
import { queryKeys, invalidateQueryCache } from "../api/queryKeys";
import ErrorState from "../components/ui/ErrorState";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import EmptyState from "../components/ui/EmptyState";
import PriorityBadge from "../components/tasks/PriorityBadge";
import StatusBadge from "../components/tasks/StatusBadge";
import ProjectCreateModal from "../components/projects/ProjectCreateModal";
import TeamCreateModal from "../components/teams/TeamCreateModal";
import PendingInviteBanner from "../components/auth/PendingInviteBanner";
import { getActivitySentence } from "../utils/localizedText";

// ===== SVG Icon Components =====

const PlusIcon = ({ size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CheckIcon = ({ size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FolderIcon = ({ size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

// ===== Dashboard Overview Components =====

const UsersIconBusy = ({ size = 32 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ClipboardIcon = ({ size = 22 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 dark:text-blue-400 flex-shrink-0">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const ClockIcon = ({ size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

function KpiCard({ label, value, icon, sublabel, tone }) {
  const valueColor = tone === "danger"
    ? "text-red-500 dark:text-red-400"
    : "text-text-primary-light dark:text-text-primary-dark";
  const borderAccent = tone === "danger"
    ? "border-red-200 dark:border-red-900/50"
    : "border-border-light dark:border-border-dark";
  return (
    <div className={"rounded-2xl bg-surface-light dark:bg-surface-dark border " + borderAccent + " p-3.5 md:p-4"}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <p className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">
          {label}
        </p>
      </div>
      <p className={"text-2xl font-bold tabular-nums " + valueColor}>
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark leading-relaxed">
          {sublabel}
        </p>
      )}
    </div>
  );
}

function formatTimeAgo(iso, t, locale) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("dashboard.justNow");
  if (diffMin < 60) return t("dashboard.minutesAgo", { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("dashboard.hoursAgo", { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t("dashboard.daysAgo", { count: diffDay });
  return date.toLocaleDateString(locale || "en", { month: "short", day: "numeric" });
}

// ===== Main Dashboard =====

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useLocalUser();
  const { workspaceId, teams, loadTeams, getUserRole } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ----- Overview queries -----
  const teamOverviewQuery = useQuery({
    queryKey: queryKeys.teamOverview(workspaceId),
    queryFn: () => api.getTeamOverview(workspaceId),
    retry: false,
  });
  const userOverviewQuery = useQuery({
    queryKey: queryKeys.userOverview(workspaceId),
    queryFn: () => api.getUserOverview(workspaceId),
    retry: false,
  });
  const dashboardProjectsQuery = useQuery({
    queryKey: queryKeys.dashboardProjects(workspaceId),
    queryFn: () => api.getDashboardProjects(workspaceId),
    retry: false,
  });
  const dashboardMyTasksQuery = useQuery({
    queryKey: queryKeys.dashboardMyTasks(workspaceId),
    queryFn: () => api.getDashboardMyTasks(workspaceId),
    retry: false,
  });
  const dashboardOverdueQuery = useQuery({
    queryKey: queryKeys.dashboardOverdue(workspaceId),
    queryFn: () => api.getDashboardOverdueTasks(workspaceId),
    retry: false,
  });
  const dashboardInProgressQuery = useQuery({
    queryKey: queryKeys.dashboardInProgress(workspaceId),
    queryFn: () => api.getDashboardInProgressTasks(workspaceId),
    retry: false,
  });
  const dashboardActivityQuery = useQuery({
    queryKey: queryKeys.dashboardActivity(workspaceId),
    queryFn: () => api.getDashboardRecentActivity(workspaceId),
    enabled: !!workspaceId,
    retry: false,
  });
  const dashboardPinnedQuery = useQuery({
    queryKey: queryKeys.dashboardPinned(workspaceId),
    queryFn: () => api.getDashboardPinnedComments(workspaceId),
    retry: false,
  });

  const overview = teamOverviewQuery.data?.data ?? null;
  const userOverview = userOverviewQuery.data?.data ?? null;
  const dashboardProjects = dashboardProjectsQuery.data?.data ?? [];
  const dashboardMyTasks = dashboardMyTasksQuery.data?.data ?? [];
  const dashboardOverdueTasks = dashboardOverdueQuery.data?.data ?? [];
  const dashboardInProgressTasks = dashboardInProgressQuery.data?.data ?? [];
  const recentActivity = dashboardActivityQuery.data?.data ?? [];
  const dashboardPinnedNotes = dashboardPinnedQuery.data?.data ?? [];

  const overviewLoading = [
    teamOverviewQuery,
    userOverviewQuery,
    dashboardProjectsQuery,
    dashboardMyTasksQuery,
    dashboardOverdueQuery,
    dashboardInProgressQuery,
    dashboardActivityQuery,
    dashboardPinnedQuery,
  ].some((q) => q.isLoading);
  const overviewError = [
    teamOverviewQuery,
    userOverviewQuery,
    dashboardProjectsQuery,
    dashboardMyTasksQuery,
    dashboardOverdueQuery,
    dashboardInProgressQuery,
    dashboardActivityQuery,
    dashboardPinnedQuery,
  ].find((q) => q.isError)?.error?.message ?? null;

  const refetchOverview = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["pinned-comments"] });
  };

  // ----- Modal state -----
  const [createOpen, setCreateOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  useOnWorkspaceChange(workspaceId, () => {
    setCreateOpen(false);
    setCreateTeamOpen(false);
  });

  const myTasksCount = userOverview?.myTasks ?? 0;

  const currentRole = workspaceId && user?.id ? getUserRole(workspaceId, user.id) : null;
  const canCreateProject = currentRole === "MANAGER" || currentRole === "SUPERVISOR";

  // ===== Render =====

  const renderOverview = () => {
    if (overviewLoading) return <LoadingSkeleton rows={6} />;

    const greetingName = user?.name?.trim() || "";
    const teamName = overview?.currentTeamName || "";
    const totalProjects = overview?.projects ?? 0;
    const completedTasks = userOverview?.completedTasks ?? 0;

    const hasAnyData = totalProjects > 0
      || dashboardProjects.length > 0
      || recentActivity.length > 0
      || dashboardMyTasks.length > 0
      || dashboardOverdueTasks.length > 0
      || dashboardInProgressTasks.length > 0;

    if (teams.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
                {t("dashboard.greeting", { name: greetingName })}
              </h1>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
                {t("dashboard.subtitle")}
              </p>
            </div>
          </div>
          <EmptyState
            icon={<UsersIconBusy size={32} />}
            title={t("dashboard.emptyTeamTitle", "Create your first team")}
            description={t("dashboard.emptyTeamDescription", "You need a team before you can create projects. Get started by creating one.")}
            action={{
              icon: <PlusIcon size={14} />,
              label: t("teams.createNew"),
              onClick: () => setCreateTeamOpen(true),
            }}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <PendingInviteBanner />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
              {t("dashboard.greeting", { name: greetingName })}
            </h1>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
              {t("dashboard.subtitle")}
            </p>
          </div>
          {canCreateProject && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition-colors flex-shrink-0"
            >
              <PlusIcon size={16} />
              <span>{t("dashboard.newProject")}</span>
            </button>
          )}
        </div>

        {overviewError && (
          <ErrorState title={t("dashboard.errorTitle")} message={overviewError} onRetry={refetchOverview} />
        )}

        {!hasAnyData && !overviewError && (
          <EmptyState
            icon={<FolderIcon size={32} />}
            title={t("dashboard.emptyTitle", "Welcome to TeamHub")}
            description={t("dashboard.emptyDescription", "Create your first project to get started.")}
            action={canCreateProject ? {
              icon: <PlusIcon size={14} />,
              label: t("dashboard.newProject"),
              onClick: () => setCreateOpen(true),
            } : undefined}
          />
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={t("dashboard.totalProjects")}
            value={totalProjects}
            icon={
              <div className="p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
                <FolderIcon size={22} />
              </div>
            }
            sublabel={t("dashboard.totalProjectsSub", { team: teamName })}
          />
          <KpiCard
            label={t("dashboard.completedProjects")}
            value={completedTasks}
            icon={
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <CheckIcon size={22} />
              </div>
            }
            sublabel={t("dashboard.completedProjectsSub")}
          />
          <KpiCard
            label={t("dashboard.myTasksCount")}
            value={myTasksCount}
            icon={
              <div className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                <ClipboardIcon />
              </div>
            }
            sublabel={t("dashboard.myTasksSub")}
          />
          <KpiCard
            label={t("dashboard.overdueCount")}
            value={userOverview?.overdueTasks ?? 0}
            icon={
              <div className="p-2 rounded-lg bg-red-100/50 dark:bg-red-900/20 text-red-500 dark:text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            }
            tone="danger"
            sublabel={t("dashboard.overdueSub")}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4">
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
                  {t("dashboard.projectOverview")}
                </h2>
                <Link
                  to="/projects"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                >
                  {t("dashboard.viewAll")} &rarr;
                </Link>
              </div>
              <div className="space-y-2.5">
                {(dashboardProjects || []).length === 0 ? (
                  <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-4">
                    {t("projects.noProjectsYet")}
                  </p>
                ) : (
                  (dashboardProjects || []).map((project) => {
                    const totalTasks = project._count?.tasks ?? 0;
                    const completedTasks = project._count?.completedTasks ?? 0;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => navigate(`/projects?projectId=${project.id}`)}
                        className="w-full text-start flex flex-col gap-2 p-2.5 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                              {project?.name || ""}
                            </span>
                            <StatusBadge status={project?.status} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-muted-light dark:text-text-muted-dark">{t("dashboard.progressLabel")}</span>
                            <span className="font-medium text-text-primary-light dark:text-text-primary-dark tabular-nums">
                              {progress}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary-500 transition-all"
                              style={{ width: progress + "%" }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
              <h2 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                {t("dashboard.recentActivity")}
              </h2>
              {(recentActivity || []).length === 0 ? (
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-4">
                  {t("activity.emptyTitle")}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(recentActivity || []).map((item, index) => {
                    return (
                      <div
                        key={item?.id ?? index}
                        className="flex items-center gap-3 text-sm"
                      >
                        <ClockIcon size={14} />
                        <span className="text-text-primary-light dark:text-text-primary-dark">
                          <span className="font-medium">{item?.user?.name}</span>{" "}
                          <span className="text-text-muted-light dark:text-text-muted-dark">
                            {getActivitySentence(item, t)}
                          </span>
                        </span>
                        <span className="mr-auto rtl:ml-auto rtl:mr-0 text-xs text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">
                          {formatTimeAgo(item?.createdAt, t, i18n.language)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
              <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                {t("dashboard.myTasksCompact")}
              </h3>
              {(dashboardMyTasks || []).length === 0 ? (
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center py-4">—</p>
              ) : (
                <div className="space-y-1.5">
                  {(dashboardMyTasks || []).map((task, index) => (
                    <button
                      key={task?.id ?? index}
                      type="button"
                      onClick={() => navigate("/tasks")}
                      className="w-full text-start flex items-center justify-between gap-2 rounded-lg bg-bg-light dark:bg-bg-dark px-2.5 py-1.5 border border-border-light dark:border-border-dark hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                          {task?.title || ""}
                        </span>
                      </div>
                      {task?.priority && <PriorityBadge priority={task.priority} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-red-200 dark:border-red-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {t("dashboard.overdueTitle")}
                </h3>
              </div>
              {(dashboardOverdueTasks || []).length === 0 ? (
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center py-4">
                  {t("dashboard.overdueEmpty")}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(dashboardOverdueTasks || []).map((task, index) => (
                    <button
                      key={task?.id ?? index}
                      type="button"
                      onClick={() => navigate("/tasks")}
                      className="w-full text-start flex items-center justify-between gap-2 rounded-lg bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5 border border-red-100 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300 truncate">
                          {task?.title || ""}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                        {formatTimeAgo(task?.dueDate, t, i18n.language)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-amber-200 dark:border-amber-800/50 p-4">
              <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500 flex-shrink-0">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                </svg>
                {t("dashboard.pinnedNotes", "Notes")}
              </h3>
              {(dashboardPinnedNotes || []).length === 0 ? (
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark text-center py-4">
                  {t("dashboard.noPinnedNotes", "No pinned notes found")}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(dashboardPinnedNotes || []).map((item, index) => (
                    <button
                      key={item?.id ?? index}
                      type="button"
                      onClick={() => { if (item.task?.id) navigate(`/comments/${item.task.id}`); }}
                      className="w-full text-start flex flex-col gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/10 px-2.5 py-2 border border-amber-100 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                          {item.author?.name}
                        </span>
                        <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString(i18n.language, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                      {item.task?.title && (
                        <span className="text-[10px] text-primary-500 dark:text-primary-400 truncate mt-0.5">
                          {item.task.title}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  function handleProjectCreated() {
    invalidateQueryCache(queryClient, "project", "dashboard");
  }

  async function handleTeamCreated() {
    setCreateTeamOpen(false);
    await loadTeams();
    invalidateQueryCache(queryClient, "team", "dashboard");
  }

  return (
    <>
      {renderOverview()}
      <ProjectCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        teamId={workspaceId || overview?.currentTeamId || teams[0]?.id}
        onCreated={handleProjectCreated}
        t={t}
      />
      <TeamCreateModal
        open={createTeamOpen}
        onClose={handleTeamCreated}
      />
    </>
  );
}
