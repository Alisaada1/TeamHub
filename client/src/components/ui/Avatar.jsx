import { useTranslation } from "react-i18next";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_CLASSES = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  "7": "h-7 w-7 text-[11px]",
  md: "h-8 w-8 text-xs",
  "9": "h-9 w-9 text-xs",
  lg: "h-9 w-9 text-xs",
  xl: "h-16 w-16 text-xl",
  "2xl": "h-24 w-24 text-3xl",
};

const DOT_CLASSES = {
  xs: "h-1.5 w-1.5",
  sm: "h-1.5 w-1.5",
  "7": "h-2 w-2",
  md: "h-2 w-2",
  "9": "h-2 w-2",
  lg: "h-2.5 w-2.5",
  xl: "h-3 w-3",
  "2xl": "h-4 w-4",
};

export default function Avatar({ user, name, size = "sm", bold = false, online }) {
  const { t } = useTranslation();
  const displayName = user?.name ?? name ?? "";
  const dim = SIZE_CLASSES[size] || SIZE_CLASSES.sm;
  const dotDim = DOT_CLASSES[size] || DOT_CLASSES.sm;
  const weight = bold ? "font-bold" : "font-semibold";
  const src = user?.imageUrl || null;

  return (
    <div className="relative inline-flex flex-shrink-0">
      {src ? (
        <img
          src={src}
          alt={displayName}
          title={displayName}
          className={`${dim} rounded-full object-cover`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${dim} rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200 flex items-center justify-center ${weight} flex-shrink-0`}
          title={displayName}
        >
          {getInitials(displayName)}
        </div>
      )}
      {typeof online === "boolean" && (
        <span
          title={online ? t("common.online") : t("common.offline")}
          className={`absolute bottom-0 end-0 ${dotDim} rounded-full ring-2 ring-surface-light dark:ring-surface-dark ${online ? "bg-emerald-500" : "bg-slate-400"}`}
        />
      )}
    </div>
  );
}
