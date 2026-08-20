import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ROLE_STYLES = {
  MANAGER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SUPERVISOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  MEMBER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function RoleSelector({ value, onChange }) {
  const { t } = useTranslation();
  const ROLES = [
    { value: "MANAGER", label: t("roles.MANAGER") },
    { value: "SUPERVISOR", label: t("roles.SUPERVISOR") },
    { value: "MEMBER", label: t("roles.MEMBER") },
  ];
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const currentLabel = ROLES.find((r) => r.value === value)?.label || value;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors " +
          (ROLE_STYLES[value] || ROLE_STYLES.MEMBER)
        }
      >
        <span>{currentLabel}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1 w-36 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg py-1 z-20">
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => { onChange(role.value); setOpen(false); }}
              className={
                "w-full text-start px-3 py-1.5 text-sm transition-colors " +
                (role.value === value
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200 font-medium"
                  : "text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark")
              }
            >
              {role.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
