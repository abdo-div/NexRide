import React from "react";
import { Lock } from "lucide-react";

export interface ComingSoonPillProps {
  children: React.ReactNode;
  className?: string;
}

/** Tiny muted "coming soon" pill for fields the record doesn't expose yet. */
export const ComingSoonPill: React.FC<ComingSoonPillProps> = ({
  children,
  className = "",
}) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[10px] font-bold text-[#94A3B8] ${className}`}
  >
    <Lock className="h-3 w-3" aria-hidden="true" />
    {children}
  </span>
);

export interface ReadonlyFieldProps {
  label: string;
  labelAr?: string;
  value?: React.ReactNode;
  hint?: string;
  unit?: string;
  comingSoon?: boolean;
}

/**
 * Read-only form-field clone: shows the real current value of a vehicle
 * attribute (or a muted "coming soon" slot when the record doesn't carry it).
 * Every field renders as a disabled input so the page mirrors the edit form
 * without ever suggesting the value can change.
 */
export const ReadonlyField: React.FC<ReadonlyFieldProps> = ({
  label,
  labelAr,
  value,
  hint,
  unit,
  comingSoon = false,
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-bold text-[#0B1C30] dark:text-white">{label}</label>
      {labelAr && <span className="text-[11px] text-[#9AA4B5]">({labelAr})</span>}
    </div>
    <div
      className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-[#F7F9FC] px-3.5 py-2.5 text-sm ${
        comingSoon
          ? "cursor-not-allowed text-[#9AA4B5] opacity-70"
          : "font-semibold text-[#0B1C30] dark:text-white"
      }`}
    >
      <span className="truncate">{comingSoon ? "—" : (value ?? "—")}</span>
      {unit && <span className="shrink-0 text-xs font-semibold text-[#9AA4B5]">{unit}</span>}
    </div>
    {hint && <span className="text-[11px] text-[#9AA4B5]">{hint}</span>}
  </div>
);

export interface EditSelectOption {
  value: string;
  label: string;
}

export interface EditFieldProps {
  label: string;
  labelAr?: string;
  value: string;
  onChange: (value: string) => void;
  /** text | number | select | textarea */
  type?: "text" | "number" | "select" | "textarea";
  options?: EditSelectOption[];
  unit?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
}

/**
 * The editable form-field clone that mirrors the read-only slot: same skeleton,
 * same labels, but wired to the draft value so changes flow into the save
 * payload. Number/select/textarea variants share the same rounded styling.
 */
export const EditField: React.FC<EditFieldProps> = ({
  label,
  labelAr,
  value,
  onChange,
  type = "text",
  options = [],
  unit,
  hint,
  error,
  placeholder,
  min,
  max,
  maxLength,
  rows = 3,
  disabled = false,
}) => {
  const inputClass = `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#0B1C30] outline-none transition-colors placeholder:text-[#9AA4B5] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 ${
    error ? "border-[#E24A55]" : "border-[#E5E7EB]"
  } ${disabled ? "cursor-not-allowed bg-[#F7F9FC] text-[#9AA4B5] opacity-70" : "hover:border-[#C3C6D7]"} ${
    unit && type !== "select" ? "pr-16" : ""
  }`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-[#0B1C30] dark:text-white">{label}</label>
        {labelAr && <span className="text-[11px] text-[#9AA4B5]">({labelAr})</span>}
      </div>

      {type === "select" ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`${inputClass} cursor-pointer`}
        >
          {!options.some((option) => option.value === "") && (
            <option value="">—</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <div className="relative">
          <input
            type={type}
            inputMode={type === "number" ? "decimal" : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            min={min}
            max={max}
            maxLength={maxLength}
            placeholder={placeholder}
            className={inputClass}
          />
          {unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#9AA4B5]">
              {unit}
            </span>
          )}
        </div>
      )}

      {error ? (
        <span className="text-[11px] font-semibold text-[#DC2626]">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-[#9AA4B5]">{hint}</span>
      ) : null}
    </div>
  );
};