"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/components/ui/icon";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
};

type ToastContextType = {
  showToast: (title: string, options?: { description?: string; type?: ToastType }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let globalToastHandler: ((item: Omit<ToastItem, "id">) => void) | null = null;

export const toast = {
  success: (title: string, description?: string) => {
    globalToastHandler?.({ title, description, type: "success" });
  },
  error: (title: string, description?: string) => {
    globalToastHandler?.({ title, description, type: "error" });
  },
  info: (title: string, description?: string) => {
    globalToastHandler?.({ title, description, type: "info" });
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type = "info" }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  useEffect(() => {
    globalToastHandler = addToast;
    return () => {
      globalToastHandler = null;
    };
  }, [addToast]);

  const value = {
    showToast: (title: string, options?: { description?: string; type?: ToastType }) =>
      addToast({ title, description: options?.description, type: options?.type }),
    success: (title: string, description?: string) => addToast({ title, description, type: "success" }),
    error: (title: string, description?: string) => addToast({ title, description, type: "error" }),
    info: (title: string, description?: string) => addToast({ title, description, type: "info" }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2.5 sm:right-6 sm:bottom-6"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-surface p-4 shadow-[var(--shadow)] transition-all animate-in fade-in slide-in-from-bottom-3 ${
              item.type === "error"
                ? "border-danger/40 text-danger"
                : item.type === "success"
                ? "border-teal/30 text-ink"
                : "border-line text-ink"
            }`}
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                item.type === "error"
                  ? "bg-red-100 text-danger"
                  : item.type === "success"
                  ? "bg-mint text-primary"
                  : "bg-mist text-navy"
              }`}
            >
              <Icon
                name={
                  item.type === "error"
                    ? "alert-triangle"
                    : item.type === "success"
                    ? "check"
                    : "info"
                }
                className="h-4 w-4"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs text-muted leading-relaxed">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="text-muted hover:text-ink -mr-1 -mt-1 p-1 rounded-lg"
              aria-label="Close notification"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: toast.info,
      success: toast.success,
      error: toast.error,
      info: toast.info,
    };
  }
  return ctx;
}

