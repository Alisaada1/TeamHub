import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LandingNavBar, Footer } from "./LandingAuth";
import Logo from "../components/layout/Logo";
import Avatar from "../components/ui/Avatar";
import { ArrowLeftIcon } from "../components/icons/Icons";

const teamMembers = [
  { nameEn: "Ali Saada", nameAr: "علي سعده", roleEn: "Backend Developer", roleAr: "تطوير الواجهات الخلفية" },
  { nameEn: "Sarah Al-Maghrabi", nameAr: "سارة المغربي", roleEn: "Backend Developer", roleAr: "تطوير الواجهات الخلفية" },
  { nameEn: "Osama Ahmed", nameAr: "أسامة أحمد", roleEn: "Frontend Developer", roleAr: "تطوير الواجهات الأمامية" },
  { nameEn: "Shahd Alloush", nameAr: "شهد علوش", roleEn: "Frontend Developer", roleAr: "تطوير الواجهات الأمامية" },
  { nameEn: "Judy Youssef", nameAr: "جودي يوسف", roleEn: "Database Designer", roleAr: "تصميم قواعد البيانات" },
];

export default function AboutUs() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark">
      <LandingNavBar />

      <section className="relative flex-1 overflow-hidden flex items-center px-6 py-1.5 md:py-3">
        <div
          aria-hidden
          className="absolute -top-32 -start-32 w-96 h-96 rounded-full bg-primary-200/40 dark:bg-primary-800/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -end-32 w-96 h-96 rounded-full bg-secondary-200/40 dark:bg-secondary-800/20 blur-3xl"
        />

        <div className="relative w-full max-w-5xl mx-auto">
          <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-lg shadow-black/5 dark:shadow-black/20 p-3.5 md:p-4">
            <div className="flex items-center gap-2.5">
              <Link
                to="/"
                aria-label={t("common.back")}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark/60 px-2.5 py-1.5 text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
              >
                <span className="inline-flex rtl:rotate-180">
                  <ArrowLeftIcon size={16} />
                </span>
                {t("common.back")}
              </Link>
              <Logo framed size="sm" />
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-extrabold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                  {t("about.title")}
                </h1>
                <p className="text-xs md:text-sm text-text-muted-light dark:text-text-muted-dark leading-snug">
                  {t("about.tagline")}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2.5">
              <div className="lg:col-span-2 space-y-2.5">
                <div className="rounded-xl border border-border-light dark:border-border-dark p-3.5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                    {t("about.missionTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-text-muted-light dark:text-text-muted-dark leading-snug">
                    {t("about.missionDesc")}
                  </p>
                </div>

                <div className="rounded-xl border border-border-light dark:border-border-dark p-3.5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                    {t("about.storyTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-text-muted-light dark:text-text-muted-dark leading-snug">
                    {t("about.storyDesc")}
                  </p>
                </div>

                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                    {t("about.valuesTitle")}
                  </h2>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { title: t("about.value1Title"), desc: t("about.value1Desc") },
                      { title: t("about.value2Title"), desc: t("about.value2Desc") },
                      { title: t("about.value3Title"), desc: t("about.value3Desc") },
                    ].map((v) => (
                      <div
                        key={v.title}
                        className="rounded-xl border border-border-light dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark/60 p-3"
                      >
                        <h3 className="text-[13px] font-semibold text-text-primary-light dark:text-text-primary-dark">
                          {v.title}
                        </h3>
                        <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark leading-snug">
                          {v.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border-light dark:border-border-dark p-3.5 flex flex-col">
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                  {t("about.teamTitle")}
                </h2>
                <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                  {t("about.teamDesc")}
                </p>
                <ul className="mt-2.5 space-y-1.5 flex-1">
                  {teamMembers.map((m) => (
                    <li
                      key={m.nameEn}
                      className="flex items-center gap-2.5 rounded-lg border border-border-light dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark/60 p-1.5"
                    >
                      <Avatar name={isAr ? m.nameAr : m.nameEn} size="sm" bold />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                          {isAr ? m.nameAr : m.nameEn}
                        </p>
                        <p className="text-[11px] text-primary-600 dark:text-primary-300 truncate">
                          {isAr ? m.roleAr : m.roleEn}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-2.5 rounded-xl border border-border-light dark:border-border-dark p-2.5 flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark">
                  {t("about.contactEmailLabel")}
                </span>
                <a
                  href="mailto:hubteam434@gmail.com"
                  className="text-sm text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 font-medium transition-colors"
                >
                  hubteam434@gmail.com
                </a>
              </div>
              <span
                aria-hidden
                className="hidden sm:block w-1 h-1 rounded-full bg-border-light dark:bg-border-dark"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark">
                  {t("about.contactPhoneLabel")}
                </span>
                <a
                  href="tel:+963935036746"
                  dir="ltr"
                  className="text-sm text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 font-medium transition-colors"
                >
                  +963935036746
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
