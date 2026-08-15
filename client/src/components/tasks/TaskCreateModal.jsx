import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import Modal from "../ui/Modal";
import { createTask, createProject } from "../../api";
import { useLocalUser } from "../../context/LocalUserContext";
import { toast } from "../../utils/toast";
import { SpinnerIcon, PlusIcon, CheckIcon } from "../icons/Icons";

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_LABELS = { PENDING: "Pending", IN_PROGRESS: "In Progress", COMPLETED: "Completed", DELAYED: "Delayed" };
const PRIORITY_LABELS = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };

export default function TaskCreateModal({ open, onClose, projectId, teamId, members, projects, onCreated, t, projectStartDate, projectDueDate, userRole, prefillDueDate }) {
  const { user } = useLocalUser();
  const isMember = userRole === "MEMBER";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("PENDING");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (open && prefillDueDate) setDueDate(prefillDueDate);
  }, [open, prefillDueDate]);

  const [projectInput, setProjectInput] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(-1);

  const [error, setError] = useState(null);

  const createMutation = useMutation({
    mutationFn: async (vars) => {
      let finalProjectId = vars.finalProjectId;
      if (!finalProjectId && vars.targetProjectName && teamId) {
        const projectRes = await createProject(teamId, {
          name: vars.targetProjectName,
          description: undefined,
          status: "ACTIVE",
          color: "#6366f1",
        });
        finalProjectId = projectRes.data.id;
      }
      if (!finalProjectId) {
        throw new Error(t("tasks.create.errorProjectRequired"));
      }
      const res = await createTask(finalProjectId, {
        title: vars.title,
        description: vars.description,
        status: vars.status,
        priority: vars.priority,
        assigneeId: vars.assigneeId,
        dueDate: vars.dueDate,
        creatorId: user?.id || "usr_001",
      });
      return res.data;
    },
    onSuccess: (task) => {
      toast.success(t("toasts.taskCreated"));
      reset();
      onClose();
      onCreated(task);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || err?.message || t("common.error"));
    },
  });

  const activeProject = useMemo(() => {
    if (projectId) return projects?.find((p) => p.id === projectId) || null;
    return selectedProject;
  }, [projectId, projects, selectedProject]);

  const dateBounds = useMemo(() => {
    const bounds = { min: "", max: "" };
    if (projectStartDate) bounds.min = new Date(projectStartDate).toISOString().slice(0, 10);
    else if (activeProject?.startDate) bounds.min = new Date(activeProject.startDate).toISOString().slice(0, 10);
    if (projectDueDate) bounds.max = new Date(projectDueDate).toISOString().slice(0, 10);
    else if (activeProject?.dueDate) bounds.max = new Date(activeProject.dueDate).toISOString().slice(0, 10);
    return bounds;
  }, [activeProject, projectStartDate, projectDueDate]);

  const dateError = useMemo(() => {
    if (!dueDate || !dateBounds.min && !dateBounds.max) return null;
    if (dateBounds.min && dueDate < dateBounds.min) return `Date must be on or after ${dateBounds.min}`;
    if (dateBounds.max && dueDate > dateBounds.max) return `Date must be on or before ${dateBounds.max}`;
    return null;
  }, [dueDate, dateBounds]);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!projectInput) return projects;
    const q = projectInput.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, projectInput]);

  const hasExactMatch = useMemo(() => {
    if (!projectInput.trim()) return false;
    return filteredProjects.some((p) => p.name.toLowerCase() === projectInput.trim().toLowerCase());
  }, [filteredProjects, projectInput]);

  const showCreateOption = projectInput.trim() && !hasExactMatch;

  const options = useMemo(() => {
    const items = filteredProjects.map((p) => ({ ...p, isNew: false }));
    if (showCreateOption && !isMember) {
      items.push({ id: null, name: projectInput.trim(), isNew: true });
    }
    return items;
  }, [filteredProjects, showCreateOption, projectInput, isMember]);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setStatus("PENDING");
    setAssigneeId("");
    setDueDate("");
    setProjectInput("");
    setSelectedProject(null);
    setError(null);
    setDropdownOpen(false);
  }

  function handleClose() { reset(); onClose(); }

  function selectProject(project) {
    setSelectedProject(project);
    setProjectInput(project.name);
    setDropdownOpen(false);
    setDropdownIndex(-1);
  }

  function handleInputChange(value) {
    setProjectInput(value);
    setSelectedProject(null);
    setDropdownOpen(true);
    setDropdownIndex(-1);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownIndex((prev) => Math.min(prev + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropdownIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && dropdownIndex >= 0) {
      e.preventDefault();
      const item = options[dropdownIndex];
      if (item.isNew) {
        setProjectInput(item.name);
        setSelectedProject(null);
        setDropdownOpen(false);
      } else {
        selectProject(item);
      }
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  }

  function handleInputFocus() {
    if (!dropdownOpen && options.length > 0) {
      setDropdownOpen(true);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError(t("tasks.create.errorTitleRequired")); return; }

    const targetProjectId = projectId || selectedProject?.id;
    const targetProjectName = projectId ? null : (selectedProject?.name || projectInput.trim());

    if (!projectId && !targetProjectId && !targetProjectName) {
      setError(t("tasks.create.errorProjectRequired")); return;
    }
    if (!projectId && !targetProjectId && !teamId) {
      setError(t("tasks.create.errorTeamRequired", "Team is required to create a project")); return;
    }

    createMutation.mutate({
      finalProjectId: targetProjectId,
      targetProjectName,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      assigneeId: isMember ? user?.id : (assigneeId || user?.id || undefined),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
  }

  const showProjectSelector = !projectId;

  return (
    <Modal open={open} onClose={handleClose} title={t("tasks.create.title")} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {showProjectSelector && (
          <div className="relative">
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.create.projectLabel")}</label>
            <input
              ref={inputRef}
              type="text"
              value={projectInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              disabled={createMutation.isPending}
              autoComplete="off"
              placeholder={t("tasks.create.projectPlaceholder", "Search or type project name...")}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
            />
            {dropdownOpen && options.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-lg"
              >
                {options.map((opt, idx) => (
                  <button
                    key={opt.isNew ? "new" : opt.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectProject(opt); }}
                    className={`w-full text-start px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      idx === dropdownIndex
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                        : "text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark"
                    }`}
                  >
                    {opt.isNew ? (
                      <>
                        <PlusIcon size={14} className="text-primary-500 shrink-0" />
                        <span>{t("tasks.create.createProject", 'Create project "{{name}}"').replace("{{name}}", opt.name)}</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon size={14} className="text-emerald-500 shrink-0" />
                        <span>{opt.name}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.create.titleLabel")}</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={createMutation.isPending} autoFocus
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
            placeholder={t("tasks.create.titlePlaceholder")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.create.descriptionLabel")}</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={createMutation.isPending}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors resize-none"
            placeholder={t("tasks.create.descriptionPlaceholder")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">{t("tasks.create.statusLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} disabled={createMutation.isPending}
                className={"px-3 py-1.5 text-xs font-semibold rounded-full transition-all " + (status === s ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}>
                {t("projects.detail.status." + s, STATUS_LABELS[s])}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">{t("tasks.create.priorityLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)} disabled={createMutation.isPending}
                className={"px-3 py-1.5 text-xs font-semibold rounded-full transition-all " + (priority === p ? "bg-primary-500 text-white shadow-sm" : "bg-bg-light dark:bg-bg-dark text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark")}>
                {t("projects.detail.priority." + p, PRIORITY_LABELS[p])}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {members && (
            <div>
              <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.create.assigneeLabel")}</label>
              {isMember ? (
                <select value={user?.id || ""} disabled
                  className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark opacity-60 cursor-not-allowed">
                  <option value={user?.id || ""}>{user?.name || t("tasks.detail.unassigned")} ({t("tasks.create.assignedToYou", "you")})</option>
                </select>
              ) : (
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={createMutation.isPending}
                  className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors">
                  <option value="">{t("tasks.create.assigneeUnassigned")}</option>
                  {(members || []).map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user?.name || m.userId}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          <div lang="en" dir="ltr">
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">{t("tasks.create.dueDateLabel")}</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={createMutation.isPending}
              min={dateBounds.min || undefined} max={dateBounds.max || undefined}
              className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors" />
            {dateError && <p className="mt-1 text-xs text-red-500">{dateError}</p>}
          </div>
        </div>
        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} disabled={createMutation.isPending} className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50">{t("common.cancel")}</button>
          <button type="submit" disabled={createMutation.isPending || !title.trim()} className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {createMutation.isPending ? <><SpinnerIcon /> <span>{t("common.loading")}</span></> : <><PlusIcon size={14} /> {t("tasks.create.submit")}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
