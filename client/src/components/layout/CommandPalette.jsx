import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listProjects } from "../../api";

const SEARCHABLE_PAGES = [
  { id: "dashboard", path: "/dashboard", keywords: ["dashboard", "home", "main"] },
  { id: "members", path: "/members", keywords: ["members", "people", "team"] },
  { id: "projects", path: "/projects", keywords: ["projects", "project"] },
  { id: "tasks", path: "/tasks", keywords: ["tasks", "task", "issues"] },
  { id: "profile", path: "/profile", keywords: ["profile", "account", "me"] },
  { id: "settings", path: "/settings", keywords: ["settings", "preferences", "config"] },
  { id: "notifications", path: "/notifications", keywords: ["notifications", "alerts", "bell"] },
];

export default function CommandPalette({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
    Promise.all([
      listProjects().catch(() => ({ data: [] })),
    ]).then(([projRes]) => {
      setProjects(projRes.data || []);
    });
  }, [open]);

  function getResults() {
    if (!query.trim()) {
      return { pages: SEARCHABLE_PAGES, projects: [] };
    }
    const q = query.toLowerCase();
    const pages = SEARCHABLE_PAGES.filter(
      (p) => p.id.includes(q) || p.keywords.some((k) => k.includes(q))
    );
    const filteredProjects = projects.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
    return { pages, projects: filteredProjects };
  }

  const { pages: pageResults, projects: projectResults } = getResults();

  const allItems = [
    ...pageResults.map((p) => ({ type: "page", id: p.id, label: t(`nav.${p.id}`, p.id), path: p.path })),
    ...projectResults.map((p) => ({ type: "project", id: p.id, label: p.name, path: `/projects?projectId=${p.id}` })),
  ].slice(0, 12);

  function handleSelect(item) {
    onClose();
    navigate(item.path);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      handleSelect(allItems[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  const typeIcon = (type) => {
    switch (type) {
      case "page": return "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5";
      case "project": return "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z";
      case "task": return "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11";
    }
  };

  const typeLabel = (type) => {
    switch (type) {
      case "page": return t("common.page");
      case "project": return t("nav.projects");
      case "task": return t("nav.tasks");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl animate-modal-in overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted-light dark:text-text-muted-dark shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder={t("common.searchPlaceholder") || "Search teams, projects, tasks..."}
            className="flex-1 bg-transparent text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark shrink-0">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {allItems.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-text-muted-light dark:text-text-muted-dark">
              {query ? t("common.noResults") || "No results found" : t("common.typeToSearch") || "Type to search..."}
            </div>
          )}
          {allItems.map((item, idx) => (
            <button
              key={item.type + ":" + item.id}
              type="button"
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-start transition-colors ${
                idx === selectedIndex
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200"
                  : "text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark"
              }`}
            >
              <span className="shrink-0 w-8 h-8 rounded-lg bg-bg-light dark:bg-bg-dark flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={typeIcon(item.type)} />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
              </div>
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">
                {typeLabel(item.type)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
