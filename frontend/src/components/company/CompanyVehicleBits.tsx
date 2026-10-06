import React from "react";
import type { LucideIcon } from "lucide-react";

export interface SectionCardProps {
  icon: LucideIcon;
  iconStyle?: string;
  title: string;
  titleAr: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** The recurring white card shell used by every dossier section. */
export const SectionCard: React.FC<SectionCardProps> = ({
  icon: Icon,
  iconStyle = "bg-[#E5EEFF] text-[#2563EB]",
  title,
  titleAr,
  subtitle,
  action,
  children,
  className = "",
}) => (
  <section className={`rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm ${className}`}>
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconStyle}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-[#0B1C30]">{title}</h2>
          <p className="text-xs text-[#9AA4B5]">{titleAr}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-[#9AA4B5]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export interface PillProps {
  children: React.ReactNode;
  tone: string;
  className?: string;
}

/** Tiny rounded status/payment pill. */
export const Pill: React.FC<PillProps> = ({ children, tone, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone} ${className}`}
  >
    {children}
  </span>
);