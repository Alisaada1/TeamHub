import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { subscribeToToasts } from "./toastStore";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToToasts((t) => {
      const id = nextId++;
      const toast = { id, duration: 4000, variant: "info", ...t };
      setToasts((cur) => [...cur, toast]);
      if (toast.duration > 0) {
        setTimeout(() => removeToast(id), toast.duration);
      }
      return id;
    });
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
