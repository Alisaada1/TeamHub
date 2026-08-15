import { createPortal } from "react-dom";
import { useToast } from "../../context/ToastContext";
import Toast from "./Toast";

export default function ToastContainer() {
  const { toasts } = useToast();
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-stretch gap-2 px-4 sm:inset-x-auto sm:end-4 sm:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter"
        >
          <Toast toast={t} />
        </div>
      ))}
    </div>,
    document.body
  );
}
