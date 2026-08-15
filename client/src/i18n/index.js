import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const RTL_LANGUAGES = ["ar"];

function applyDirection(lang) {
  const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });

applyDirection(i18n.language);

i18n.on("languageChanged", (lang) => {
  applyDirection(lang);
});

export default i18n;
