import { useTranslation } from "react-i18next";

const CheckIcon = ({ size = 12 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClockIcon = ({ size = 12 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AlertTriangleIcon = ({ size = 12 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CircleIcon = ({ size = 12 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const STATUS_STYLES = {
  PENDING: {
    icon: CircleIcon,
    className: "bg-bg-light text-text-muted-light dark:bg-bg-dark dark:text-text-muted-dark",
  },
  ACTIVE: {
    icon: CircleIcon,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  IN_PROGRESS: {
    icon: ClockIcon,
    className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  COMPLETED: {
    icon: CheckIcon,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  DELAYED: {
    icon: AlertTriangleIcon,
    className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  ON_HOLD: {
    icon: CircleIcon,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
};

export { STATUS_STYLES };

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const config = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      <Icon size={12} />
      <span>{t(`projects.detail.status.${status}`)}</span>
    </span>
  );
}
