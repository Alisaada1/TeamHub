import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useTheme } from "../../context/ThemeContext";
import { usePresence } from "../../context/PresenceContext";
import { useLocalUser } from "../../context/LocalUserContext";
import NotificationBell from "./NotificationBell";
import Avatar from "../ui/Avatar";
import { SunIcon, MoonIcon, LangIcon, ChevronDownIcon, SearchIcon } from "../icons/Icons";

const HamburgerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export default function Topbar({ onMenuToggle, onSearchClick }) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const { user: localUser } = useLocalUser();
  const { signOut } = useAuth();
  const { isOnline } = usePresence();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.name ||
    user?.username ||
    "";

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleLanguage() {
    const next = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(next);
  }

  return (
    <header className="h-14 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex items-center justify-between px-4 lg:px-6 xl:px-8">
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors lg:hidden"
          aria-label={t("topbar.toggleSidebar")}
        >
          <HamburgerIcon />
        </button>
      </div>

      <div className="relative flex-1 max-w-lg mx-auto px-4">
        <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none text-text-muted-light dark:text-text-muted-dark ps-3">
          <SearchIcon size={16} />
        </div>
        <input
          type="text"
          placeholder={t("common.search")}
          onFocus={(e) => { e.target.blur(); onSearchClick?.(); }}
          className="w-full ps-10 pe-4 py-1.5 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
        />
      </div>

      <div className="flex items-center gap-1 justify-end shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          aria-label={t("topbar.toggleTheme")}
          title={theme === "light" ? t("topbar.darkMode") : t("topbar.lightMode")}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>

        <button
          onClick={toggleLanguage}
          className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          aria-label={t("topbar.toggleLanguage")}
          title={i18n.language === "en" ? "العربية" : "English"}
        >
          <LangIcon />
        </button>

        <NotificationBell />

        {user ? (
          <div className="relative ms-2" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
              aria-label={t("topbar.userMenu")}
            >
              <Avatar user={user} name={displayName} size="md" online={isOnline(localUser?.id)} />
              <ChevronDownIcon />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 ltr:right-0 rtl:left-0 top-full mt-2 w-64 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg py-2 z-50">
                <div className="px-4 py-2 flex items-center gap-3">
                  <Avatar user={user} name={displayName} size="9" online={isOnline(localUser?.id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="mx-3 border-t border-border-light dark:border-border-dark my-1" />

                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  {t("nav.myProfile")}
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  {t("nav.settings")}
                </Link>

                <div className="mx-3 border-t border-border-light dark:border-border-dark my-1" />

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    signOut({ redirectUrl: window.location.origin + "/sign-in" });
                  }}
                  className="w-full text-start flex items-center gap-3 px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted-light dark:text-text-muted-dark">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  {t("nav.switchAccount")}
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    signOut({ redirectUrl: window.location.origin + "/" });
                  }}
                  className="w-full text-start flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/sign-in"
            className="ms-2 px-4 py-1.5 text-sm rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
          >
            {t("auth.submitSignIn")}
          </Link>
        )}
      </div>
    </header>
  );
}
