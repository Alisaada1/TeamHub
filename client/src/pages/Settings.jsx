import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { useLocalUser } from "../context/LocalUserContext";
import { useTheme } from "../context/ThemeContext";
import { queryKeys } from "../api/queryKeys";
import Tabs from "../components/ui/Tabs";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import { toast } from "../utils/toast";
import { CheckIcon, SunIcon, MoonIcon, BellIcon, ClockIcon, MessageIcon, AlertIcon } from "../components/icons/Icons";

// ===== Reusable pieces =====

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shrink-0 " +
        (checked
          ? "bg-primary-500"
          : "bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark") +
        (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer active:scale-90")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ease-out " +
          (checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1")
        }
      />
    </button>
  );
}

function Card({ className = "", children }) {
  return (
    <div className={"rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark " + className}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{title}</h3>
        {description && (
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

// ===== Tab Panels =====

function GeneralPanel({ t }) {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);

  function handleLanguageChange(lang) {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  }

  const options = [
    { code: "en", flag: "🇺🇸", name: "English", nativeName: "English" },
    { code: "ar", flag: "🇸🇦", name: "العربية", nativeName: "Arabic" },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-5">
        <SectionHeader icon={<span className="text-lg leading-none">🌐</span>} title={t("settings.languageTitle")} description={t("settings.languageDescription")} />
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {options.map((opt) => {
            const active = language === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleLanguageChange(opt.code)}
                aria-pressed={active}
                className={
                  "relative flex flex-1 items-center gap-3 px-4 py-3 rounded-xl border-2 text-start transition-all duration-300 " +
                  (active
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary-500/10"
                    : "border-border-light dark:border-border-dark hover:border-primary-300 dark:hover:border-primary-700 hover:bg-bg-light/60 dark:hover:bg-bg-dark/60")
                }
              >
                <span className="text-xl">{opt.flag}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{opt.name}</span>
                  <span className="block text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{opt.nativeName}</span>
                </span>
                <span
                  className={
                    "flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300 shrink-0 " +
                    (active
                      ? "bg-primary-500 text-white scale-100"
                      : "bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark scale-75 opacity-60")
                  }
                >
                  <CheckIcon size={11} />
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function AppearancePanel({ t }) {
  const { theme, toggleTheme } = useTheme();

  const options = [
    {
      id: "light",
      label: t("settings.appearance.light"),
      desc: t("settings.themeLightDescription"),
      icon: <SunIcon />,
      active: theme === "light",
      preview: (
        <div className="h-16 rounded-lg border border-[#E6E1DA] bg-[#F3F1EE] p-2.5 overflow-hidden">
          <div className="flex gap-2 h-full">
            <div className="w-1/4 rounded-md bg-white border border-[#EFE9E3] p-1.5 flex flex-col gap-1.5">
              <div className="h-1.5 rounded-full w-3/4 bg-[#E8E2DB]" />
              <div className="h-1.5 rounded-full w-1/2 bg-[#EFE9E3]" />
              <div className="h-1.5 rounded-full w-2/3 bg-[#F3EFEA]" />
              <div className="h-1.5 rounded-full w-1/2 bg-[#EFE9E3]" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-2 rounded-full w-2/5 bg-[#DDD6CE]" />
              <div className="h-4 rounded-md bg-white border border-[#EFE9E3]" />
              <div className="h-4 rounded-md bg-white border border-[#EFE9E3]" />
              <div className="h-4 rounded-md bg-[#6366F1]/10 border border-[#6366F1]/20" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "dark",
      label: t("settings.appearance.dark"),
      desc: t("settings.themeDarkDescription"),
      icon: <MoonIcon />,
      active: theme === "dark",
      preview: (
        <div className="h-16 rounded-lg border border-[#2A3548] bg-[#0D1117] p-2.5 overflow-hidden">
          <div className="flex gap-2 h-full">
            <div className="w-1/4 rounded-md bg-[#161B22] border border-[#2A3548] p-1.5 flex flex-col gap-1.5">
              <div className="h-1.5 rounded-full w-3/4 bg-[#3B3F51]" />
              <div className="h-1.5 rounded-full w-1/2 bg-[#2A3548]" />
              <div className="h-1.5 rounded-full w-2/3 bg-[#2A3548]" />
              <div className="h-1.5 rounded-full w-1/2 bg-[#2A3548]" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-2 rounded-full w-2/5 bg-[#2A3548]" />
              <div className="h-4 rounded-md bg-[#161B22] border border-[#2A3548]" />
              <div className="h-4 rounded-md bg-[#161B22] border border-[#2A3548]" />
              <div className="h-4 rounded-md bg-[#6366F1]/25 border border-[#6366F1]/40" />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-5">
        <SectionHeader icon={<span className="text-lg leading-none">🎨</span>} title={t("settings.appearance.title")} description={t("settings.appearanceDescription")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => !opt.active && toggleTheme()}
              aria-pressed={opt.active}
              className={
                "relative rounded-xl border-2 p-3 text-start transition-all duration-300 " +
                (opt.active
                  ? "border-primary-500 shadow-md shadow-primary-500/10"
                  : "border-border-light dark:border-border-dark hover:border-primary-300 dark:hover:border-primary-700 hover:-translate-y-0.5")
              }
            >
              <span
                className={
                  "absolute top-3 end-3 flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300 " +
                  (opt.active ? "bg-primary-500 text-white scale-100" : "bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark scale-75 opacity-60")
                }
              >
                <CheckIcon size={11} />
              </span>
              {opt.preview}
              <span className="flex items-center gap-2 mt-2">
                <span className={"transition-colors " + (opt.active ? "text-primary-600 dark:text-primary-300" : "text-text-muted-light dark:text-text-muted-dark")}>
                  {opt.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{opt.label}</span>
                  <span className="block text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{opt.desc}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotificationsPanel({ t }) {
  const { user } = useLocalUser();
  const queryClient = useQueryClient();

  const DEFAULT_PREFS = {
    emailNotifications: true,
    taskReminders: true,
    commentNotifications: true,
    statusChangeNotifications: true,
  };

  const prefsQuery = useQuery({
    queryKey: queryKeys.notificationPrefs,
    queryFn: () => api.getNotificationPreferences(user?.id),
    enabled: !!user?.id,
    retry: false,
  });
  const prefs = prefsQuery.data?.data
    ? { ...DEFAULT_PREFS, ...prefsQuery.data.data }
    : DEFAULT_PREFS;
  const loading = prefsQuery.isLoading;

  const toggleMutation = useMutation({
    mutationFn: ({ updated }) => api.updateNotificationPreferences(user?.id, updated),
    onMutate: ({ updated }) => {
      queryClient.setQueryData(queryKeys.notificationPrefs, (old) =>
        old ? { ...old, data: updated } : old
      );
    },
    onError: (err) => toast.error(t("common.error"), err?.message),
  });

  function handleToggle(key) {
    const updated = { ...prefs, [key]: !prefs[key] };
    toggleMutation.mutate({ updated });
  }

  const settings = [
    {
      key: "emailNotifications",
      icon: <BellIcon size={16} />,
      label: t("settings.notifications.emailNotifications"),
      desc: t("settings.notifications.emailNotificationsDesc"),
    },
    {
      key: "taskReminders",
      icon: <ClockIcon size={16} />,
      label: t("settings.notifications.taskReminders"),
      desc: t("settings.notifications.taskRemindersDesc"),
    },
    {
      key: "commentNotifications",
      icon: <MessageIcon size={16} />,
      label: t("settings.notifications.commentNotifications"),
      desc: t("settings.notifications.commentNotificationsDesc"),
    },
    {
      key: "statusChangeNotifications",
      icon: <AlertIcon size={16} />,
      label: t("settings.notifications.statusChangeNotifications"),
      desc: t("settings.notifications.statusChangeNotificationsDesc"),
    },
  ];

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-5">
        <SectionHeader icon={<BellIcon size={18} />} title={t("settings.notificationsTitle")} description={t("settings.notificationsDescription")} />
        <div className="mt-4 space-y-1.5">
          {settings.map((item) => (
            <div
              key={item.key}
              onClick={() => handleToggle(item.key)}
              className="group flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition-colors cursor-pointer hover:bg-bg-light/70 dark:hover:bg-bg-dark/70"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2.5 rounded-xl bg-bg-light dark:bg-bg-dark text-primary-600 dark:text-primary-300 shrink-0 transition-colors group-hover:text-primary-700 dark:group-hover:text-primary-200">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{item.label}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{item.desc}</p>
                </div>
              </div>
              <ToggleSwitch checked={prefs[item.key]} onChange={() => handleToggle(item.key)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===== Main Settings Component =====

function getTabs(t) {
  return [
    { id: "general", label: t("settings.tabs.general") },
    { id: "appearance", label: t("settings.tabs.appearance") },
    { id: "notifications", label: t("settings.tabs.notifications") },
  ];
}

export default function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const tabs = getTabs(t);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">{t("settings.title")}</h1>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">{t("settings.subtitle")}</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "general" && <GeneralPanel t={t} />}
      {activeTab === "appearance" && <AppearancePanel t={t} />}
      {activeTab === "notifications" && <NotificationsPanel t={t} />}
    </div>
  );
}
