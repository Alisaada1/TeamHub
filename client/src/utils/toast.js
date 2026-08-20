import { emitToast } from "../context/toastStore";

export const toast = {
  success: (title, description, opts) =>
    emitToast({ variant: "success", title, description, ...opts }),
  error: (title, description, opts) =>
    emitToast({ variant: "error", title, description, ...opts }),
  info: (title, description, opts) =>
    emitToast({ variant: "info", title, description, ...opts }),
  warning: (title, description, opts) =>
    emitToast({ variant: "warning", title, description, ...opts }),
  custom: (opts) => emitToast(opts),
};
