import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { SpinnerIcon } from "../icons/Icons";

export default function ConfirmDialog({ open, onClose, title, description, confirmLabel, onConfirm, loading, danger }) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">{description}</p>
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50">
          {t("common.cancel")}
        </button>
        <button type="button" onClick={onConfirm} disabled={loading}
          className={"px-5 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 " + (danger ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30" : "bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/30")}>
          {loading ? <><SpinnerIcon /> <span>{t("common.loading")}</span></> : <span>{confirmLabel || t("common.confirm")}</span>}
        </button>
      </div>
    </Modal>
  );
}