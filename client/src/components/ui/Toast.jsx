import { useTranslation } from "react-i18next";
import { useToast } from "../../context/ToastContext";

function CheckCircleIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function XCircleIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function InfoIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function AlertTriangleIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const VARIANTS = {
  success: {
    Icon: CheckCircleIcon,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    ringClass: "ring-emerald-200 dark:ring-emerald-800",
  },
  error: {
    Icon: XCircleIcon,
    iconClass: "text-red-600 dark:text-red-400",
    ringClass: "ring-red-200 dark:ring-red-800",
  },
  info: {
    Icon: InfoIcon,
    iconClass: "text-blue-600 dark:text-blue-400",
    ringClass: "ring-blue-200 dark:ring-blue-800",
  },
  warning: {
    Icon: AlertTriangleIcon,
    iconClass: "text-amber-600 dark:text-amber-400",
    ringClass: "ring-amber-200 dark:ring-amber-800",
  },
};

export default function Toast({ toast }) {
  const { t } = useTranslation();
  const { removeToast } = useToast();
  const variant = VARIANTS[toast.variant] || VARIANTS.info;
  const { Icon } = variant;

  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      className={
        "pointer-events-auto relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-4 shadow-lg ring-1 " +
        variant.ringClass
      }
    >
      <Icon className={"h-5 w-5 flex-shrink-0 mt-0.5 " + variant.iconClass} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
            {toast.title}
          </p>
        )}
        {toast.description && (
          <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action.onClick?.();
              removeToast(toast.id);
            }}
            className="mt-2 text-xs font-semibold text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        aria-label={t("common.dismiss")}
        className="flex-shrink-0 rounded p-0.5 text-text-muted-light dark:text-text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
