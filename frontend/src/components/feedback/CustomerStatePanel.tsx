import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, RefreshCcw, SearchX } from "lucide-react";
import { Link } from "react-router";

type StateVariant = "error" | "empty" | "filtered";

interface Props {
  variant: StateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  icon?: LucideIcon;
}

const defaults: Record<StateVariant, LucideIcon> = {
  error: AlertTriangle,
  empty: Inbox,
  filtered: SearchX,
};

export const CustomerStatePanel = ({ variant, title, description, actionLabel, onAction, actionHref, icon: CustomIcon }: Props) => {
  const Icon = CustomIcon ?? defaults[variant];
  const error = variant === "error";
  const actionClass = "mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#142B4A] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#0D2039] hover:shadow-md";
  return (
    <section role={error ? "alert" : "status"} className={`premium-card flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center ${error ? "border-rose-200" : ""}`}>
      <span className={`grid h-16 w-16 place-items-center rounded-2xl ${error ? "bg-rose-50 text-rose-600" : variant === "filtered" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}><Icon className="h-7 w-7" aria-hidden="true" /></span>
      <h2 className="mt-5 text-xl font-black tracking-tight text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {actionLabel && actionHref && <Link to={actionHref} className={actionClass}>{actionLabel}</Link>}
      {actionLabel && onAction && <button type="button" onClick={onAction} className={actionClass}>{error && <RefreshCcw className="h-4 w-4" />}{actionLabel}</button>}
    </section>
  );
};
