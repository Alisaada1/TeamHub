import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSignIn, useSignUp, useAuth } from "@clerk/clerk-react";
import { useTheme } from "../context/ThemeContext";
import Logo from "../components/layout/Logo";
import OtpInput from "../components/ui/OtpInput";
import { SunIcon, MoonIcon, LangIcon } from "../components/icons/Icons";

const PROVIDER_STRATEGIES = {
  google: "oauth_google",
  github: "oauth_github",
  linkedin: "oauth_linkedin_oidc",
};

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BoardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted-light dark:text-text-muted-dark">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted-light dark:text-text-muted-dark">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted-light dark:text-text-muted-dark">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.1 29.1 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.1 29.1 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13.1-5.1l-6.1-5.1C29.1 35.4 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.7l6.1 5.1C40.8 35.6 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z" />
  </svg>
);

const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.16c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.05.78 2.12v3.14c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
  </svg>
);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function SocialAuthIcons({ onProvider, loading, disabled }) {
  const { t } = useTranslation();
  const providers = [
    {
      id: "google",
      icon: <GoogleIcon />,
      className:
        "bg-white text-gray-800 hover:bg-gray-50 border border-border-light dark:border-border-dark",
    },
    {
      id: "github",
      icon: <GitHubIcon />,
      className:
        "bg-[#24292F] text-white hover:bg-[#1f2329] border border-[#24292F]",
    },
    {
      id: "linkedin",
      icon: <LinkedInIcon />,
      className:
        "bg-[#0A66C2] text-white hover:bg-[#084d96] border border-[#0A66C2]",
    },
  ];

  return (
    <div className="flex items-center justify-center gap-3">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onProvider(p.id)}
          disabled={disabled}
          title={t("auth.signInWithProvider", { provider: p.id })}
          className={`flex items-center justify-center w-11 h-11 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${p.className}`}
        >
          {loading === p.id ? <SpinnerIcon /> : p.icon}
        </button>
      ))}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
      <span className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark">
        {label}
      </span>
      <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  disabled,
  placeholder,
  hint,
  autoComplete,
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <LockIcon />
        </span>
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full ps-10 pe-10 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
          title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
          className="absolute inset-y-0 end-0 flex items-center pe-3 text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark disabled:opacity-50"
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hint && (
        <p className="mt-1.5 text-xs text-text-muted-light dark:text-text-muted-dark">
          {hint}
        </p>
      )}
    </div>
  );
}

export function LandingNavBar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  function toggleLanguage() {
    const next = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(next);
  }

  return (
    <nav className="w-full px-6 md:px-12 py-3 flex items-center justify-between bg-surface-light/70 dark:bg-surface-dark/70 backdrop-blur-md border-b border-border-light dark:border-border-dark sticky top-0 z-10">
      <Link to="/" className="flex items-center gap-3">
        <Logo size="sm" />
        <span className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">
          {t("app.name")}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          to="/about"
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-text-muted-light dark:text-text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
        >
          {t("nav.about")}
        </Link>
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          aria-label={t("topbar.toggleLanguage")}
          title={i18n.language === "en" ? "العربية" : "English"}
        >
          <LangIcon />
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          aria-label={t("topbar.toggleTheme")}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </nav>
  );
}

function AuthNavBar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  function toggleLanguage() {
    const next = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(next);
  }

  return (
    <nav className="w-full px-6 md:px-12 py-3 flex items-center justify-between bg-surface-light/70 dark:bg-surface-dark/70 backdrop-blur-md border-b border-border-light dark:border-border-dark sticky top-0 z-10">
      <Link to="/" className="flex items-center gap-3">
        <Logo size="sm" />
        <span className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">
          {t("app.name")}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          to="/about"
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-text-muted-light dark:text-text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
        >
          {t("nav.about")}
        </Link>
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          aria-label={t("topbar.toggleLanguage")}
          title={i18n.language === "en" ? "العربية" : "English"}
        >
          <LangIcon />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          aria-label={t("topbar.toggleTheme")}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </nav>
  );
}

function Hero() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="relative flex-1 flex items-center justify-center px-6 py-5 md:py-6 overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 -start-32 w-96 h-96 rounded-full bg-primary-200/40 dark:bg-primary-800/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -end-32 w-96 h-96 rounded-full bg-secondary-200/40 dark:bg-secondary-800/20 blur-3xl"
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <div className="flex items-center justify-center mb-3 md:mb-4">
          <Logo framed size="hero" />
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary-light dark:text-text-primary-dark">
          {t("landing.title")}
        </h1>

        <p className="mt-2 text-sm md:text-base text-text-muted-light dark:text-text-muted-dark max-w-2xl mx-auto leading-relaxed">
          {t("landing.subtitle")}
        </p>

        <div className="mt-4 md:mt-5 flex flex-col items-center justify-center gap-3">
          <button
            onClick={() => navigate("/sign-in")}
            className="w-full sm:w-auto px-7 py-2.5 text-sm font-semibold rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-0.5"
          >
            {t("landing.getStarted")}
          </button>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: <UsersIcon />, titleKey: "feature1Title", descKey: "feature1Desc", accent: "primary" },
  { icon: <BoardIcon />, titleKey: "feature2Title", descKey: "feature2Desc", accent: "secondary" },
  { icon: <BellIcon />, titleKey: "feature3Title", descKey: "feature3Desc", accent: "accent" },
];

function Features() {
  const { t } = useTranslation();

  const accentMap = {
    primary: "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300",
    secondary: "bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-300",
    accent: "bg-accent-100 dark:bg-accent-900/20 text-accent-700 dark:text-accent-200",
  };

  return (
    <section className="px-6 md:px-12 py-4 md:py-5 bg-bg-light dark:bg-bg-dark">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {features.map((f) => (
          <div
            key={f.titleKey}
            className="group p-4 md:p-5 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <div
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${accentMap[f.accent]}`}
            >
              {f.icon}
            </div>
            <h3 className="text-base md:text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
              {t(`landing.${f.titleKey}`)}
            </h3>
            <p className="mt-1.5 text-sm text-text-muted-light dark:text-text-muted-dark leading-relaxed">
              {t(`landing.${f.descKey}`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="px-6 md:px-12 py-3 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-text-muted-light dark:text-text-muted-dark">
        <p>© {year} {t("app.name")}. {t("landing.allRightsReserved")}</p>
        <p>{t("app.tagline")}</p>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark">
      <LandingNavBar />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

export function SignIn() {
  const { t } = useTranslation();
  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isSignedIn) navigate("/dashboard", { replace: true });
  }, [isSignedIn, navigate]);

  function clearError() {
    if (error) setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (isSignedIn) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!identifier || !password) {
      setError(t("auth.errors.identifierRequired"));
      return;
    }

    if (!signInLoaded) {
      setError("Auth system not ready. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate(from, { replace: true });
      } else {
        setError(t("auth.errors.signInFailed"));
      }
    } catch (err) {
      console.error("SignIn error:", err);
      setError(err?.errors?.[0]?.longMessage || err?.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleProvider(provider) {
    if (!signInLoaded) return;
    if (isSignedIn) {
      navigate("/dashboard", { replace: true });
      return;
    }
    setError(null);
    setSocialLoading(provider);
    try {
      await signIn.authenticateWithRedirect({
        strategy: PROVIDER_STRATEGIES[provider],
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}${from}`,
      });
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || t("auth.errors.socialSignInFailed"));
      setSocialLoading(null);
    }
  }

  const anyLoading = loading || socialLoading !== null;

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark">
      <AuthNavBar />

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 -end-32 w-96 h-96 rounded-full bg-primary-200/30 dark:bg-primary-800/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -start-32 w-96 h-96 rounded-full bg-secondary-200/30 dark:bg-secondary-800/20 blur-3xl"
        />

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
              {t("auth.signInTitle")}
            </h1>
            <p className="mt-2 text-text-muted-light dark:text-text-muted-dark">
              {t("auth.signInSubtitle")}
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl shadow-primary-900/5 p-6 md:p-8">
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
                  >
                    {t("auth.emailOrUsername")}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <EmailIcon />
                    </span>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      dir="ltr"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        clearError();
                      }}
                      disabled={anyLoading}
                      className="w-full ps-10 pe-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                      placeholder={t("auth.identifierPlaceholder")}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
                  >
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <LockIcon />
                    </span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError();
                      }}
                      disabled={anyLoading}
                      className="w-full ps-10 pe-10 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                      placeholder={t("auth.passwordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={anyLoading}
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      className="absolute inset-y-0 end-0 flex items-center pe-3 text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark disabled:opacity-50"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-end mt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={anyLoading}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-primary-500/30 transition-all"
              >
                {loading ? (
                  <>
                    <SpinnerIcon />
                    <span>{t("common.loading")}</span>
                  </>
                ) : (
                  <span>{t("auth.submitSignIn")}</span>
                )}
              </button>
            </form>

            <Divider label={t("auth.orSignInWith")} />

            <SocialAuthIcons
              onProvider={handleProvider}
              loading={socialLoading}
              disabled={anyLoading}
            />

            <div className="mt-5 pt-4 border-t border-border-light dark:border-border-dark text-center text-sm text-text-muted-light dark:text-text-muted-dark">
              {t("auth.noAccount")}{" "}
              <Link
                to="/sign-up"
                className="font-semibold text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200"
              >
                {t("auth.signUpLink")}
              </Link>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}

export function SignUp() {
  const { t } = useTranslation();
  const { signUp, isLoaded: signUpLoaded, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) navigate("/dashboard", { replace: true });
  }, [isSignedIn, navigate]);

  const [step, setStep] = useState("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function clearError() {
    if (error) setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (isSignedIn) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!firstName || !username || !email || !password) {
      setError(t("auth.errors.allFieldsRequired"));
      return;
    }
    if (firstName.trim().length < 2) {
      setError(t("auth.errors.nameTooShort"));
      return;
    }
    if (username.trim().length < 3) {
      setError(t("auth.errors.usernameTooShort"));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.errors.passwordTooShort"));
      return;
    }

    if (!signUpLoaded) {
      setError("Auth system not ready. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        emailAddress: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard", { replace: true });
      } else if (
        result.status === "missing_requirements" &&
        result.unverifiedFields?.includes("email_address")
      ) {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("verify");
      } else {
        setError(t("auth.errors.signUpFailed"));
      }
    } catch (err) {
      console.error("SignUp error:", err);
      setError(err?.errors?.[0]?.longMessage || err?.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError(null);

    if (!verificationCode.trim()) {
      setError(t("auth.errors.verificationCodeRequired"));
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard", { replace: true });
      } else {
        setError(t("auth.errors.verificationFailed"));
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(err?.errors?.[0]?.longMessage || err?.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  const anyLoading = loading;

  if (step === "verify") {
    return (
      <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark">
        <AuthNavBar />
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
          <div aria-hidden className="absolute -top-32 -end-32 w-96 h-96 rounded-full bg-primary-200/30 dark:bg-primary-800/20 blur-3xl" />
          <div aria-hidden className="absolute -bottom-32 -start-32 w-96 h-96 rounded-full bg-secondary-200/30 dark:bg-secondary-800/20 blur-3xl" />
          <div className="relative w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
                {t("auth.verifyEmailTitle")}
              </h1>
              <p className="mt-2 text-text-muted-light dark:text-text-muted-dark">
                {t("auth.verifyEmailSubtitle", { email })}
              </p>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl shadow-primary-900/5 p-6 md:p-8">
              <form onSubmit={handleVerify} noValidate>
                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
                    {t("auth.verificationCode")}
                  </label>
                  <OtpInput
                    value={verificationCode}
                    onChange={(val) => { setVerificationCode(val); clearError(); }}
                    disabled={anyLoading}
                    length={6}
                  />
                </div>

                {error && (
                  <div role="alert" className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={anyLoading}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-primary-500/30 transition-all"
                >
                  {loading ? (
                    <>
                      <SpinnerIcon />
                      <span>{t("common.loading")}</span>
                    </>
                  ) : (
                    <span>{t("auth.verifyEmailButton")}</span>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-border-light dark:border-border-dark text-center text-sm text-text-muted-light dark:text-text-muted-dark">
                <button
                  type="button"
                  onClick={() => { setStep("form"); setVerificationCode(""); setError(null); }}
                  className="font-semibold text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200"
                >
                  {t("auth.backToSignUp")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark">
      <AuthNavBar />

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 -end-32 w-96 h-96 rounded-full bg-primary-200/30 dark:bg-primary-800/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -start-32 w-96 h-96 rounded-full bg-secondary-200/30 dark:bg-secondary-800/20 blur-3xl"
        />

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
              {t("auth.signUpTitle")}
            </h1>
            <p className="mt-2 text-text-muted-light dark:text-text-muted-dark">
              {t("auth.signUpSubtitle")}
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl shadow-primary-900/5 p-6 md:p-8">
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
                    >
                      {t("auth.firstName")}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <UserIcon />
                      </span>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          clearError();
                        }}
                        disabled={anyLoading}
                        className="w-full ps-10 pe-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                        placeholder={t("auth.firstNamePlaceholder")}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
                    >
                      {t("auth.lastName")}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <UserIcon />
                      </span>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          clearError();
                        }}
                        disabled={anyLoading}
                        className="w-full ps-10 pe-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                        placeholder={t("auth.lastNamePlaceholder")}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
                  >
                    {t("auth.username")}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <UserIcon />
                    </span>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        clearError();
                      }}
                      disabled={anyLoading}
                      className="w-full ps-10 pe-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                      placeholder={t("auth.usernamePlaceholder")}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
                  >
                    {t("auth.email")}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <EmailIcon />
                    </span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError();
                      }}
                      disabled={anyLoading}
                      className="w-full ps-10 pe-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                      placeholder={t("auth.emailPlaceholder")}
                    />
                  </div>
                </div>

                <PasswordField
                  id="password"
                  name="password"
                  label={t("auth.password")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  showPassword={showPassword}
                  onToggleVisibility={() => setShowPassword((v) => !v)}
                  disabled={anyLoading}
                  placeholder={t("auth.passwordCreatePlaceholder")}
                  hint={t("auth.passwordHint")}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={anyLoading}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-primary-500/30 transition-all"
              >
                {loading ? (
                  <>
                    <SpinnerIcon />
                    <span>{t("common.loading")}</span>
                  </>
                ) : (
                  <span>{t("auth.submitSignUp")}</span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark text-center text-sm text-text-muted-light dark:text-text-muted-dark">
              {t("auth.haveAccount")}{" "}
              <Link
                to="/sign-in"
                className="font-semibold text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200"
              >
                {t("auth.signInLink")}
              </Link>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}

export function ForgotPassword() {
  const { t } = useTranslation();
  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isSignedIn) navigate("/dashboard", { replace: true });
  }, [isSignedIn, navigate]);

  function clearError() {
    if (error) setError(null);
  }

  async function handleSendCode(e) {
    e.preventDefault();
    setError(null);

    if (isSignedIn) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!email) {
      setError(t("auth.errors.emailRequired"));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }
    if (!signInLoaded) {
      setError("Auth system not ready. Please try again.");
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep("reset");
    } catch (err) {
      console.error("ForgotPassword error:", err);
      setError(err?.errors?.[0]?.longMessage || err?.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError(t("auth.errors.verificationCodeRequired"));
      return;
    }
    if (!password || password.length < 8) {
      setError(t("auth.errors.passwordTooShort"));
      return;
    }
    if (!signInLoaded) {
      setError("Auth system not ready. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/dashboard", { replace: true });
      } else {
        setError(t("auth.errors.verificationFailed"));
      }
    } catch (err) {
      console.error("ForgotPassword reset error:", err);
      setError(err?.errors?.[0]?.longMessage || err?.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark">
      <AuthNavBar />

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 -end-32 w-96 h-96 rounded-full bg-primary-200/30 dark:bg-primary-800/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -start-32 w-96 h-96 rounded-full bg-secondary-200/30 dark:bg-secondary-800/20 blur-3xl"
        />

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
              {t("auth.forgotTitle")}
            </h1>
            <p className="mt-2 text-text-muted-light dark:text-text-muted-dark">
              {t("auth.forgotIntro")}
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl shadow-primary-900/5 p-6 md:p-8">
            {step === "email" ? (
              <form onSubmit={handleSendCode} noValidate>
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
                  >
                    {t("auth.email")}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <EmailIcon />
                    </span>
                    <input
                      id="forgot-email"
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError();
                      }}
                      disabled={loading}
                      className="w-full ps-10 pe-3 py-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors"
                      placeholder={t("auth.emailPlaceholder")}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-primary-500/30 transition-all"
                >
                  {loading ? (
                    <>
                      <SpinnerIcon />
                      <span>{t("common.loading")}</span>
                    </>
                  ) : (
                    <span>{t("auth.forgotSendButton")}</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset} noValidate>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">
                  {t("auth.forgotCodeIntro", { email })}
                </p>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="forgot-code"
                      className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
                    >
                      {t("auth.verificationCode")}
                    </label>
                    <OtpInput
                      value={code}
                      onChange={(val) => { setCode(val); clearError(); }}
                      disabled={loading}
                      length={6}
                    />
                  </div>

                  <PasswordField
                    id="new-password"
                    name="newPassword"
                    label={t("auth.forgotNewPasswordLabel")}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                    }}
                    showPassword={showPassword}
                    onToggleVisibility={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    placeholder={t("auth.passwordCreatePlaceholder")}
                    hint={t("auth.passwordHint")}
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-primary-500/30 transition-all"
                >
                  {loading ? (
                    <>
                      <SpinnerIcon />
                      <span>{t("common.loading")}</span>
                    </>
                  ) : (
                    <span>{t("auth.forgotSubmitButton")}</span>
                  )}
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-border-light dark:border-border-dark text-center text-sm text-text-muted-light dark:text-text-muted-dark">
              <Link
                to="/sign-in"
                className="font-semibold text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200"
              >
                {t("auth.backToSignIn")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
