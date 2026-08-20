import { useTranslation } from "react-i18next";

export default function EmptyState({ icon, title, description, action, secondaryAction }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-6 flex flex-col items-center text-center gap-3">
      {icon && (
        <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-500 dark:text-primary-300">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
            {description}
          </p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-primary-500/30 transition-all"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      )}
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
