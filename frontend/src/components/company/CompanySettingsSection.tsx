import React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

/**
 * "Coming soon" pill used wherever a design-mock feature has no backend model
 * yet. It marks the surface honestly instead of fabricating data.
 */
export const ComingSoonBadge: React.FC = () => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]">
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {t("company.settings.soon")}
    </span>
  );
};

interface CompanySettingsSectionProps {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  icon: React.ReactNode;
  soon?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared card shell for every settings section: header row + body. */
export const CompanySettingsSection: React.FC<CompanySettingsSectionProps> = ({
  id,
  title,
  titleAr,
  description,
  icon,
  soon = false,
  action,
  children,
}) => {
  return (
    <section
      id={id}
      className="scroll-mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF4FF] text-[#2563EB]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-[#0B1C30]">
                {title}
              </h2>
              {titleAr ? (
                <span className="text-sm font-semibold text-[#565E74]">
                  / {titleAr}
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="mt-0.5 text-xs font-medium text-[#64748B]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {soon ? <ComingSoonBadge /> : null}
          {action}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
};

interface SettingRowProps {
  label: string;
  hint?: string;
  soon?: boolean;
  value?: string;
  children?: React.ReactNode;
}

/** Consistent single-row layout for settings rows inside a section body. */
export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  hint,
  soon = false,
  value,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-b border-slate-100 py-4 last:border-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#0B1C30]">{label}</span>
          {soon ? (
            <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#2563EB]">
              {t("company.settings.soon")}
            </span>
          ) : null}
        </div>
        {hint ? (
          <p className="mt-0.5 text-xs font-medium text-[#64748B]">{hint}</p>
        ) : null}
      </div>
      <div className="shrink-0">
        {value !== undefined ? (
          <span className="text-sm font-semibold text-[#565E74]">{value}</span>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

interface SettingToggleProps {
  enabled?: boolean;
  disabled?: boolean;
  label?: string;
  onChange?: (enabled: boolean) => void;
}

/** Accessible persisted switch with stable thumb direction in RTL layouts. */
export const SettingToggle: React.FC<SettingToggleProps> = ({ enabled = false, disabled = false, label, onChange }) => {
  return (
    <button
      type="button"
      role="switch"
      dir="ltr"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!enabled)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled ? "bg-[#2563EB]" : "bg-[#CBD5E1]"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};
