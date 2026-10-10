import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  Antenna,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Fingerprint,
  Gauge,
  Globe,
  Landmark,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  MonitorSmartphone,
  Phone,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Siren,
  Timer,
  Wrench,
} from "lucide-react";
import { useAdminSettings } from "../../hooks/useAdminSettings";
import { formatLYD } from "../../lib/bookingView";
import type { PlatformSettings } from "../../types/admin";

/**
 * Platform Settings & Governance (/admin/settings). The left rail reads a
 * sticky section navigator + a live operational audit; the right column holds
 * the seven policy sections. Every editable field writes into a local draft
 * that is persisted through PATCH /admin/settings and re-synced from the
 * server snapshot — the registry hash, version counter and operator signature
 * come back from the registry itself, so nothing here is fabricated.
 */

const SECTIONS = [
  { id: "general-platform", key: "admin.settings.nav.general", icon: Building2 },
  { id: "booking-escrow", key: "admin.settings.nav.booking", icon: Antenna },
  { id: "commission-payout", key: "admin.settings.nav.commission", icon: Landmark },
  { id: "payment-rails", key: "admin.settings.nav.gateways", icon: CreditCard },
  { id: "telematics-sms", key: "admin.settings.nav.telemetry", icon: Activity },
  { id: "admin-governance", key: "admin.settings.nav.governance", icon: ShieldCheck },
  { id: "danger-zone", key: "admin.settings.nav.danger", icon: Siren },
];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const numberValue = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const humanTime = (iso: string | null, lang: string): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-[#0B1C30]">
      {label}
    </label>
    {children}
    {hint ? <span className="mt-1 block text-xs text-[#565E74]">{hint}</span> : null}
  </div>
);

const TextInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { withIcon?: React.ReactNode }
> = ({ withIcon, className, ...props }) => (
  <div className="flex items-center rounded-xl bg-[#EFF4FF] px-3">
    {withIcon ? <span className="pe-2 text-[#565E74]">{withIcon}</span> : null}
    <input
      {...props}
      className={`w-full bg-transparent py-2 text-sm text-[#0B1C30] outline-none transition-colors focus:bg-transparent focus:ring-0 ${
        className ?? ""
      }`}
    />
  </div>
);

const SelectInput: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { withIcon?: React.ReactNode }
> = ({ withIcon, className, children, ...props }) => (
  <div className="flex items-center rounded-xl bg-[#EFF4FF] px-3">
    {withIcon ? <span className="pe-2 text-[#565E74]">{withIcon}</span> : null}
    <select
      {...props}
      className={`w-full cursor-pointer bg-transparent py-2 text-sm text-[#0B1C30] outline-none focus:ring-0 ${
        className ?? ""
      }`}
    >
      {children}
    </select>
  </div>
);

const Switch: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}> = ({ checked, onChange, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors ${
      checked ? "bg-[#2563EB]" : "bg-[#C3C6D7]"
    }`}
  >
    <span
      className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
        checked ? "translate-x-6" : "translate-x-0"
      }`}
    />
  </button>
);

const SectionShell: React.FC<{
  id: string;
  dotClass?: string;
  title: string;
  chip: string;
  arSubtitle: string;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, dotClass = "bg-[#2563EB]", title, chip, arSubtitle, statusBadge, children }) => (
  <section
    id={id}
    className="scroll-mt-24 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]"
  >
    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
          <h2 className="text-[22px] font-bold tracking-tight text-[#0B1C30]">
            {title}
          </h2>
        </div>
        <p className="mt-0.5 text-sm text-[#565E74]" dir="rtl">
          {arSubtitle}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {statusBadge}
        <span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#2563EB]">
          {chip}
        </span>
      </div>
    </div>
    {children}
  </section>
);

export const AdminSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { settings, registry, gateways, governance, loading, error, saving, reload, save } =
    useAdminSettings();

  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  const [draftVersion, setDraftVersion] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [toastError, setToastError] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [copied, setCopied] = useState(false);

  // Keep the editable draft aligned with the server snapshot: whenever a new
  // registry version arrives (initial load or a successful save/reset) the
  // draft is re-seeded. During pure editing the version is unchanged, so the
  // draft stays local until the operator saves.
  if (settings && draftVersion !== settings.version) {
    setDraftVersion(settings.version);
    setDraft(clone(settings));
  }

  const dirty = useMemo(() => {
    if (!settings || !draft) return false;
    return JSON.stringify(settings) !== JSON.stringify(draft);
  }, [settings, draft]);

  const showToast = (message: string, isError = false) => {
    setToast(message);
    setToastError(isError);
    window.setTimeout(() => setToast(""), 2600);
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      const updated = await save({
        general: draft.general,
        booking: draft.booking,
        commission: draft.commission,
        telemetry: draft.telemetry,
        emergency: draft.emergency,
      });
      if (updated) setDraft(clone(updated));
      showToast(t("admin.settings.toasts.saved"));
    } catch {
      showToast(t("admin.settings.saveError"), true);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t("admin.settings.resetConfirm"))) return;
    try {
      const updated = await save({ reset: true });
      if (updated) setDraft(clone(updated));
      showToast(t("admin.settings.toasts.reset"));
    } catch {
      showToast(t("admin.settings.saveError"), true);
    }
  };

  const handleRevert = () => {
    if (settings) setDraft(clone(settings));
  };

  const handleFreeze = async () => {
    if (!settings) return;
    const next = !settings.emergency.bookingFreeze;
    const confirmText = next
      ? t("admin.settings.danger.freezeConfirm")
      : t("admin.settings.danger.unfreezeConfirm");
    if (!window.confirm(confirmText)) return;
    try {
      const updated = await save({ emergency: { bookingFreeze: next } });
      if (updated) setDraft(clone(updated));
      showToast(
        t(next ? "admin.settings.toasts.lockdown" : "admin.settings.toasts.unfreeze"),
      );
    } catch {
      showToast(t("admin.settings.saveError"), true);
    }
  };

  const handleCopyHash = () => {
    if (!registry?.hash) return;
    void navigator.clipboard?.writeText(registry.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const lastSyncLabel = registry
    ? humanTime(settings?.updatedAt ?? null, i18n.language) ?? t("admin.settings.audit.liveNow")
    : "-";

  const gatewaySummary = gateways?.moamalat
    ? gateways.moamalat.enabled
      ? gateways.moamalat.mode === "production"
        ? t("admin.settings.gateways.badgeProduction")
        : t("admin.settings.gateways.badgeSandbox")
      : t("admin.settings.gateways.disabled")
    : t("admin.settings.gateways.disabled");

  const moamalat = gateways?.moamalat;
  const auditStatus = gateways?.moamalat?.enabled ? true : false;

  if (loading && !settings) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-[#565E74]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[#2563EB]" />
        <span>{t("admin.settings.retry")}…</span>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-8 text-center">
          <p className="text-sm font-semibold text-[#93000A]">
            {t("admin.settings.loadError")}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            {t("admin.settings.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 max-w-4xl">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#2563EB]">
              {t("admin.settings.command")}
            </span>
            <span className="text-[#C3C6D7]">•</span>
            <span className="uppercase tracking-wider text-[#565E74]">
              {t("admin.settings.grid")}
            </span>
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-[28px] font-extrabold tracking-tight text-[#0B1C30]">
            {t("admin.settings.title")}
            <span className="rounded-lg bg-[#EFF4FF] px-2.5 py-1 text-sm font-bold text-[#2563EB]">
              {t("admin.settings.subtitleChip")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {t("admin.settings.pillLive")}
            </span>
          </h1>
          <p className="mt-1 max-w-4xl text-sm text-[#565E74]">
            {t("admin.settings.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRevert}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#565E74] transition-colors hover:text-[#0B1C30] hover:bg-[#E5EEFF] cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            {t("admin.settings.cancel")}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl bg-[#EFF4FF] px-3.5 py-2 text-sm font-semibold text-[#565E74] transition-colors hover:text-[#0B1C30] hover:bg-[#E5EEFF] cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            {t("admin.settings.resetDefaults")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,74,198,0.28)] transition-all hover:bg-[#004AC6] disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? t("admin.settings.saving") : t("admin.settings.saveChanges")}
          </button>
        </div>
      </div>

      {/* Compliance banner */}
      {registry ? (
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl bg-[#EFF4FF] p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-white">
              <Lock className="h-[18px] w-[18px]" />
            </div>
            <p className="text-sm text-[#0B1C30]">
              <strong className="mr-1">{t("admin.settings.compliance.title")}:</strong>
              {t("admin.settings.compliance.body")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-[#565E74]">
              {t("admin.settings.compliance.registryHash")}
            </span>
            <button
              type="button"
              onClick={handleCopyHash}
              title={registry.hash}
              className="inline-flex items-center gap-1 rounded bg-[#E5EEFF] px-2 py-0.5 font-mono text-[11px] font-bold text-[#2563EB] transition-colors hover:bg-[#DCE9FF] cursor-pointer"
            >
              <span dir="ltr">SHA256:{registry.short}</span>
              <Copy className="h-3 w-3" />
            </button>
            {copied ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("admin.settings.toasts.copied")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left rail */}
        <div className="lg:col-span-3">
          <div className="sticky top-24 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#565E74]">
              {t("admin.settings.nav.sections")}
            </div>
            <nav className="mt-1 space-y-1">
              {SECTIONS.map(({ id, key, icon: Icon }) => {
                const isDanger = id === "danger-zone";
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => scrollTo(id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all cursor-pointer ${
                      isActive
                        ? isDanger
                          ? "bg-[#FFDAD6] font-semibold text-[#93000A]"
                          : "bg-[#2563EB] font-semibold text-white"
                        : isDanger
                          ? "font-semibold text-[#BA1A1A] hover:bg-[#FFE4E1] hover:text-[#93000A]"
                          : "text-[#565E74] hover:bg-[#EFF4FF] hover:text-[#0B1C30]"
                    }`}
                  >
                    <Icon className="h-[19px] w-[19px] shrink-0" />
                    <span className="truncate text-sm">{t(key)}</span>
                  </button>
                );
              })}
            </nav>

            {/* Operational audit */}
            {governance && gateways ? (
              <div className="mt-6 rounded-xl bg-[#EFF4FF] p-3.5">
                <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[#565E74]">
                  <span>{t("admin.settings.audit.title").toUpperCase()}</span>
                  <span className={auditStatus ? "text-emerald-600" : "text-[#BA1A1A]"}>
                    {t("admin.settings.audit.pass").toUpperCase()}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#434655]">
                  {t("admin.settings.audit.subtitle", {
                    approved: governance.approvedPartners,
                    fleet: governance.fleetSize,
                  })}
                </p>
                <div className="mt-3 space-y-1.5 text-[11px] text-[#565E74]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-[#2563EB]" />
                      {t("admin.settings.audit.takeRate")}
                    </span>
                    <span className="font-semibold text-[#0B1C30]">
                      {governance.effectiveTakeRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-[#2563EB]" />
                      {t("admin.settings.audit.onRoad")}
                    </span>
                    <span className="font-semibold text-[#0B1C30]">
                      {governance.activeOnRoad}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 text-[#2563EB]" />
                      {t("admin.settings.audit.pending")}
                    </span>
                    <span className="font-semibold text-[#0B1C30]">
                      {formatLYD(governance.pendingPayouts)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-[#2563EB]" />
                      {t("admin.settings.gateways.moamalatTitle")}
                    </span>
                    <span
                      className={`font-semibold ${
                        auditStatus ? "text-emerald-600" : "text-[#BA1A1A]"
                      }`}
                    >
                      {gatewaySummary}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[#DCE9FF] pt-2 text-[11px] text-[#565E74]">
                  <span>{t("admin.settings.audit.lastSync")}:</span>
                  <span className="font-semibold text-[#0B1C30]">{lastSyncLabel}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-9">
          {draft && settings ? (
            <>
              {/* ---------------------------------------------------------------- */}
              {/* 1. General Platform */}
              {/* ---------------------------------------------------------------- */}
              <SectionShell
                id="general-platform"
                title={t("admin.settings.general.title")}
                chip={t("admin.settings.general.subtitleChip")}
                arSubtitle={t("admin.settings.general.arSubtitle")}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field
                    label={t("admin.settings.general.brandName")}
                    hint={t("admin.settings.general.brandNameHint")}
                  >
                    <TextInput
                      value={draft.general.brandName}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          general: { ...draft.general, brandName: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field
                    label={t("admin.settings.general.tradeEntity")}
                    hint={t("admin.settings.general.tradeEntityHint")}
                  >
                    <TextInput
                      value={draft.general.tradeEntity}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          general: { ...draft.general, tradeEntity: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field
                    label={t("admin.settings.general.supportEmail")}
                    hint={t("admin.settings.general.supportEmailHint")}
                  >
                    <TextInput
                      type="email"
                      withIcon={<Mail className="h-[18px] w-[18px]" />}
                      value={draft.general.supportEmail}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          general: { ...draft.general, supportEmail: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field
                    label={t("admin.settings.general.hotline")}
                    hint={t("admin.settings.general.hotlineHint")}
                  >
                    <TextInput
                      dir="ltr"
                      withIcon={<Phone className="h-[18px] w-[18px]" />}
                      placeholder="+218 …"
                      value={draft.general.hotline}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          general: { ...draft.general, hotline: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field
                    label={t("admin.settings.general.currency")}
                    hint={t("admin.settings.general.currencyHint")}
                  >
                    <div className="flex items-center justify-between rounded-xl bg-[#E5EEFF] px-3 py-2">
                      <span className="text-sm font-semibold text-[#0B1C30]" dir="rtl">
                        {t("admin.settings.general.currencyValue")}
                      </span>
                      <span className="rounded bg-[#2563EB] px-2 py-0.5 text-[11px] font-bold text-white">
                        {t("admin.settings.general.currencyLocked")}
                      </span>
                    </div>
                  </Field>
                  <Field
                    label={t("admin.settings.general.country")}
                    hint={t("admin.settings.general.countryHint")}
                  >
                    <div className="flex items-center rounded-xl bg-[#E5EEFF] px-3 py-2">
                      <Globe className="mr-2 h-[18px] w-[18px] text-[#565E74]" />
                      <input
                        disabled
                        value={t("admin.settings.general.countryValue")}
                        className="w-full cursor-not-allowed bg-transparent text-sm text-[#0B1C30] outline-none"
                      />
                    </div>
                  </Field>
                  <Field label={t("admin.settings.general.timezone")}>
                    <SelectInput
                      withIcon={<Clock className="h-[18px] w-[18px]" />}
                      value={draft.general.timezone}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          general: { ...draft.general, timezone: e.target.value },
                        })
                      }
                    >
                      {["Africa/Tripoli", "Africa/Cairo", "Europe/Rome"].map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label={t("admin.settings.general.language")}>
                    <SelectInput
                      value={draft.general.language}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          general: {
                            ...draft.general,
                            language: e.target.value as "ar" | "en",
                          },
                        })
                      }
                    >
                      <option value="ar">{t("admin.settings.general.languageAr")}</option>
                      <option value="en">{t("admin.settings.general.languageEn")}</option>
                    </SelectInput>
                  </Field>
                </div>
              </SectionShell>

              {/* ---------------------------------------------------------------- */}
              {/* 2. Booking & Escrow */}
              {/* ---------------------------------------------------------------- */}
              <SectionShell
                id="booking-escrow"
                title={t("admin.settings.booking.title")}
                chip={t("admin.settings.booking.subtitleChip")}
                arSubtitle={t("admin.settings.booking.arSubtitle")}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-[#EFF4FF] p-4">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                      {t("admin.settings.booking.freeCancel")}
                    </span>
                    <div className="mt-1 text-[22px] font-bold text-[#0B1C30]">
                      <span className="mr-1">
                        {t("admin.settings.booking.optCancel", {
                          h: draft.booking.freeCancellationHours,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#565E74]">
                      {t("admin.settings.booking.freeCancelHint")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#EFF4FF] p-4">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                      {t("admin.settings.booking.latePenalty")}
                    </span>
                    <div className="mt-1 text-[22px] font-bold text-[#0B1C30]">
                      <span className="mr-1">
                        {t("admin.settings.booking.optPenalty", {
                          p: draft.booking.latePenaltyPct,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#565E74]">
                      {t("admin.settings.booking.latePenaltyHint")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#EFF4FF] p-4">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#565E74]">
                      {t("admin.settings.booking.reservationExpiry")}
                    </span>
                    <div className="mt-1 text-[22px] font-bold text-[#2563EB]">
                      <span className="mr-1">
                        {t("admin.settings.booking.optReservation", {
                          m: draft.booking.reservationExpiryMinutes,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#565E74]">
                      {t("admin.settings.booking.reservationExpiryHint")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex flex-col justify-between gap-3 rounded-xl bg-[#EFF4FF] p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <Timer className="text-[22px] text-[#2563EB]" />
                      <div>
                        <div className="text-sm font-semibold text-[#0B1C30]">
                          {t("admin.settings.booking.freeCancel")}
                        </div>
                        <div className="text-xs text-[#565E74]">
                          {t("admin.settings.booking.freeCancelHint")}
                        </div>
                      </div>
                    </div>
                    <SelectInput
                      value={draft.booking.freeCancellationHours}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          booking: {
                            ...draft.booking,
                            freeCancellationHours: Number(e.target.value),
                          },
                        })
                      }
                    >
                      {[12, 24, 48].map((h) => (
                        <option key={h} value={h}>
                          {t("admin.settings.booking.optCancel", { h })}
                        </option>
                      ))}
                    </SelectInput>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-xl bg-[#EFF4FF] p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <Lock className="text-[22px] text-[#BA1A1A]" />
                      <div>
                        <div className="text-sm font-semibold text-[#0B1C30]">
                          {t("admin.settings.booking.latePenalty")}
                        </div>
                        <div className="text-xs text-[#565E74]">
                          {t("admin.settings.booking.latePenaltyHint")}
                        </div>
                      </div>
                    </div>
                    <SelectInput
                      value={draft.booking.latePenaltyPct}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          booking: {
                            ...draft.booking,
                            latePenaltyPct: Number(e.target.value),
                          },
                        })
                      }
                    >
                      {[25, 50, 100].map((p) => (
                        <option key={p} value={p}>
                          {t("admin.settings.booking.optPenalty", { p })}
                        </option>
                      ))}
                    </SelectInput>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-xl bg-[#EFF4FF] p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-[22px] text-emerald-600" />
                      <div>
                        <div className="text-sm font-semibold text-[#0B1C30]">
                          {t("admin.settings.booking.escrowRelease")}
                        </div>
                        <div className="text-xs text-[#565E74]">
                          {t("admin.settings.booking.escrowReleaseHint")}
                        </div>
                      </div>
                    </div>
                    <SelectInput
                      value={draft.booking.escrowReleaseHours}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          booking: {
                            ...draft.booking,
                            escrowReleaseHours: Number(e.target.value),
                          },
                        })
                      }
                    >
                      {[12, 24, 48].map((h) => (
                        <option key={h} value={h}>
                          {t("admin.settings.booking.optEscrow", { h })}
                        </option>
                      ))}
                    </SelectInput>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-xl bg-[#EFF4FF] p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <HourglassIcon className="text-[22px] text-amber-600" />
                      <div>
                        <div className="text-sm font-semibold text-[#0B1C30]">
                          {t("admin.settings.booking.reservationExpiry")}
                        </div>
                        <div className="text-xs text-[#565E74]">
                          {t("admin.settings.booking.reservationExpiryHint")}
                        </div>
                      </div>
                    </div>
                    <SelectInput
                      value={draft.booking.reservationExpiryMinutes}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          booking: {
                            ...draft.booking,
                            reservationExpiryMinutes: Number(e.target.value),
                          },
                        })
                      }
                    >
                      {[10, 30, 60, 120].map((m) => (
                        <option key={m} value={m}>
                          {t("admin.settings.booking.optReservation", { m })}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                </div>
              </SectionShell>

              {/* ---------------------------------------------------------------- */}
              {/* 3. Commission & Payout */}
              {/* ---------------------------------------------------------------- */}
              <SectionShell
                id="commission-payout"
                title={t("admin.settings.commission.title")}
                chip={t("admin.settings.commission.subtitleChip")}
                arSubtitle={t("admin.settings.commission.arSubtitle")}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col justify-between rounded-xl bg-[#EFF4FF] p-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#0B1C30]">
                          {t("admin.settings.commission.standardRate")}
                        </span>
                        <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-xs font-bold text-white">
                          {t("admin.settings.commission.standardRateBadge")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#565E74]">
                        {t("admin.settings.commission.standardRateHint")}
                      </p>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="40"
                        value={numberValue(draft.commission.standardRatePct)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            commission: {
                              ...draft.commission,
                              standardRatePct: numberValue(e.target.value),
                            },
                          })
                        }
                        className="w-20 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-center text-[22px] font-extrabold text-[#2563EB] outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                      <span className="text-lg font-bold text-[#0B1C30]">%</span>
                      <span className="ml-2 text-xs text-[#565E74]">
                        {t("admin.settings.commission.standardRateNote")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl bg-[#EFF4FF] p-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#0B1C30]">
                          {t("admin.settings.commission.effectiveRate")}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                          {t("admin.settings.audit.pass")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#565E74]">
                        {t("admin.settings.commission.effectiveRateHint")}
                      </p>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-[22px] font-extrabold text-amber-600">
                        {governance?.effectiveTakeRate.toFixed(1) ?? "—"}
                      </span>
                      <span className="text-lg font-bold text-[#0B1C30]">%</span>
                      <span className="ml-2 text-xs text-[#565E74]">
                        {t("admin.settings.commission.effectiveRateNote")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                  <div className="flex flex-col gap-1 rounded-xl bg-[#EFF4FF] p-3">
                    <span className="uppercase font-semibold text-[#565E74]">
                      {t("admin.settings.commission.payoutSchedule")}
                    </span>
                    <input
                      value={draft.commission.payoutSchedule}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          commission: {
                            ...draft.commission,
                            payoutSchedule: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-sm font-bold text-[#0B1C30] outline-none"
                    />
                    <span className="text-[#565E74]">
                      {t("admin.settings.commission.batchTime")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl bg-[#EFF4FF] p-3">
                    <span className="uppercase font-semibold text-[#565E74]">
                      {t("admin.settings.commission.minThreshold")}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={numberValue(draft.commission.minPayoutThreshold)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          commission: {
                            ...draft.commission,
                            minPayoutThreshold: numberValue(e.target.value),
                          },
                        })
                      }
                      className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-sm font-bold text-[#0B1C30] outline-none"
                    />
                    <span className="text-[#565E74]">
                      {t("admin.settings.commission.rollover")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl bg-[#EFF4FF] p-3">
                    <span className="uppercase font-semibold text-[#565E74]">
                      {t("admin.settings.commission.clearingBank")}
                    </span>
                    <input
                      value={draft.commission.clearingBank}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          commission: {
                            ...draft.commission,
                            clearingBank: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-sm font-bold text-[#0B1C30] outline-none"
                    />
                    <span className="text-[#565E74]">
                      <span dir="ltr">RTGS</span> interbank
                    </span>
                  </div>
                </div>
              </SectionShell>

              {/* ---------------------------------------------------------------- */}
              {/* 4. Payment Gateways */}
              {/* ---------------------------------------------------------------- */}
              <SectionShell
                id="payment-rails"
                title={t("admin.settings.gateways.title")}
                chip={t("admin.settings.gateways.subtitleChip")}
                arSubtitle={t("admin.settings.gateways.arSubtitle")}
                statusBadge={
                  moamalat?.enabled ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        moamalat.mode === "production"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          moamalat.mode === "production"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {gatewaySummary}
                    </span>
                  ) : undefined
                }
              >
                <div className="space-y-4">
                  {/* Moamalat */}
                  <div className="rounded-xl bg-[#EFF4FF] p-4">
                    <div className="flex flex-col justify-between gap-3 pb-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xs font-black text-[#2563EB] shadow-sm">
                          MOAM
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#0B1C30]">
                              {t("admin.settings.gateways.moamalatTitle")}
                            </h3>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                moamalat?.mode === "production"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {gatewaySummary}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#565E74]">
                            {t("admin.settings.gateways.moamalatSubtitle")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#565E74]">
                        {t("admin.settings.gateways.mode")}:
                        <span
                          className={`rounded-full px-2.5 py-1 font-bold ${
                            moamalat?.enabled
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-[#E5EEFF] text-[#565E74]"
                          }`}
                        >
                          {moamalat?.env || t("admin.settings.gateways.disabled")}
                        </span>
                      </div>
                    </div>
                    {moamalat?.enabled ? (
                      <div className="grid grid-cols-1 gap-3 pt-1 text-xs md:grid-cols-2">
                        <div>
                          <span className="mb-1 block font-medium text-[#565E74]">
                            {t("admin.settings.gateways.merchantId")}
                          </span>
                          <div className="rounded-lg bg-white px-3 py-2 font-mono font-semibold text-[#0B1C30]" dir="ltr">
                            {moamalat.merchantIdMasked ?? "—"}
                          </div>
                        </div>
                        <div>
                          <span className="mb-1 block font-medium text-[#565E74]">
                            {t("admin.settings.gateways.terminalId")}
                          </span>
                          <div className="rounded-lg bg-white px-3 py-2 font-mono font-semibold text-[#0B1C30]" dir="ltr">
                            {moamalat.terminalIdMasked ?? "—"}
                          </div>
                        </div>
                        <p className="text-xs text-[#565E74] md:col-span-2">
                          {t("admin.settings.gateways.modeHint")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#BA1A1A]">
                        {t("admin.settings.gateways.unset")}
                      </p>
                    )}
                  </div>

                  {/* Sadad */}
                  <div className="rounded-xl bg-[#EFF4FF] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xs font-black text-amber-700 shadow-sm">
                        SADAD
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0B1C30]">
                            {t("admin.settings.gateways.sadadTitle")}
                          </h3>
                          <span className="rounded bg-[#E5EEFF] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#565E74]">
                            {t("admin.settings.gateways.disabled")}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#565E74]">
                          {t("admin.settings.gateways.sadadSubtitle")}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-[#565E74]">
                      {t("admin.settings.gateways.sadadNote")}
                    </p>
                  </div>

                  {/* Tadawul */}
                  <div className="rounded-xl bg-[#EFF4FF] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xs font-black text-[#565E74] shadow-sm">
                          TDWL
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#0B1C30]">
                              {t("admin.settings.gateways.tadawulTitle")}
                            </h3>
                            <span className="rounded bg-[#E5EEFF] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#565E74]">
                              {t("admin.settings.gateways.disabled")}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#565E74]">
                            {t("admin.settings.gateways.tadawulSubtitle")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-[#565E74]">
                      {t("admin.settings.gateways.tadawulNote")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#E5EEFF] p-3 text-xs text-[#565E74]">
                  <Lock className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#2563EB]" />
                  <span>{t("admin.settings.gateways.complianceNote")}</span>
                </div>
              </SectionShell>

              {/* ---------------------------------------------------------------- */}
              {/* 5. Telematics & SMS */}
              {/* ---------------------------------------------------------------- */}
              <SectionShell
                id="telematics-sms"
                title={t("admin.settings.telemetry.title")}
                chip={t("admin.settings.telemetry.subtitleChip")}
                arSubtitle={t("admin.settings.telemetry.arSubtitle")}
              >
                <div className="space-y-3">
                  <ToggleRow
                    icon={<Antenna className="text-[22px] text-[#2563EB]" />}
                    title={t("admin.settings.telemetry.smsTitle")}
                    hint={t("admin.settings.telemetry.smsHint")}
                    checked={draft.telemetry.smsDispatchEnabled}
                    onChange={(next) =>
                      setDraft({
                        ...draft,
                        telemetry: { ...draft.telemetry, smsDispatchEnabled: next },
                      })
                    }
                    ariaLabel={t("admin.settings.telemetry.smsTitle")}
                  />
                  <ToggleRow
                    icon={<Wrench className="text-[22px] text-amber-600" />}
                    title={t("admin.settings.telemetry.maintenanceTitle")}
                    hint={t("admin.settings.telemetry.maintenanceHint")}
                    checked={draft.telemetry.maintenanceAlertsEnabled}
                    onChange={(next) =>
                      setDraft({
                        ...draft,
                        telemetry: {
                          ...draft.telemetry,
                          maintenanceAlertsEnabled: next,
                        },
                      })
                    }
                    ariaLabel={t("admin.settings.telemetry.maintenanceTitle")}
                  />
                  <ToggleRow
                    icon={<BellIcon className="text-[22px] text-[#2563EB]" />}
                    title={t("admin.settings.telemetry.escalationTitle")}
                    hint={t("admin.settings.telemetry.escalationHint")}
                    checked={draft.telemetry.settlementEscalationEnabled}
                    onChange={(next) =>
                      setDraft({
                        ...draft,
                        telemetry: {
                          ...draft.telemetry,
                          settlementEscalationEnabled: next,
                        },
                      })
                    }
                    ariaLabel={t("admin.settings.telemetry.escalationTitle")}
                  />
                  <ToggleRow
                    icon={<MapPin className="text-[22px] text-[#BA1A1A]" />}
                    title={t("admin.settings.telemetry.geofenceTitle")}
                    hint={t("admin.settings.telemetry.geofenceHint")}
                    checked={draft.telemetry.geofenceEnabled}
                    onChange={(next) =>
                      setDraft({
                        ...draft,
                        telemetry: { ...draft.telemetry, geofenceEnabled: next },
                      })
                    }
                    ariaLabel={t("admin.settings.telemetry.geofenceTitle")}
                  />
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-[#565E74]">
                  <Activity className="h-4 w-4 text-[#2563EB]" />
                  {t("admin.settings.telemetry.note")}
                </p>
              </SectionShell>

              {/* ---------------------------------------------------------------- */}
              {/* 6. Admin Access & 2FA */}
              {/* ---------------------------------------------------------------- */}
              <SectionShell
                id="admin-governance"
                title={t("admin.settings.governance.title")}
                chip={t("admin.settings.governance.subtitleChip")}
                arSubtitle={t("admin.settings.governance.arSubtitle")}
              >
                {/* Admin accounts */}
                <div className="rounded-xl bg-[#EFF4FF] p-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#565E74]">
                    {t("admin.settings.governance.accounts")} (
                    {governance?.admins.length ?? 0})
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {governance?.admins.length ? (
                      governance.admins.map((admin) => {
                        const status = admin.status ?? "ACTIVE";
                        return (
                        <div
                          key={admin._id}
                          className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-sm font-bold text-white">
                            {admin.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold text-[#0B1C30]">
                                {admin.name}
                              </span>
                              <BadgeIcon
                                label={t(
                                  `admin.settings.governance.status${status
                                    .toLowerCase()
                                    .replace(/^./, (c) => c.toUpperCase())}`,
                                )}
                                tone={
                                  status === "ACTIVE"
                                    ? "emerald"
                                    : status === "SUSPENDED"
                                      ? "amber"
                                      : "red"
                                }
                              />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#565E74]">
                              <span className="flex min-w-0 items-center gap-1">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{admin.email}</span>
                              </span>
                              {admin.phoneNumber ? (
                                <span className="flex items-center gap-1" dir="ltr">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  {admin.phoneNumber}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[11px] font-semibold text-[#2563EB]">
                              {t("admin.settings.governance.role")}
                            </span>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-[#565E74]">
                        {t("admin.settings.governance.accounts")} …
                      </p>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-[#565E74]">
                    {t("admin.settings.governance.editNote")}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* 2FA */}
                  <div className="rounded-xl bg-[#EFF4FF] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Fingerprint className="h-5 w-5 text-[#2563EB]" />
                      <span className="text-sm font-bold text-[#0B1C30]">
                        {t("admin.settings.governance.twoFactor.title")}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#565E74]">
                      {t("admin.settings.governance.twoFactor.hint")}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {t("admin.settings.governance.twoFactor.notConfigured")}
                    </div>
                    <p className="mt-2 text-[11px] text-[#565E74]">
                      {t("admin.settings.governance.twoFactor.note")}
                    </p>
                  </div>

                  {/* Current session */}
                  <div className="rounded-xl bg-[#EFF4FF] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MonitorSmartphone className="h-5 w-5 text-[#2563EB]" />
                      <span className="text-sm font-bold text-[#0B1C30]">
                        {t("admin.settings.governance.currentSession")}
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#565E74]">
                      <li className="flex items-center justify-between">
                        <span className="font-medium text-[#0B1C30]">
                          {t("admin.settings.governance.currentBrowser", {
                            browser: governance?.session.browser ?? "-",
                          })}
                        </span>
                        <span className="font-bold text-emerald-700">
                          {t("admin.settings.audit.liveNow").toUpperCase()}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>
                          {t("admin.settings.governance.sessionIp", {
                            ip: governance?.session.ip ?? "-",
                          })}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </SectionShell>

              {/* ---------------------------------------------------------------- */}
              {/* 7. Danger Zone */}
              {/* ---------------------------------------------------------------- */}
              <SectionShell
                id="danger-zone"
                dotClass="bg-[#BA1A1A]"
                title={t("admin.settings.danger.title")}
                chip={t("admin.settings.danger.subtitleChip")}
                arSubtitle={t("admin.settings.danger.arSubtitle")}
              >
                <div className="space-y-4">
                  <div
                    className={`flex flex-col justify-between gap-4 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center ${
                      settings.emergency.bookingFreeze
                        ? "border-[#FECACA] bg-[#FFDAD6]"
                        : "border-[#E2E8F0] bg-white"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-[#BA1A1A]">
                        <Siren className="h-4 w-4" />
                        {t("admin.settings.danger.freezeTitle")}
                      </div>
                      <p className="max-w-2xl text-xs leading-relaxed text-[#565E74]">
                        {t("admin.settings.danger.freezeHint")}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-[#565E74]">
                        <Lock className="h-3.5 w-3.5" />
                        {t("admin.settings.danger.freezeRequires")}
                      </div>
                      {settings.emergency.bookingFreeze ? (
                        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#BA1A1A] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                          <Siren className="h-3 w-3" />
                          {t("admin.settings.danger.freezeActive")}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={handleFreeze}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                        settings.emergency.bookingFreeze
                          ? "bg-white text-[#BA1A1A] hover:bg-[#FEF0F0]"
                          : "bg-[#BA1A1A] text-white hover:bg-[#93000A]"
                      }`}
                    >
                      {settings.emergency.bookingFreeze
                        ? t("admin.settings.danger.clear")
                        : t("admin.settings.danger.initiate")}
                    </button>
                  </div>

                  <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                    <div>
                      <div className="text-sm font-bold text-[#0B1C30]">
                        {t("admin.settings.danger.maintenanceTitle")}
                      </div>
                      <p className="mt-0.5 max-w-2xl text-xs text-[#565E74]">
                        {t("admin.settings.danger.maintenanceHint")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-xs font-bold uppercase ${
                          draft.emergency.maintenanceMode
                            ? "text-amber-700"
                            : "text-[#565E74]"
                        }`}
                      >
                        {draft.emergency.maintenanceMode
                          ? t("admin.settings.danger.on")
                          : t("admin.settings.danger.off")}
                      </span>
                      <Switch
                        checked={draft.emergency.maintenanceMode}
                        onChange={(next) =>
                          setDraft({
                            ...draft,
                            emergency: { ...draft.emergency, maintenanceMode: next },
                          })
                        }
                        ariaLabel={t("admin.settings.danger.maintenanceTitle")}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-[#FEF2F2] p-3 text-xs text-[#565E74]">
                  <span className="font-bold text-[#93000A]">
                    {t("admin.settings.danger.safety")}
                  </span>
                </div>
              </SectionShell>
            </>
          ) : null}
        </div>
      </div>

      {/* Bottom bar */}
      {settings && registry ? (
        <div className="mt-8 flex flex-col justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-[22px] w-[22px] text-emerald-600" />
            <div className="text-xs text-[#565E74]">
              <span className="font-semibold text-[#0B1C30]">
                {t("admin.settings.footer.version", { v: `v${settings.version}` })}
              </span>
              <span className="mx-1.5 text-[#C3C6D7]">•</span>
              {settings.savedBy
                ? t("admin.settings.footer.lastSaved", { who: settings.savedBy })
                : t("admin.settings.footer.noActors")}
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <button
              type="button"
              onClick={handleRevert}
              disabled={!dirty}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#565E74] transition-colors hover:text-[#0B1C30] disabled:opacity-50 cursor-pointer"
            >
              {t("admin.settings.footer.revert")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="rounded-xl bg-[#2563EB] px-5 py-2 text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,74,198,0.25)] transition-all hover:bg-[#004AC6] disabled:opacity-50 cursor-pointer"
            >
              {saving ? t("admin.settings.saving") : t("admin.settings.footer.save")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-[0_12px_32px_-4px_rgba(15,23,42,0.2)] ${
            toastError
              ? "bg-[#BA1A1A] text-white"
              : "bg-[#0B1C30] text-white"
          }`}
        >
          {toastError ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          )}
          {toast}
        </div>
      ) : null}
    </div>
  );
};

const HourglassIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`text-amber-600 ${className ?? ""}`}
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`text-[#2563EB] ${className ?? ""}`}
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const BadgeIcon: React.FC<{ label: string; tone: "emerald" | "amber" | "red" }> = ({
  label,
  tone,
}) => {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-[#FFDAD6] text-[#93000A]",
  };
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${tones[tone]}`}>
      {label}
    </span>
  );
};

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}> = ({ icon, title, hint, checked, onChange, ariaLabel }) => (
  <div className="flex items-center justify-between rounded-xl bg-[#EFF4FF] p-3">
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-[#0B1C30]">{title}</div>
        <div className="mt-0.5 text-xs text-[#565E74]">{hint}</div>
      </div>
    </div>
    <Switch checked={checked} onChange={onChange} ariaLabel={ariaLabel} />
  </div>
);

export default AdminSettingsPage;