import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useOnWorkspaceChange } from "../hooks/useOnWorkspaceChange";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { useLocalUser } from "../context/LocalUserContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { usePresence } from "../context/PresenceContext";
import { queryKeys, invalidateQueryCache } from "../api/queryKeys";
import Avatar from "../components/ui/Avatar";
import StatusBadge from "../components/tasks/StatusBadge";
import PriorityBadge from "../components/tasks/PriorityBadge";
import Tabs from "../components/ui/Tabs";
import Sheet from "../components/ui/Sheet";
import TaskCreateModal from "../components/tasks/TaskCreateModal";
import TaskEditSheet from "../components/tasks/TaskEditSheet";
import ProjectCreateModal from "../components/projects/ProjectCreateModal";
import KanbanBoard from "../components/tasks/KanbanBoard";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import ErrorState from "../components/ui/ErrorState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { toast } from "../utils/toast";
import { PlusIcon, ArrowLeftIcon, FolderIcon, CalendarIcon, MoreVerticalIcon, MessageIcon, TrashIcon, SpinnerIcon, EditIcon } from "../components/icons/Icons";

const AnalyticsPanel = lazy(() => import("../components/analytics/AnalyticsPanel"));

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];





function TaskCard({ task, onClick, onEdit, onComment, t, i18n }) {
  const { isOnline } = usePresence();
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";

  const PRIORITY_ACCENT = {
    URGENT: { bar: "bg-red-500" },
    HIGH: { bar: "bg-amber-500" },
    MEDIUM: { bar: "bg-blue-500" },
    LOW: { bar: "bg-slate-400" },
  };

  const accent = PRIORITY_ACCENT[task.priority] || PRIORITY_ACCENT.MEDIUM;

  return (
    <div className="relative">
      <span className={"absolute top-0 start-0 w-1.5 h-full rounded-s-xl pointer-events-none " + accent.bar} />
      <div
        onClick={() => onClick?.(task)}
        className="rounded-xl p-4 transition-all bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-[15px] font-semibold leading-snug line-clamp-2 flex-1 min-w-0 text-text-primary-light dark:text-text-primary-dark">{task.title}</h4>
          {task.assignee && <Avatar user={task.assignee} name={task.assignee?.name} size="sm" bold online={isOnline(task.assignee.id)} />}
        </div>

        {task.description && <p className="text-sm text-text-muted-light dark:text-text-muted-dark line-clamp-2 mb-2 leading-relaxed">{task.description}</p>}

        <div className="flex items-center gap-3 mb-2">
          <PriorityBadge priority={task.priority} compact />
        </div>
        {task.dueDate && (
          <div className="mb-2">
            <span className={"inline-flex items-center gap-1.5 whitespace-nowrap text-xs " + (isOverdue ? "text-red-500 dark:text-red-400 font-semibold" : "text-text-muted-light dark:text-text-muted-dark")}>
              <CalendarIcon size={12} />
              <span className="text-[10px] uppercase tracking-wider font-medium">{t("tasks.detail.dueDateLabel")}:</span>
              <span>{new Date(task.dueDate).toLocaleDateString(i18n.language, { month: "short", day: "numeric" })}</span>
            </span>
          </div>
        )}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
          <div className="overflow-hidden min-h-0">
            <div className="flex justify-center gap-2.5 pt-3">
              <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-primary-500 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                title={t("common.edit")}>
                <EditIcon size={14} />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onComment?.(task); }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-primary-500 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                title={t("tasks.detail.comments")}>
                <MessageIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ tasks, onTaskClick, t, i18n }) {
  const { isOnline } = usePresence();
  return (
    <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light dark:border-border-dark">
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.task")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.status")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.priority")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.assignee")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.due")}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} onClick={() => onTaskClick(task)} className="border-b border-border-light/50 dark:border-border-dark/50 last:border-0 hover:bg-bg-light dark:hover:bg-bg-dark cursor-pointer transition-colors">
                <td className="px-3 py-2">
                  <span className="font-medium text-text-primary-light dark:text-text-primary-dark truncate max-w-[240px]">{task.title}</span>
                </td>
                <td className="px-3 py-2"><StatusBadge status={task.status} /></td>
                <td className="px-3 py-2"><PriorityBadge priority={task.priority} /></td>
                <td className="px-3 py-2">{task.assignee ? (<div className="flex items-center gap-2"><Avatar user={task.assignee} name={task.assignee?.name} size="xs" online={isOnline(task.assignee.id)} /><span className="text-text-muted-light dark:text-text-muted-dark truncate max-w-[100px]">{task.assignee?.name}</span></div>) : (<span className="text-text-muted-light dark:text-text-muted-dark">—</span>)}</td>
                <td className="px-3 py-2 text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">{task.dueDate ? new Date(task.dueDate).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }) : "—"}</td>
              </tr>
            ))}
            {tasks.length === 0 && (<tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-text-muted-light dark:text-text-muted-dark">{t("projects.detail.noTasks")}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatTimeAgo(iso, t, lang) {
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
  return date.toLocaleDateString(lang || "en", { month: "short", day: "numeric" });
}

export default function Projects() {
  const { t, i18n } = useTranslation();
  const { user } = useLocalUser();
  const { workspaceId, getUserRole } = useWorkspace();
  const { isOnline } = usePresence();
  const [searchParams] = useSearchParams();
  const { projectId: routeProjectId } = useParams();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);

  const selectedProjectId = routeProjectId || searchParams.get("projectId");
  const teamIdFilter = searchParams.get("teamId");
  const [viewMode, setViewMode] = useState("board");

  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);
  const [editProjectTarget, setEditProjectTarget] = useState(null);

  const isDetailView = !!selectedProjectId;

  const currentUserRole = useMemo(() => {
    if (!workspaceId || !user) return null;
    return getUserRole(workspaceId, user.id);
  }, [workspaceId, user, getUserRole]);

  const canCreateProject = currentUserRole === "MANAGER" || currentUserRole === "SUPERVISOR";

  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(workspaceId || teamIdFilter),
    queryFn: () => api.listProjects(workspaceId || teamIdFilter || undefined),
    enabled: !!workspaceId || !!teamIdFilter,
    retry: false,
  });

  const projectQuery = useQuery({
    queryKey: queryKeys.project(selectedProjectId),
    queryFn: () => api.getProject(selectedProjectId),
    enabled: !!selectedProjectId,
    retry: false,
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(selectedProjectId),
    queryFn: () => api.listTasks(selectedProjectId),
    enabled: !!selectedProjectId,
    retry: false,
  });

  const detailProject = projectQuery.data?.data;
  const detailTasks = tasksQuery.data?.data || [];
  const projects = projectsQuery.data?.data || [];

  const detailUserRole = useMemo(() => {
    if (!detailProject?.teamId || !user) return null;
    return getUserRole(detailProject.teamId, user.id);
  }, [detailProject?.teamId, user, getUserRole]);

  const canEditTask = useCallback(
    (task) =>
      detailUserRole === "MANAGER" ||
      detailUserRole === "SUPERVISOR" ||
      (detailUserRole === "MEMBER" && !!user && task.assigneeId === user.id),
    [detailUserRole, user]
  );

  const detailMembersQuery = useQuery({
    queryKey: queryKeys.teamMembers(detailProject?.teamId),
    queryFn: () => api.listMembers(detailProject.teamId),
    enabled: !!detailProject?.teamId,
    retry: false,
  });
  const detailMembers = detailMembersQuery.data?.data || [];

  function handleProjectClick(projectId) {
    navigate(`/projects/${projectId}`);
  }

  function handleBackToList() {
    navigate("/projects");
  }

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) => api.updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks(selectedProjectId) });
      const prev = queryClient.getQueryData(queryKeys.tasks(selectedProjectId));
      queryClient.setQueryData(queryKeys.tasks(selectedProjectId), (old) =>
        old ? { ...old, data: (old.data || []).map((task) => (task.id === taskId ? { ...task, status } : task)) } : old
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success(t("toasts.statusChanged"));
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.tasks(selectedProjectId), ctx.prev);
      toast.error(t("common.error"), _err?.message);
    },
  });

  function handleStatusChange(taskId, newStatus) {
    const task = detailTasks.find((t) => t.id === taskId);
    if (task && !canEditTask(task)) {
      toast.warning(t("tasks.noPermissionStatusChange"));
      return;
    }
    statusMutation.mutate({ taskId, status: newStatus });
  }

  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [taskEditTarget, setTaskEditTarget] = useState(null);

  useOnWorkspaceChange(workspaceId, () => {
    setCreateOpen(false);
    setTaskCreateOpen(false);
    setProjectSettingsOpen(false);
    setDeleteProjectTarget(null);
    setEditProjectTarget(null);
    setTaskEditOpen(false);
    setTaskEditTarget(null);
    if (selectedProjectId) navigate("/projects");
  });

  function handleTaskClick(task) {
    setTaskEditTarget(task);
    setTaskEditOpen(true);
  }

  function handleTaskEditClick(task) {
    setTaskEditTarget(task);
    setTaskEditOpen(true);
  }

  function handleTaskCommentClick(task) {
    navigate(`/comments/${task.id}`);
  }

  function handleTaskCreated(task) {
    queryClient.setQueryData(queryKeys.tasks(selectedProjectId), (old) =>
      old ? { ...old, data: [...(old.data || []), task] } : old
    );
    invalidateQueryCache(queryClient, "task");
  }

  function handleTaskDeleted(taskId) {
    queryClient.setQueryData(queryKeys.tasks(selectedProjectId), (old) =>
      old ? { ...old, data: (old.data || []).filter((task) => task.id !== taskId) } : old
    );
    invalidateQueryCache(queryClient, "task");
  }

  function handleProjectSave(updated) {
    queryClient.setQueryData(queryKeys.project(selectedProjectId), (old) => {
      if (!old) return { data: updated };
      return { ...old, data: { ...old.data, ...updated } };
    });
    invalidateQueryCache(queryClient, "project");
  }

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId) => api.deleteProject(projectId),
    onSuccess: () => {
      setDeleteProjectTarget(null);
      setProjectSettingsOpen(false);
      invalidateQueryCache(queryClient, "project", "task");
      handleBackToList();
      toast.success(t("projectSettings.toasts.projectDeleted"));
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  function handleDeleteProject() {
    const deleted = deleteProjectTarget;
    if (!deleted) return;
    deleteProjectMutation.mutate(deleted.id);
  }

  function handleProjectCreated() {
    invalidateQueryCache(queryClient, "project");
  }

  function renderProjectListing() {
    if (projectsQuery.isLoading) return <LoadingSkeleton rows={4} />;
    if (projectsQuery.isError) return <ErrorState title={t("common.error")} message={projectsQuery.error?.message || t("common.error")} onRetry={() => projectsQuery.refetch()} t={t} />;

    return (
      <>
        {projects.length === 0 ? (
          <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-8 flex flex-col items-center text-center gap-3">
            <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-500 dark:text-primary-300">
              <FolderIcon size={32} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">{t("projects.noProjectsYet")}</h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">{t("projects.noProjectsDesc")}</p>
            </div>
            {canCreateProject && (
              <button type="button" onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-primary-500/30 transition-all">
                <PlusIcon /> <span>{t("projects.createProject")}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const totalTasks = project._count?.tasks ?? 0;
              const completedTasks = project._count?.completedTasks ?? 0;
              const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

              function formatDate(dateStr) {
                if (!dateStr) return null;
                try { return new Date(dateStr).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return null; }
              }

              const startLabel = formatDate(project.startDate);
              const dueLabel = formatDate(project.dueDate);
              const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== "COMPLETED";

              return (
                <button key={project.id} type="button" onClick={() => handleProjectClick(project.id)}
                  className="text-start p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary-400 dark:hover:border-primary-600 transition-all hover:shadow-lg hover:-translate-y-0.5 group relative">
                  {canCreateProject && (
                    <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setEditProjectTarget(project); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setEditProjectTarget(project); } }}
                      className="absolute top-3 ltr:right-3 rtl:left-3 p-1.5 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer">
                      <MoreVerticalIcon size={14} />
                    </span>
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold" style={{ backgroundColor: project.color || "#6366F1" }}>
                      {project.name?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{project.name}</h3>
                        <PriorityBadge priority={project.priority} compact />
                      </div>
                      {project.description && <p className="text-sm text-text-muted-light dark:text-text-muted-dark line-clamp-1">{project.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <StatusBadge status={project.status} />
                    {startLabel && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-text-muted-light dark:text-text-muted-dark">
                        <CalendarIcon size={12} /> {startLabel}
                      </span>
                    )}
                    {dueLabel && (
                      <span className={"inline-flex items-center gap-1 text-[11px] " + (isOverdue ? "text-red-500 dark:text-red-400" : "text-text-muted-light dark:text-text-muted-dark")}>
                        <CalendarIcon size={12} /> {dueLabel}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted-light dark:text-text-muted-dark font-medium">{t("projects.progressLabel", "Progress")}</span>
                      <span className="tabular-nums font-semibold text-text-primary-light dark:text-text-primary-dark">{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: progress + "%" }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-text-muted-light dark:text-text-muted-dark tabular-nums">{completedTasks}/{totalTasks} {t("projects.tasksLabel", "tasks")}</span>
                      {project.members && project.members.length > 0 && (
                        <div className="flex -space-x-1.5 rtl:space-x-reverse">
                          {project.members.slice(0, 4).map((m, i) => (
                            <div key={m.id || i} className="border-2 border-surface-light dark:border-surface-dark rounded-full">
                              <Avatar user={m} size="xs" bold online={m?.id ? isOnline(m.id) : undefined} />
                            </div>
                          ))}
                          {project.members.length > 4 && (
                            <div className="w-5 h-5 rounded-full border-2 border-surface-light dark:border-surface-dark bg-bg-light dark:bg-bg-dark text-[8px] font-medium text-text-muted-light dark:text-text-muted-dark flex items-center justify-center">
                              +{project.members.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  function renderDetailView() {
    if (projectQuery.isLoading || tasksQuery.isLoading) return <LoadingSkeleton rows={4} />;
    if (!detailProject) return <ErrorState title={t("projects.detail.notFoundTitle")} message={t("projects.detail.notFoundDescription")} onRetry={handleBackToList} t={t} retryLabel={t("projects.detail.backToProjects")} />;

    const taskCount = detailTasks.length;
    const completedCount = detailTasks.filter((t) => t.status === "COMPLETED").length;

    const viewTabs = [
      { id: "board", label: t("views.kanban") },
      { id: "analytics", label: t("analytics.title", "Analytics") },
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleBackToList} className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors shrink-0">
              <span className="rtl:rotate-180 inline-flex"><ArrowLeftIcon /></span>
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (detailProject.color || "#7A4A1A") + "20" }}>
                <FolderIcon size={16} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark truncate">{detailProject.name}</h2>
                <div className="flex items-center gap-3 text-xs text-text-muted-light dark:text-text-muted-dark">
                  <span>{t("projects.detail.taskCountCompleted", { count: taskCount, completed: completedCount })}</span>
                  <StatusBadge status={detailProject.status} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setTaskCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition-colors">
              <PlusIcon size={14} /> <span>{t("projects.detail.newTask")}</span>
            </button>
          </div>
        </div>

        <div className="border-b border-border-light dark:border-border-dark pb-2">
          <Tabs tabs={viewTabs} activeTab={viewMode} onChange={setViewMode} />
        </div>

        {viewMode === "board" && (
          <KanbanBoard tasks={detailTasks} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} canDragTask={canEditTask}
            renderCard={(task) => <TaskCard key={task.id} task={task} onClick={handleTaskClick} onEdit={handleTaskEditClick} onComment={handleTaskCommentClick} t={t} i18n={i18n} />} />
        )}
        {viewMode === "analytics" && (
          <Suspense fallback={<LoadingSkeleton rows={4} />}>
            <AnalyticsPanel tasks={detailTasks} members={detailMembers} projects={projects} project={detailProject} currentUserId={user?.id} scope="project" timeline="matrix" onTaskClick={handleTaskClick} />
          </Suspense>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isDetailView && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">{t("projects.title")}</h1>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">{t("projects.subtitle")}</p>
          </div>
          {projects.length > 0 && canCreateProject && (
            <button type="button" onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition-colors flex-shrink-0">
              <PlusIcon /> <span>{t("projects.newProject")}</span>
            </button>
          )}
        </div>
      )}

      {isDetailView ? renderDetailView() : renderProjectListing()}

      <ProjectCreateModal open={createOpen} onClose={() => setCreateOpen(false)} teamId={teamIdFilter || workspaceId} onCreated={handleProjectCreated} t={t} />

      <Sheet open={!!editProjectTarget} onClose={() => setEditProjectTarget(null)} title={t("projectSettings.title")}>
        {editProjectTarget && (
          <ProjectSettingsInline project={editProjectTarget} userRole={currentUserRole} onSave={(updated) => { setEditProjectTarget(null); handleProjectSave(updated); }} onDelete={(p) => { setEditProjectTarget(null); setDeleteProjectTarget(p); }} onClose={() => setEditProjectTarget(null)} t={t} />
        )}
      </Sheet>

      <TaskEditSheet open={taskEditOpen} onClose={() => { setTaskEditOpen(false); setTaskEditTarget(null); }} task={taskEditTarget} userRole={detailUserRole} editable={taskEditTarget ? canEditTask(taskEditTarget) : true} members={detailMembers} onSaved={(updated) => { queryClient.setQueryData(queryKeys.tasks(selectedProjectId), (old) => old ? { ...old, data: (old.data || []).map((t) => (t.id === updated.id ? { ...t, ...updated } : t)) } : old); invalidateQueryCache(queryClient, "task"); }} onDelete={handleTaskDeleted} projectStartDate={detailProject?.startDate} projectDueDate={detailProject?.dueDate} />

      {isDetailView && (
        <TaskCreateModal open={taskCreateOpen} onClose={() => setTaskCreateOpen(false)} projectId={selectedProjectId} teamId={detailProject?.teamId} members={detailMembers} userRole={detailUserRole} onCreated={handleTaskCreated} t={t} projectStartDate={detailProject?.startDate} projectDueDate={detailProject?.dueDate} />
      )}

      <ConfirmDialog open={!!deleteProjectTarget} onClose={() => setDeleteProjectTarget(null)}
        title={t("projectSettings.deleteProject")} description={t("projectSettings.deleteConfirmDescription")}
        confirmLabel={t("projectSettings.deleteProject")} onConfirm={handleDeleteProject} danger />
    </div>
  );
}

function toDateInputValue(dateStr) {
  if (!dateStr) return "";
  try { return new Date(dateStr).toISOString().slice(0, 10); } catch { return ""; }
}

function ProjectSettingsInline({ project, userRole, onSave, onDelete, onClose, t }) {
  const STATUS_OPTIONS = ["ACTIVE", "PENDING", "ON_HOLD", "COMPLETED"];
  const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [status, setStatus] = useState(project?.status || "ACTIVE");
  const [priority, setPriority] = useState(project?.priority || "MEDIUM");
  const [startDate, setStartDate] = useState(() => toDateInputValue(project?.startDate));
  const [endDate, setEndDate] = useState(() => toDateInputValue(project?.dueDate));

  const saveMutation = useMutation({
    mutationFn: (payload) => api.updateProject(project.id, payload),
    onSuccess: (_data, payload) => {
      toast.success(t("projectSettings.toasts.projectUpdated"));
      onSave({ ...project, ...payload });
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setStatus(project.status || "ACTIVE");
      setPriority(project.priority || "MEDIUM");
      setStartDate(toDateInputValue(project.startDate));
      setEndDate(toDateInputValue(project.dueDate));
    }
  }, [project]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      priority: priority || undefined,
      startDate: startDate || undefined,
      dueDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("projectSettings.name")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saveMutation.isPending} placeholder={t("projects.searchPlaceholder")}
            className="w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("projectSettings.description")}</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={saveMutation.isPending}
            className="w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">{t("projectSettings.statusLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={"px-3 py-1.5 text-xs font-semibold rounded-full transition-all " + (status === s ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}>
                {t("projects.detail.status." + s, s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " "))}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">{t("projectSettings.priorityLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)}
                className={"px-3 py-1.5 text-xs font-semibold rounded-full transition-all " + (priority === p ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}>
                {t("projects.detail.priority." + p, p.charAt(0) + p.slice(1).toLowerCase())}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div lang="en" dir="ltr">
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("projectSettings.startDateLabel")}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={saveMutation.isPending}
              className="w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors" />
          </div>
          <div lang="en" dir="ltr">
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("projectSettings.endDateLabel")}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={saveMutation.isPending}
              className="w-full px-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 pt-2">
          {userRole === "MANAGER" && (
            <button type="button" onClick={() => onDelete(project)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <TrashIcon size={14} /> {t("projectSettings.deleteProject")}
            </button>
          )}
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={saveMutation.isPending} className="px-4 py-2.5 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50">
              {t("projectSettings.cancel")}
            </button>
            <button type="submit" disabled={saveMutation.isPending || !name.trim()}
              className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
              {saveMutation.isPending ? <><SpinnerIcon /> <span>{t("projectSettings.saving")}</span></> : <span>{t("common.save")}</span>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


