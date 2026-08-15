const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400 flex-shrink-0">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function ErrorState({ title, message, onRetry, t, retryLabel }) {
  const retry = retryLabel || (t ? t("common.retry") : "Retry");
  return (
    <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-6 md:p-8 flex flex-col items-center text-center gap-3">
      <AlertIcon />
      <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">{title}</h2>
      {message && <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {retry}
        </button>
      )}
    </div>
  );
}
