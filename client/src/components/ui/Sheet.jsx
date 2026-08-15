import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function Sheet({ open, onClose, title, children }) {
  const { t, i18n } = useTranslation();
  const overlayRef = useRef(null);
  const isRtl = i18n.dir() === "rtl";

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={
          `fixed top-0 bottom-0 w-full sm:w-96 max-w-[calc(100vw-2rem)] bg-surface-light dark:bg-surface-dark ${isRtl ? "border-r" : "border-l"} border-border-light dark:border-border-dark shadow-2xl flex flex-col z-50 ${isRtl ? "animate-slide-in-rtl left-0" : "animate-slide-in-ltr right-0"}`
        }
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light dark:border-border-dark shrink-0">
          <h2 className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
            aria-label={t("common.dismiss")}
          >
            <XIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3.5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
