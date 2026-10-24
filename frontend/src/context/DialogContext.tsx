import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, MessageSquareText, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DialogContext,
  type DialogOptions,
} from "./dialogContextValue";

interface DialogRequest extends DialogOptions {
  kind: "confirm" | "prompt";
  message: string;
  value: string;
  resolve: (value: boolean | string | null) => void;
}

const messageParts = (message: string, fallbackTitle: string) => {
  const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length > 1
    ? { title: lines[0], description: lines.slice(1).join(" ") }
    : { title: fallbackTitle, description: lines[0] ?? "" };
};

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const dialogOpen = Boolean(dialog);

  const confirm = useCallback(
    (message: string, options: DialogOptions = {}) =>
      new Promise<boolean>((resolve) => {
        setDialog({
          kind: "confirm",
          message,
          value: "",
          tone: options.tone ?? "danger",
          confirmLabel: options.confirmLabel,
          resolve: (value) => resolve(value === true),
        });
      }),
    [],
  );

  const prompt = useCallback(
    (message: string, options: DialogOptions = {}) =>
      new Promise<string | null>((resolve) => {
        setDialog({
          kind: "prompt",
          message,
          value: options.initialValue ?? "",
          tone: options.tone ?? "default",
          confirmLabel: options.confirmLabel,
          placeholder: options.placeholder,
          resolve: (value) => resolve(typeof value === "string" ? value : null),
        });
      }),
    [],
  );

  const dismiss = useCallback(() => {
    setDialog((current) => {
      current?.resolve(current.kind === "confirm" ? false : null);
      return null;
    });
  }, []);

  const accept = useCallback(() => {
    setDialog((current) => {
      if (!current) return null;
      current.resolve(current.kind === "confirm" ? true : current.value.trim());
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab") return;

      const modal = dialogRef.current;
      if (!modal) return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        modal.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || !modal.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [dialogOpen, dismiss]);

  const api = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);
  const parts = dialog
    ? messageParts(
        dialog.message,
        t(dialog.kind === "prompt" ? "dialogs.inputTitle" : "dialogs.confirmTitle"),
      )
    : null;
  const danger = dialog?.tone === "danger";

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && parts && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-[#071426]/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismiss();
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby={parts.description ? "app-dialog-description" : undefined}
            tabIndex={-1}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_30px_90px_rgba(2,12,27,0.35)]"
          >
            <div className="flex items-start gap-4 p-6 pb-4">
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
                  danger ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-700"
                }`}
              >
                {dialog.kind === "prompt" ? (
                  <MessageSquareText className="size-6" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-6" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id="app-dialog-title" className="text-lg font-black text-[#0B1C30]">
                  {parts.title}
                </h2>
                {parts.description && (
                  <p id="app-dialog-description" className="mt-1.5 text-sm leading-6 text-slate-600">
                    {parts.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("dialogs.close")}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            {dialog.kind === "prompt" && (
              <div className="px-6 pb-5">
                <textarea
                  autoFocus
                  aria-label={dialog.placeholder ?? t("dialogs.reasonPlaceholder")}
                  rows={4}
                  value={dialog.value}
                  placeholder={dialog.placeholder ?? t("dialogs.reasonPlaceholder")}
                  onChange={(event) =>
                    setDialog((current) =>
                      current ? { ...current, value: event.target.value } : current,
                    )
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0B1C30] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                {t("dialogs.cancel")}
              </button>
              <button
                type="button"
                autoFocus={dialog.kind === "confirm"}
                onClick={accept}
                className={`rounded-xl px-6 py-2.5 text-sm font-black text-white shadow-sm transition ${
                  danger
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#142B4A] hover:bg-[#0D2039]"
                }`}
              >
                {dialog.confirmLabel ?? t(dialog.kind === "prompt" ? "dialogs.submit" : "dialogs.confirm")}
              </button>
            </div>
          </section>
        </div>
      )}
    </DialogContext.Provider>
  );
};
