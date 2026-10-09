import React, { type ReactNode } from "react";

export const TextInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
  className?: string;
}> = ({
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
  name,
  autoComplete,
  inputMode,
  error,
  className = "",
}) => (
  <input
    type={type}
    dir={dir}
    name={name}
    autoComplete={autoComplete}
    inputMode={inputMode}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className={`w-full px-3.5 py-2.5 rounded-xl bg-[#EFF4FF] text-sm text-[#0B1C30] placeholder:text-[#737686] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 transition-shadow ${
      error ? "ring-2 ring-[#BA1A1A]/60" : ""
    } ${className}`}
  />
);

export const SelectInput: React.FC<{
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  error?: string;
}> = ({ value, onChange, children, error }) => (
  <select
    value={String(value)}
    onChange={(event) => onChange(event.target.value)}
    className={`w-full px-3.5 py-2.5 rounded-xl bg-[#EFF4FF] text-sm font-semibold text-[#0B1C30] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 transition-shadow appearance-none cursor-pointer ${
      error ? "ring-2 ring-[#BA1A1A]/60" : ""
    }`}
  >
    {children}
  </select>
);

export const LabeledField: React.FC<{
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}> = ({ label, hint, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[12px] font-bold text-[#434655] uppercase tracking-wider">
      {label}
    </label>
    {children}
    {hint ? (
      <span className="text-[11px] text-[#737686]">{hint}</span>
    ) : null}
    {error ? <span className="text-[11px] font-semibold text-[#BA1A1A]">{error}</span> : null}
  </div>
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors cursor-pointer ${
      checked ? "bg-[#2563EB] justify-end" : "bg-[#D3E4FE] justify-start"
    }`}
  >
    <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
  </button>
);
