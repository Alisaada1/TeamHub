import { useTranslation } from "react-i18next";

const PRIORITY_STYLES = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export { PRIORITY_STYLES };

export default function PriorityBadge({ priority, compact = false }) {
  const { t } = useTranslation();
  const className = PRIORITY_STYLES[priority] || PRIORITY_STYLES.MEDIUM;
  return (
    <span
      className={`inline-flex items-center ${compact ? "px-1 py-0" : "px-2 py-0.5"} rounded-full text-[10px] font-medium ${className}`}
    >
      {t(`projects.detail.priority.${priority}`)}
    </span>
  );
}
