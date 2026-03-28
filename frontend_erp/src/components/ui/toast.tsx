"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ─── Simple Toast Implementation ────────────────────────────────

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-xl border bg-background p-4 shadow-lg transition-all animate-in slide-in-from-bottom-5 fade-in-0",
              toast.variant === "success" && "border-emerald-200 bg-emerald-50",
              toast.variant === "destructive" && "border-red-200 bg-red-50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    toast.variant === "success" && "text-emerald-800",
                    toast.variant === "destructive" && "text-red-800"
                  )}
                >
                  {toast.title}
                </p>
                {toast.description && (
                  <p
                    className={cn(
                      "mt-1 text-sm text-muted-foreground",
                      toast.variant === "success" && "text-emerald-600",
                      toast.variant === "destructive" && "text-red-600"
                    )}
                  >
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
