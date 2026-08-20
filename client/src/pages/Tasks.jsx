import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { useOnWorkspaceChange } from "../hooks/useOnWorkspaceChange";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { useLocalUser } from "../context/LocalUserContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { queryKeys, invalidateQueryCache } from "../api/queryKeys";
import StatusBadge from "../components/tasks/StatusBadge";
import PriorityBadge from "../components/tasks/PriorityBadge";
import Tabs from "../components/ui/Tabs";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import { toast } from "../utils/toast";
import { PlusIcon, XIcon, MessageIcon, SearchIcon, FolderIcon } from "../components/icons/Icons";
import TaskCreateModal from "../components/tasks/TaskCreateModal";
import TaskEditSheet from "../components/tasks/TaskEditSheet";
import CalendarView from "../components/calendar/CalendarView";

const AnalyticsPanel = lazy(() => import("../components/analytics/AnalyticsPanel"));

// ===== Constants =====

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// ===== Sub-Components =====

function ListView({ tasks, projects, members, onTaskClick, onUpdateAssignee, currentUserRole }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isMember = currentUserRole === "MEMBER";

  const projectMap = useMemo(() => {
    const map = {};
    for (const p of projects || []) {
      map[p.id] = p.name;
    }
    return map;
  }, [projects]);

  function getProjectName(task) {
    if (task.project?.name) return task.project.name;
    if (task.projectId && projectMap[task.projectId]) return projectMap[task.projectId];
    return null;
  }

  return (
    <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light dark:border-border-dark">
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.task")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.project", "Project")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.status")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.priority")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.assignee")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("table.due")}</th>
              <th className="text-start px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">{t("tasks.detail.comments")}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const projectName = getProjectName(task);
              return (
                <tr key={task.id} onClick={() => onTaskClick(task)}
                  className="border-b border-border-light/50 dark:border-border-dark/50 last:border-0 hover:bg-bg-light dark:hover:bg-bg-dark cursor-pointer transition-colors">
                  <td className="px-3 py-2">
                    <span className="font-medium text-text-primary-light dark:text-text-primary-dark truncate max-w-[200px]">{task.title}</span>
                  </td>
                  <td className="px-3 py-2">
                    {projectName ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 truncate max-w-[140px]">
                        {projectName}
                      </span>
                    ) : (
                      <span className="text-text-muted-light dark:text-text-muted-dark">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={task.status} /></td>
                  <td className="px-3 py-2"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    {isMember ? (
                      <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                        {task.assignee?.name || t("tasks.detail.unassigned")}
                      </span>
                    ) : (
                      <select
                        value={task.assigneeId || ""}
                        onChange={(e) => onUpdateAssignee(task, e.target.value)}
                        className="max-w-[150px] px-2 py-1 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-xs text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors cursor-pointer"
                      >
                        <option value="">{t("tasks.detail.unassigned")}</option>
                        {(members || []).map((m) => (
                          <option key={m.userId} value={m.userId}>{m.user?.name || m.userId}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString(i18n.language, { month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/comments/${task.id}`); }}
                      title={t("tasks.detail.comments")} aria-label={t("tasks.detail.comments")}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                      <MessageIcon size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted-light dark:text-text-muted-dark">{t("projects.detail.noTasks")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Main Tasks Component =====

export default function Tasks() {
  const { t, i18n } = useTranslation();
  const { user } = useLocalUser();
  const { workspaceId, getUserRole } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentUserRole = useMemo(() => {
    if (!workspaceId || !user) return null;
    return getUserRole(workspaceId, user.id);
  }, [workspaceId, user, getUserRole]);

  const canEditTask = useCallback(
    (task) =>
      currentUserRole === "MANAGER" ||
      currentUserRole === "SUPERVISOR" ||
      (currentUserRole === "MEMBER" && !!user && task.assigneeId === user.id),
    [currentUserRole, user]
  );

  const [viewMode, setViewMode] = useState("list");

  // Filters
  const [filters, setFilters] = useState({ status: [], priority: [] });
  const [searchQuery, setSearchQuery] = useState("");

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [prefillDueDate, setPrefillDueDate] = useState(null);

  // Task detail
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filter dropdown
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterProject, setFilterProject] = useState("all");
  const filterMenuRef = useRef(null);

  useOnWorkspaceChange(workspaceId, () => {
    setCreateModalOpen(false);
    setPrefillDueDate(null);
    setTaskDetailOpen(false);
    setSelectedTask(null);
    setFilterOpen(false);
    setFilters({ status: [], priority: [] });
    setSearchQuery("");
    setFilterProject("all");
  });

  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  function toggleFilter(key, value) {
    setFilters((prev) => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }

  const tasksQuery = useQuery({
    queryKey: queryKeys.teamTasks(workspaceId),
    queryFn: () => api.listTeamTasks(workspaceId),
    enabled: !!workspaceId && !!user?.id,
    retry: false,
  });
  const tasks = tasksQuery.data?.data || [];

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(workspaceId),
    queryFn: () => api.listProjects(workspaceId || undefined),
    enabled: !!workspaceId,
    retry: false,
  });
  const projects = projectsQuery.data?.data || [];

  const membersQuery = useQuery({
    queryKey: queryKeys.teamMembers(workspaceId),
    queryFn: () => api.listMembers(workspaceId),
    enabled: !!workspaceId,
    retry: false,
  });
  const members = membersQuery.data?.data || [];

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;
      if (filterProject !== "all") {
        const taskProjectId = task.projectId || task.project?.id;
        if (taskProjectId !== filterProject) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(q) && !(task.description || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filters, searchQuery, filterProject]);

  const activeFilterCount = filters.status.length + filters.priority.length;

  const assigneeMutation = useMutation({
    mutationFn: ({ taskId, assigneeId }) => api.updateTask(taskId, { assigneeId }),
    onMutate: async ({ taskId, assigneeId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.teamTasks(workspaceId) });
      const prev = queryClient.getQueryData(queryKeys.teamTasks(workspaceId));
      const member = members.find((m) => m.userId === assigneeId);
      queryClient.setQueryData(queryKeys.teamTasks(workspaceId), (old) =>
        old ? { ...old, data: (old.data || []).map((task) => (task.id === taskId ? { ...task, assigneeId, assignee: member?.user || null } : task)) } : old
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((p) => (p ? { ...p, assigneeId, assignee: member?.user || null } : p));
      }
      return { prev };
    },
    onSuccess: (res) => {
      const updated = res.data || res;
      queryClient.setQueryData(queryKeys.teamTasks(workspaceId), (old) =>
        old ? { ...old, data: (old.data || []).map((task) => (task.id === updated.id ? { ...task, ...updated } : task)) } : old
      );
      if (selectedTask?.id === updated.id) setSelectedTask(updated);
      toast.success(t("common.saved"));
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.teamTasks(workspaceId), ctx.prev);
      toast.error(t("common.error"), _err?.message);
    },
  });

  function handleUpdateAssignee(task, assigneeId) {
    assigneeMutation.mutate({ taskId: task.id, assigneeId: assigneeId || null });
  }

  function handleTaskClick(task) {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  }

  function handleTaskSaved(updated) {
    setSelectedTask(updated);
    queryClient.setQueryData(queryKeys.teamTasks(workspaceId), (old) =>
      old ? { ...old, data: (old.data || []).map((t) => (t.id === updated.id ? { ...t, ...updated } : t)) } : old
    );
    invalidateQueryCache(queryClient, "task");
  }

  const viewTabs = [
    { id: "list", label: t("views.list") },
    { id: "analytics", label: t("analytics.title", "Analytics") },
    { id: "calendar", label: t("views.calendar") },
  ];

  if (tasksQuery.isLoading) return <LoadingSkeleton rows={4} />;
  if (tasksQuery.isError) return <ErrorState title={t("common.error")} message={tasksQuery.error?.message || t("common.error")} onRetry={() => tasksQuery.refetch()} t={t} />;

  function handleTaskCreated(newTask) {
    queryClient.setQueryData(queryKeys.teamTasks(workspaceId), (old) =>
      old ? { ...old, data: [...(old.data || []), newTask] } : old
    );
    invalidateQueryCache(queryClient, "task");
  }

  function handleTaskDeleted(taskId) {
    queryClient.setQueryData(queryKeys.teamTasks(workspaceId), (old) =>
      old ? { ...old, data: (old.data || []).filter((t) => t.id !== taskId) } : old
    );
    invalidateQueryCache(queryClient, "task");
  }

  if (tasks.length === 0) {
    const hasProjects = projects.length > 0;
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">{t("myTasks.title")}</h1>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
            {t("myTasks.subtitle", { count: 0 })}
          </p>
        </div>
        {hasProjects ? (
          <EmptyState
            icon={<FolderIcon size={32} />}
            title={t("myTasks.empty.title", "No tasks yet")}
            description={t("myTasks.empty.description", "No tasks in this team yet. Create the first task to get started.")}
            action={{
              icon: <PlusIcon size={14} />,
              label: t("myTasks.newTask"),
              onClick: () => setCreateModalOpen(true),
            }}
          />
        ) : (
          <EmptyState
            icon={<FolderIcon size={32} />}
            title={t("myTasks.empty.title", "No tasks yet")}
            description={t("myTasks.empty.description", "No tasks in this team yet. Create the first task to get started.")}
            action={{
              icon: <SearchIcon size={14} />,
              label: t("myTasks.browseProjects", "Browse Projects"),
              onClick: () => navigate("/projects"),
            }}
          />
        )}
        <TaskCreateModal open={createModalOpen} onClose={() => { setCreateModalOpen(false); setPrefillDueDate(null); }} teamId={workspaceId} projects={projects} members={members} userRole={currentUserRole} onCreated={handleTaskCreated} t={t} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">{t("myTasks.title")}</h1>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
            {t("myTasks.subtitle", { count: filteredTasks.length })}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button type="button" onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 text-sm font-semibold transition-colors shadow-lg shadow-primary-500/30">
            <PlusIcon size={14} />
            <span>{t("myTasks.newTask")}</span>
          </button>
        </div>
      </div>

      {/* Filter Sub-bar */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
        <div className="relative flex-1 min-w-[160px]">
          <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark" size={14} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("myTasks.searchPlaceholder")}
            className="w-full ps-9 pe-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors" />
        </div>
        <div className="relative shrink-0" ref={filterMenuRef}>
          <button type="button" onClick={() => setFilterOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-light dark:border-border-dark text-xs font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            <span>{t("tasks.filters.filterLabel", "Filter")}</span>
            {(filterProject !== "all" || activeFilterCount > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            )}
          </button>
          {filterOpen && (
            <div className="absolute end-0 top-full mt-1 w-48 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg py-1 z-20">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark font-semibold">{t("tasks.filters.filterByProject", "Filter by Project")}</p>
              <button type="button" onClick={() => { setFilterProject("all"); setFilterOpen(false); }}
                className={"w-full text-start px-3 py-1.5 text-xs font-medium transition-colors " + (filterProject === "all" ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20" : "text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark")}>
                {t("tasks.filters.allProjects", "All Projects")}
              </button>
              {projects.map((p) => (
                <button key={p.id} type="button" onClick={() => { setFilterProject(p.id); setFilterOpen(false); }}
                  className={"w-full text-start px-3 py-1.5 text-xs font-medium transition-colors " + (filterProject === p.id ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20" : "text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark")}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-5 w-px bg-border-light dark:bg-border-dark hidden sm:block" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted-light dark:text-text-muted-dark">{t("tasks.filters.statusLabel")}</span>
          {STATUSES.map((s) => (
            <button key={s} type="button" onClick={() => toggleFilter("status", s)}
              className={"px-2 py-1 rounded text-xs font-medium transition-colors " + (filters.status.includes(s) ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-primary-300 dark:hover:border-primary-700")}>
              {t("projects.detail.status." + s)}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-border-light dark:border-border-dark hidden sm:block" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted-light dark:text-text-muted-dark">{t("tasks.filters.priorityLabel")}</span>
          {PRIORITY_OPTIONS.map((p) => (
            <button key={p} type="button" onClick={() => toggleFilter("priority", p)}
              className={"px-2 py-1 rounded text-xs font-medium transition-colors " + (filters.priority.includes(p) ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:border-primary-300 dark:hover:border-primary-700")}>
              {t("projects.detail.priority." + p)}
            </button>
          ))}
        </div>
        {activeFilterCount > 0 && (
          <button type="button" onClick={() => { setFilters({ status: [], priority: [] }); setSearchQuery(""); }}
            className="text-xs text-red-600 dark:text-red-400 hover:underline whitespace-nowrap">
            {t("tasks.filters.clearAll")}
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 -mt-1">
          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t("tasks.filters.active")}</span>
          {filters.status.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium">
              {t("projects.detail.status." + s)}
              <button type="button" onClick={() => toggleFilter("status", s)} className="hover:text-primary-900 dark:hover:text-primary-100"><XIcon size={10} /></button>
            </span>
          ))}
          {filters.priority.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium">
              {t("projects.detail.priority." + p)}
              <button type="button" onClick={() => toggleFilter("priority", p)} className="hover:text-primary-900 dark:hover:text-primary-100"><XIcon size={10} /></button>
            </span>
          ))}
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="border-b border-border-light dark:border-border-dark pb-1.5 mt-4">
        <Tabs tabs={viewTabs} activeTab={viewMode} onChange={setViewMode} />
      </div>

      {/* View Content */}
      {viewMode === "list" && <ListView tasks={filteredTasks} projects={projects} members={members} onTaskClick={handleTaskClick} onUpdateAssignee={handleUpdateAssignee} currentUserRole={currentUserRole} />}
      {viewMode === "analytics" && (
        <Suspense fallback={<LoadingSkeleton rows={4} />}>
          <AnalyticsPanel tasks={tasks} members={members} projects={projects} currentUserId={user?.id} scope="team" timeline="bars" onTaskClick={handleTaskClick} />
        </Suspense>
      )}
      {viewMode === "calendar" && (
        <CalendarView
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onCreateTask={(date) => { setPrefillDueDate(date); setCreateModalOpen(true); }}
        />
      )}

      {/* Overlays */}
      <TaskEditSheet open={taskDetailOpen} onClose={() => { setTaskDetailOpen(false); setSelectedTask(null); }} task={selectedTask} userRole={currentUserRole} editable={selectedTask ? canEditTask(selectedTask) : true} members={members} onSaved={handleTaskSaved} onDelete={handleTaskDeleted} />
      <TaskCreateModal open={createModalOpen} onClose={() => { setCreateModalOpen(false); setPrefillDueDate(null); }} teamId={workspaceId} projects={projects} members={members} userRole={currentUserRole} onCreated={handleTaskCreated} t={t} prefillDueDate={prefillDueDate} />
    </div>
  );
}
