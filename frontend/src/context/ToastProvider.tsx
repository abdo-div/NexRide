import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { ToastContext, type ToastOptions, type ToastTone } from "./toastContextValue";

interface ToastItem extends ToastOptions {
  id: string;
  tone: ToastTone;
}

const toneStyles: Record<ToastTone, { shell: string; icon: string }> = {
  success: { shell: "border-emerald-200", icon: "bg-emerald-50 text-emerald-600" },
  error: { shell: "border-rose-200", icon: "bg-rose-50 text-rose-600" },
  warning: { shell: "border-amber-200", icon: "bg-amber-50 text-amber-600" },
  info: { shell: "border-blue-200", icon: "bg-blue-50 text-blue-600" },
};

const toneIcons = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = `toast-${++nextId.current}`;
    const toast: ToastItem = { ...options, id, tone: options.tone ?? "info" };
    setToasts((current) => [...current.slice(-3), toast]);
    window.setTimeout(() => dismissToast(id), options.duration ?? 4500);
    return id;
  }, [dismissToast]);

  const api = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-20 z-[250] flex flex-col items-end gap-3 sm:inset-x-auto sm:end-6 sm:w-[24rem]" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];
          const styles = toneStyles[toast.tone];
          return (
            <section key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_20px_60px_-25px_rgba(15,23,42,.45)] ${styles.shell}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${styles.icon}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="text-sm font-black text-slate-900">{toast.title}</h2>
                {toast.description && <p className="mt-1 text-xs leading-5 text-slate-600">{toast.description}</p>}
              </div>
              <button type="button" onClick={() => dismissToast(toast.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
            </section>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
