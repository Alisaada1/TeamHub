import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOnWorkspaceChange } from "../hooks/useOnWorkspaceChange";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { useLocalUser } from "../context/LocalUserContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { usePresence } from "../context/PresenceContext";
import { queryKeys } from "../api/queryKeys";
import { toast } from "../utils/toast";
import Avatar from "../components/ui/Avatar";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import EmptyState from "../components/ui/EmptyState";
import { MessageIcon, SpinnerIcon, ArrowLeftIcon, EditIcon, TrashIcon } from "../components/icons/Icons";

function formatTime(iso, locale) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleDateString(locale || "en", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function Comments() {
  const { t, i18n } = useTranslation();
  const { user } = useLocalUser();
  const { workspaceId, getUserRole } = useWorkspace();
  const { isOnline } = usePresence();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { taskId: routeTaskId } = useParams();

  const [newComment, setNewComment] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const chatEndRef = useRef(null);

  useOnWorkspaceChange(workspaceId, () => {
    setSelectedProjectId("");
    setNewComment("");
    if (routeTaskId) navigate("/comments");
  });

  const currentUserId = user?.id;
  const activeTaskId = routeTaskId;

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(workspaceId),
    queryFn: () => api.listProjects(workspaceId || undefined),
    enabled: !!workspaceId,
    retry: false,
  });
  const projects = projectsQuery.data?.data || [];

  const projectTasksQuery = useQuery({
    queryKey: queryKeys.tasks(selectedProjectId),
    queryFn: () => api.listTasks(selectedProjectId),
    enabled: !!selectedProjectId,
    retry: false,
  });
  const projectTasks = projectTasksQuery.data?.data || [];

  const taskQuery = useQuery({
    queryKey: queryKeys.task(activeTaskId),
    queryFn: () => api.getTask(activeTaskId),
    enabled: !!activeTaskId,
    retry: false,
  });
  const task = taskQuery.data?.data;
  const commentsDisabled = !!task?.commentsDisabled;

  const commentRole = useMemo(() => {
    const teamId = task?.project?.teamId || workspaceId;
    if (!teamId || !user) return null;
    return getUserRole(teamId, user.id);
  }, [task?.project?.teamId, workspaceId, user, getUserRole]);
  const isManagerOrSupervisor = commentRole === "MANAGER" || commentRole === "SUPERVISOR";

  const commentsQuery = useQuery({
    queryKey: queryKeys.comments(activeTaskId),
    queryFn: () => api.listTaskComments(activeTaskId),
    enabled: !!activeTaskId,
    retry: false,
  });
  const comments = commentsQuery.data?.data || [];

  const pinnedQuery = useQuery({
    queryKey: queryKeys.pinnedComments(activeTaskId),
    queryFn: () => api.getPinnedComments(activeTaskId),
    enabled: !!activeTaskId,
    retry: false,
  });
  const pinnedComments = pinnedQuery.data?.data || [];

  useEffect(() => {
    if (!routeTaskId && !selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [routeTaskId, selectedProjectId, projects]);

  useEffect(() => {
    if (selectedProjectId && !routeTaskId && projectTasks.length > 0) {
      navigate(`/comments/${projectTasks[0].id}`, { replace: true });
    }
  }, [selectedProjectId, routeTaskId, projectTasks, navigate]);

  useEffect(() => {
    if (task?.projectId && !selectedProjectId) {
      setSelectedProjectId(task.projectId);
    }
  }, [task?.projectId, selectedProjectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const commentMutation = useMutation({
    mutationFn: (body) => api.addTaskComment(activeTaskId, { body }),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.comments(activeTaskId), (old) =>
        old ? { ...old, data: [...(old.data || []), res.data] } : old
      );
      setNewComment("");
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  const pinMutation = useMutation({
    mutationFn: (commentId) => api.togglePinComment(commentId),
    onSuccess: (res, commentId) => {
      const updated = res.data;
      queryClient.setQueryData(queryKeys.comments(activeTaskId), (old) =>
        old ? { ...old, data: (old.data || []).map((c) => (c.id === commentId ? { ...c, pinned: updated.pinned } : c)) } : old
      );
      if (updated.pinned) {
        queryClient.setQueryData(queryKeys.pinnedComments(activeTaskId), (old) =>
          old ? { ...old, data: [updated, ...(old.data || [])] } : old
        );
      } else {
        queryClient.setQueryData(queryKeys.pinnedComments(activeTaskId), (old) =>
          old ? { ...old, data: (old.data || []).filter((c) => c.id !== commentId) } : old
        );
      }
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  const toggleCommentsMutation = useMutation({
    mutationFn: () => api.toggleTaskComments(activeTaskId),
    onSuccess: (res) => {
      const disabled = res.data?.commentsDisabled || false;
      queryClient.setQueryData(queryKeys.task(activeTaskId), (old) =>
        old ? { ...old, data: { ...old.data, commentsDisabled: disabled } } : old
      );
      toast.success(disabled ? t("comments.commentsDisabled") : t("comments.commentsEnabled"));
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ commentId, body }) => api.updateComment(commentId, { body }),
    onSuccess: (res) => {
      const updated = res.data;
      queryClient.setQueryData(queryKeys.comments(activeTaskId), (old) =>
        old ? { ...old, data: (old.data || []).map((c) => (c.id === updated.id ? updated : c)) } : old
      );
      queryClient.setQueryData(queryKeys.pinnedComments(activeTaskId), (old) =>
        old ? { ...old, data: (old.data || []).map((c) => (c.id === updated.id ? updated : c)) } : old
      );
      setEditingCommentId(null);
      setEditBody("");
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId) => api.deleteComment(commentId),
    onSuccess: (_res, commentId) => {
      queryClient.setQueryData(queryKeys.comments(activeTaskId), (old) =>
        old ? { ...old, data: (old.data || []).filter((c) => c.id !== commentId) } : old
      );
      queryClient.setQueryData(queryKeys.pinnedComments(activeTaskId), (old) =>
        old ? { ...old, data: (old.data || []).filter((c) => c.id !== commentId) } : old
      );
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.message);
    },
  });

  function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim() || !activeTaskId) return;
    commentMutation.mutate(newComment.trim());
  }

  function handleTogglePin(commentId) {
    pinMutation.mutate(commentId);
  }

  function handleToggleCommentsDisabled() {
    if (!activeTaskId) return;
    toggleCommentsMutation.mutate();
  }

  function handleStartEdit(comment) {
    setEditingCommentId(comment.id);
    setEditBody(comment.body);
  }

  function handleCancelEdit() {
    setEditingCommentId(null);
    setEditBody("");
  }

  function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingCommentId || !editBody.trim()) return;
    editMutation.mutate({ commentId: editingCommentId, body: editBody.trim() });
  }

  function handleDeleteComment(commentId) {
    deleteMutation.mutate(commentId);
  }

  function handleProjectChange(e) {
    const projectId = e.target.value;
    setSelectedProjectId(projectId);
    navigate("/comments", { replace: true });
  }

  function handleTaskChange(e) {
    const tid = e.target.value;
    if (tid) {
      navigate(`/comments/${tid}`, { replace: true });
    } else {
      navigate("/comments", { replace: true });
    }
  }

  const loading = activeTaskId && (taskQuery.isLoading || commentsQuery.isLoading || pinnedQuery.isLoading);
  const noTaskSelected = !activeTaskId;
  const noComments = comments.length === 0;
  const submitting = commentMutation.isPending;

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors">
            <span className="rtl:rotate-180 inline-flex"><ArrowLeftIcon size={18} /></span>
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
              {task ? task.title : t("comments.title")}
            </h1>
            {task?.project?.name && (
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5">
                {task.project.name}
              </p>
            )}
          </div>
        </div>

        {loading && <LoadingSkeleton rows={6} />}

        {!loading && (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pe-2 mb-3">
              {noTaskSelected ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState
                    icon={<MessageIcon size={32} />}
                    title={t("comments.noTaskSelected", "No task selected")}
                    description={t("comments.noTaskSelectedDesc", "Select a project and task from the sidebar to view comments.")}
                  />
                </div>
              ) : noComments ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState
                    icon={<MessageIcon size={28} />}
                    title={t("comments.noCommentsYet", "No comments yet")}
                    description={t("comments.noCommentsDesc", "Be the first to share your thoughts on this task.")}
                  />
                </div>
              ) : (
                comments.map((c) => {
                  const isMine = c.author?.id === currentUserId;
                  const isEditing = editingCommentId === c.id;
                  const canDelete = isMine || isManagerOrSupervisor;
                  return (
                    <div key={c.id} className={`flex ${isMine ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {!isMine && (
                        <Avatar user={c.author} name={c.author?.name} size="sm" online={c.author ? isOnline(c.author.id) : undefined} />
                      )}
                      <div className={`max-w-[70%] min-w-0 ${isMine ? "order-1" : "order-2"}`}>
                        {isEditing ? (
                          <form
                            onSubmit={handleSaveEdit}
                            className={`rounded-2xl p-3 ${isMine ? "bg-primary-500" : "bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark"}`}
                          >
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              rows={3}
                              autoFocus
                              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                              >
                                {t("common.cancel")}
                              </button>
                              <button
                                type="submit"
                                disabled={!editBody.trim() || editMutation.isPending}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                              >
                                {editMutation.isPending ? <SpinnerIcon /> : null}
                                {t("common.save")}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className={`rounded-2xl px-4 py-2.5 ${isMine ? "bg-primary-500 text-white rounded-br-md" : "bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark rounded-bl-md"}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                {!isMine && (
                                  <span className="text-[11px] font-semibold text-text-muted-light dark:text-text-muted-dark">
                                    {c.author?.name || t("common.unknown")}
                                  </span>
                                )}
                                {(isMine || isManagerOrSupervisor) && (
                                  <div className="flex items-center gap-0.5">
                                    {isMine && (
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(c)}
                                        className={`p-0.5 rounded transition-colors ${isMine ? "text-white/60 hover:text-white" : "text-text-muted-light dark:text-text-muted-dark hover:text-primary-500"}`}
                                        title={t("common.edit")}
                                      >
                                        <EditIcon size={11} />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTarget(c)}
                                        className={`p-0.5 rounded transition-colors ${isMine ? "text-white/60 hover:text-white" : "text-text-muted-light dark:text-text-muted-dark hover:text-red-500"}`}
                                        title={t("common.delete")}
                                      >
                                        <TrashIcon size={11} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isManagerOrSupervisor && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePin(c.id)}
                                  className={`p-0.5 rounded transition-colors ${c.pinned ? (isMine ? "text-yellow-300" : "text-yellow-500") : (isMine ? "text-white/50 hover:text-white" : "text-text-muted-light dark:text-text-muted-dark hover:text-yellow-500")}`}
                                  title={c.pinned ? t("comments.unpin") : t("comments.pin")}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={c.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed break-words">{c.body}</p>
                          </div>
                        )}
                        <p className={`text-[10px] mt-1 text-text-muted-light dark:text-text-muted-dark ${isMine ? "text-end" : "text-start"}`}>
                          {formatTime(c.createdAt, i18n.language)}
                        </p>
                      </div>
                      {isMine && (
                        <Avatar user={c.author} name={c.author?.name} size="sm" online={c.author ? isOnline(c.author.id) : undefined} />
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="shrink-0 border-t border-border-light dark:border-border-dark pt-3">
              {noTaskSelected ? null : commentsDisabled ? (
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-3">
                  {t("comments.commentsAreDisabled")}
                </p>
              ) : (
                <form onSubmit={handleAddComment} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t("comments.writePlaceholder")}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submitting}
                    className="px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {submitting ? <SpinnerIcon /> : <MessageIcon size={14} />}
                    <span>{t("comments.send")}</span>
                  </button>
                </form>
              )}
            </div>

            {!noTaskSelected && (
              <div className="mt-4 shrink-0">
            <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
              </svg>
              {t("comments.pinnedNotes", "Notes")}
            </h3>
            {pinnedComments.length === 0 ? (
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark p-4">
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center">
                  {t("comments.noPinnedNotes", "No pinned notes found")}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pinnedComments.map((c) => {
                  const isMine = c.author?.id === currentUserId;
                  return (
                    <div key={c.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                      <Avatar user={c.author} name={c.author?.name} size="xs" online={c.author ? isOnline(c.author.id) : undefined} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">{c.author?.name}</span>
                          <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{formatTime(c.createdAt, i18n.language)}</span>
                        </div>
                        <p className="text-sm text-text-primary-light dark:text-text-primary-dark mt-0.5 line-clamp-2">{c.body}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {(isMine || isManagerOrSupervisor) && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            className="p-0.5 rounded text-amber-600/70 dark:text-amber-400/70 hover:text-red-500 transition-colors"
                            title={t("common.delete")}
                          >
                            <TrashIcon size={11} />
                          </button>
                        )}
                        {isManagerOrSupervisor && (
                          <button
                            type="button"
                            onClick={() => handleTogglePin(c.id)}
                            className="p-0.5 rounded text-yellow-500 hover:text-yellow-600 transition-colors"
                            title={t("comments.unpin")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          )}
        </>
      )}
      </div>

      <div className="lg:w-72 shrink-0">
        <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 space-y-4 sticky top-4">
          <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
            {t("comments.controls", "Controls")}
          </h3>

          <div>
            <label className="block text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5">
              {t("comments.selectProject", "Project")}
            </label>
            <select
              value={selectedProjectId}
              onChange={handleProjectChange}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              <option value="">{t("comments.chooseProject", "Choose a project")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5">
              {t("comments.selectTask", "Task")}
            </label>
            <select
              value={activeTaskId || ""}
              onChange={handleTaskChange}
              disabled={!selectedProjectId}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
            >
              <option value="">{t("comments.chooseTask", "Choose a task")}</option>
              {projectTasks.map((tk) => (
                <option key={tk.id} value={tk.id}>{tk.title}</option>
              ))}
            </select>
          </div>

          {commentRole === "MANAGER" && (
            <div className="border-t border-border-light dark:border-border-dark pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={commentsDisabled}
                    onChange={handleToggleCommentsDisabled}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark peer-checked:bg-red-500 peer-checked:border-red-500 transition-colors" />
                  <div className="absolute top-0.5 start-0.5 w-4 h-4 rounded-full bg-white shadow-sm peer-checked:translate-x-full rtl:peer-checked:-translate-x-full transition-transform" />
                </div>
                <span className="text-sm text-text-primary-light dark:text-text-primary-dark font-medium">
                  {t("comments.disableComments", "Disable Comments")}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t("comments.deleteCommentTitle", "Delete comment")}
        description={t("comments.deleteCommentDesc", "This action cannot be undone.")}
        confirmLabel={t("common.delete")}
        onConfirm={() => deleteTarget && handleDeleteComment(deleteTarget.id)}
        danger
      />
    </div>
  );
}
