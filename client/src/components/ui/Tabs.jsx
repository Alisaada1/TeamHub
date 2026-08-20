export default function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={"flex gap-1 p-1 rounded-xl bg-bg-light/50 dark:bg-bg-dark/50 inline-flex " + className} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={
              "px-3 py-1.5 text-sm font-medium rounded-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary-500 " +
              (isActive
                ? "bg-primary-500 text-white shadow-sm"
                : "text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark")
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
