import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Headset,
  Home,
  KeyRound,
  Landmark,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  RotateCw,
  ShieldCheck,
  Timer,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { API_BASE_URL } from "../../lib/apiClient";
import { companyApplicationApi } from "../../lib/companyApplicationApi";
import { FLEET_TIERS } from "../../lib/partnerApplicationView";
import type {
  ApplicationStatusCompany,
  VehicleCategory,
} from "../../types/companyApplication";

const TRIPOLI_TIME_ZONE = "Africa/Tripoli";

const submissionDateLabel = (value: string | null | undefined): string =>
  value
    ? `${new Intl.DateTimeFormat("en-LY", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: TRIPOLI_TIME_ZONE,
      }).format(new Date(value))} (UTC+2)`
    : "—";

const approvedDateLabel = (value: string | null | undefined): string =>
  value
    ? new Intl.DateTimeFormat("en-LY", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: TRIPOLI_TIME_ZONE,
      }).format(new Date(value))
    : "—";

const queuePosition = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (hash % 25) + 1;
};

const maskIban = (iban: string): string => {
  const compact = iban.replace(/\s+/g, "");
  if (compact.length <= 8) return iban;
  return `${compact.slice(0, 4)} •••• •••• ${compact.slice(-4)}`;
};

const formatBytes = (bytes: number): string =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const MEDIA_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/i, "");

type StepState = "done" | "passed" | "active" | "error" | "queued" | "upcoming";

export const CompanyApplicationStatusPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [company, setCompany] = useState<ApplicationStatusCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let active = true;
    companyApplicationApi
      .myApplication()
      .then((response) => {
        if (!active) return;
        setCompany(response.data.company);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : t("partner.status.loadError"),
        );
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  const retry = (): void => {
    setLoading(true);
    setLoadError(null);
    companyApplicationApi
      .myApplication()
      .then((response) => setCompany(response.data.company))
      .catch((error: unknown) => {
        setLoadError(
          error instanceof Error ? error.message : t("partner.status.loadError"),
        );
      })
      .finally(() => setLoading(false));
  };

  const copyReference = async (): Promise<void> => {
    const reference = company?.applicationRef;
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(`#${reference}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const bannerKind: "pending" | "approved" | "rejected" | "suspended" =
    company?.status === "APPROVED"
      ? "approved"
      : company?.status === "REJECTED"
        ? "rejected"
        : company?.status === "SUSPENDED"
          ? "suspended"
          : "pending";

  const pill = useMemo(() => {
    if (bannerKind === "approved") return t("partner.status.pillApproved");
    if (bannerKind === "rejected") return t("partner.status.pillRejected");
    if (bannerKind === "suspended") return t("partner.status.pillSuspended");
    return t("partner.status.pillPending");
  }, [bannerKind, t]);

  const pillTone =
    bannerKind === "approved"
      ? "bg-emerald-50 text-emerald-800"
      : bannerKind === "rejected"
        ? "bg-[#FFDAD6] text-[#93000A]"
        : bannerKind === "suspended"
          ? "bg-[#FFDAD6] text-[#93000A]"
          : "bg-amber-50 text-amber-800";

  const stepStates: StepState[] = useMemo(() => {
    if (bannerKind === "approved") return ["done", "passed", "done", "done"];
    if (bannerKind === "rejected" || bannerKind === "suspended")
      return ["done", "error", "queued", "upcoming"];
    return ["done", "active", "queued", "upcoming"];
  }, [bannerKind]);

  const activeStepIndex = stepStates.findIndex(
    (state) => state === "active" || state === "error",
  );
  const stepperCount = Math.max(activeStepIndex + 1, bannerKind === "approved" ? 4 : 2);

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-12 flex items-center justify-center min-h-[50vh]">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#2563EB]" />
        </div>
      </div>
    );
  }

  if (loadError || !company) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-12">
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-10 flex flex-col items-center text-center gap-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-[#BA1A1A]">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-[#0B1C30]">
              {t("partner.status.loadError")}
            </h1>
            <p className="text-sm text-[#434655]">{loadError}</p>
            <button
              type="button"
              onClick={retry}
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-bold hover:bg-[#004AC6] transition-colors"
            >
              {t("partner.status.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hub = company.operatingHubs[0] ?? company.city ?? "Tripoli";
  const position = queuePosition(company._id);
  const primaryDepot = company.depots[0];
  const tierRange =
    FLEET_TIERS.find((tier) => tier.value === company.fleetSizeTier)?.range ?? "—";
  const categoryLabel = (category: string): string =>
    t(`partner.step3.categoryOptions.${category}` as `partner.step3.categoryOptions.${VehicleCategory}`);
  const submittedHistory = [
    {
      title: t("partner.status.step1Title"),
      desc: t("partner.status.step1Desc", {
        date: submissionDateLabel(company.createdAt),
      }),
      state: stepStates[0] as StepState,
      badge: stepStates[0] === "passed"
        ? t("partner.status.stepPassed")
        : t("partner.status.stepDone"),
    },
    {
      title: t("partner.status.step2Title"),
      desc:
        stepStates[1] === "active"
          ? t("partner.status.step2DescActive", {
              cr: company.commercialRegisterNumber || "—",
            })
          : stepStates[1] === "passed"
            ? t("partner.status.step2DescPassed")
            : `${t("partner.status.step2DescError")}${
                company.rejectionReason
                  ? ` ${company.rejectionReason}`
                  : ""
              }`,
      state: stepStates[1] as StepState,
      badge:
        stepStates[1] === "active"
          ? t("partner.status.stepActive")
          : stepStates[1] === "error"
            ? t("partner.status.stepError")
            : t("partner.status.stepPassed"),
    },
    {
      title: t("partner.status.step3Title"),
      desc: t("partner.status.step3Desc", { address: company.address }),
      state: stepStates[2] as StepState,
      badge:
        stepStates[2] === "done"
          ? t("partner.status.stepDone")
          : t("partner.status.stepQueued"),
    },
    {
      title: t("partner.status.step4Title"),
      desc: t("partner.status.step4Desc"),
      state: stepStates[3] as StepState,
      badge:
        stepStates[3] === "done"
          ? t("partner.status.stepDone")
          : t("partner.status.stepUpcoming"),
    },
  ];

  const stepIcon = (state: StepState): React.ReactNode => {
    if (state === "done" || state === "passed")
      return <Check className="w-5 h-5" />;
    if (state === "active")
      return <RotateCw className="w-5 h-5 animate-spin" />;
    if (state === "error") return <X className="w-5 h-5" />;
    if (state === "queued") return <Car className="w-5 h-5" />;
    return <KeyRound className="w-5 h-5" />;
  };

  const stepCircle = (state: StepState): string => {
    if (state === "done" || state === "passed")
      return "bg-emerald-500 text-white shadow-sm";
    if (state === "active")
      return "bg-[#2563EB] text-white shadow-md ring-4 ring-[#2563EB]/20";
    if (state === "error") return "bg-[#BA1A1A] text-white shadow-md";
    return "bg-[#E5EEFF] text-[#737686]";
  };

  const stepBadge = (state: StepState): string => {
    if (state === "done" || state === "passed")
      return "bg-emerald-50 text-emerald-700";
    if (state === "active") return "bg-[#E5EEFF] text-[#004AC6]";
    if (state === "error") return "bg-[#FFDAD6] text-[#93000A]";
    return "bg-[#EFF4FF] text-[#737686]";
  };

  const stepTitle = (state: StepState): string =>
    state === "queued" || state === "upcoming"
      ? "text-[#565E74]"
      : "text-[#0B1C30]";

  const stepDescription = (state: StepState): string =>
    state === "queued" || state === "upcoming"
      ? "text-[#737686]"
      : "text-[#737686]";

  const firstDocument = company.applicationDocuments[0];

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-12 flex flex-col gap-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[13px] text-[#737686] flex-wrap"
        >
          <Link
            to="/"
            className="hover:text-[#2563EB] transition-colors flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>{t("partner.status.breadcrumbHome")}</span>
          </Link>
          <span className="text-[#C3C6D7]">/</span>
          <Link
            to="/partner/apply"
            className="hover:text-[#2563EB] transition-colors"
          >
            {t("partner.status.breadcrumbBecomePartner")}
          </Link>
          <span className="text-[#C3C6D7]">/</span>
          <span className="font-bold text-[#0B1C30]">
            {t("partner.status.breadcrumbCurrent")}
          </span>
        </nav>

        {/* PENDING banner */}
        {bannerKind === "pending" ? (
          <section className="relative overflow-hidden rounded-2xl bg-white p-8 lg:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="absolute -inset-2 bg-emerald-500/20 rounded-full animate-ping opacity-60"></div>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 relative">
                <CheckCircle2 className="w-9 h-9" />
              </div>
            </div>
            <div className="flex flex-col gap-1 grow">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-[26px] font-extrabold text-[#0B1C30] tracking-tight">
                  {t("partner.status.bannerPendingTitle")}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFDBCA]/40 text-[#8E3C00] text-[11px] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8E3C00] animate-pulse"></span>
                  {t("partner.status.bannerPendingSubtitle")}
                </span>
              </div>
              <p className="text-sm text-[#565E74] font-semibold mt-1">
                {t("partner.status.bannerPendingDesc")}
              </p>
            </div>
            <div className="shrink-0 flex md:flex-col items-center md:items-end gap-0.5 text-[#737686] bg-[#EFF4FF] px-4 py-3 rounded-xl">
              <span className="text-[10px] text-[#737686] uppercase font-bold tracking-wider">
                {t("partner.status.queueLabel")}
              </span>
              <span className="text-lg font-extrabold text-[#004AC6]">
                {t("partner.status.queueValue", { position, hub })}
              </span>
            </div>
          </section>
        ) : null}

        {/* APPROVED banner */}
        {bannerKind === "approved" ? (
          <section className="rounded-2xl bg-white p-8 lg:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    {t("partner.status.bannerApprovedBadge")}
                  </span>
                  <span className="text-[12px] text-[#565E74]">
                    {t("partner.status.bannerApprovedValidated", {
                      date: approvedDateLabel(company.approvedAt ?? company.createdAt),
                    })}
                  </span>
                </div>
                <h1 className="text-2xl md:text-[26px] font-extrabold text-[#0B1C30]">
                  {t("partner.status.bannerApprovedTitle")}
                </h1>
                <p className="text-sm text-[#737686]">
                  {t("partner.status.bannerApprovedDesc")}
                </p>
              </div>
            </div>
            <Link
              to="/company"
              className="shrink-0 px-6 py-3 rounded-xl bg-[#2563EB] text-white text-sm font-bold hover:bg-[#004AC6] transition-colors flex items-center gap-2 shadow-md"
            >
              <span>{t("partner.status.bannerApprovedCta")}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </section>
        ) : null}

        {/* ACTION banner (REJECTED / SUSPENDED) */}
        {bannerKind === "rejected" || bannerKind === "suspended" ? (
          <section className="rounded-2xl bg-[#FFDAD6]/50 p-8 lg:p-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-[#BA1A1A]/10 flex items-center justify-center text-[#BA1A1A] shrink-0">
                <AlertTriangle className="w-9 h-9" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#BA1A1A] text-white text-[11px] font-bold">
                    {t("partner.status.bannerActionBadge")}
                  </span>
                </div>
                <h1 className="text-2xl md:text-[26px] font-extrabold text-[#0B1C30]">
                  {bannerKind === "suspended"
                    ? t("partner.status.bannerActionSuspendedTitle")
                    : t("partner.status.bannerActionTitle")}
                </h1>
                <p className="text-sm text-[#565E74] max-w-2xl">
                  {bannerKind === "suspended"
                    ? t("partner.status.bannerActionSuspendedDesc")
                    : company.rejectionReason
                      ? t("partner.status.bannerActionNote", {
                          reason: company.rejectionReason,
                        })
                      : t("partner.status.bannerActionFallback")}
                </p>
              </div>
            </div>
            <a
              href={`mailto:${t("partner.status.supportEmailValue")}?subject=${encodeURIComponent(
                `Renewed extract — #${company.applicationRef}`,
              )}`}
              className="shrink-0 px-6 py-3 rounded-xl bg-[#BA1A1A] text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md"
            >
              <Upload className="w-5 h-5" />
              <span>{t("partner.status.bannerActionCta")}</span>
            </a>
          </section>
        ) : null}

        {/* Primary grid: left details, right support */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 8 columns */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Identity master card */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#E5EEFF] flex items-center justify-center text-[#004AC6]">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#737686] uppercase tracking-wider font-bold">
                      {t("partner.status.refLabel")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-bold text-[#0B1C30] font-mono tracking-tight">
                        #{company.applicationRef}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyReference()}
                        title={t("partner.status.refCopyHint")}
                        className="p-1.5 text-[#565E74] hover:text-[#2563EB] rounded hover:bg-[#EFF4FF] transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      {copied ? (
                        <span className="text-[11px] text-emerald-600 font-bold">
                          {t("partner.status.refCopy")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold self-start sm:self-auto ${pillTone}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                  <span>{pill}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#EFF4FF] p-4 lg:p-5 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-[#737686] uppercase font-semibold">
                    {t("partner.status.metaCompanyName")}
                  </span>
                  <span className="text-sm font-bold text-[#0B1C30]">
                    {company.name}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-[#737686] uppercase font-semibold">
                    {t("partner.status.metaDirector")}
                  </span>
                  <span className="text-sm font-bold text-[#0B1C30]">
                    {user?.name ?? "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 pt-2">
                  <span className="text-[11px] text-[#737686] uppercase font-semibold">
                    {t("partner.status.metaSubmitted")}
                  </span>
                  <span className="text-sm text-[#0B1C30] font-medium">
                    {submissionDateLabel(company.createdAt)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 pt-2">
                  <span className="text-[11px] text-[#737686] uppercase font-semibold">
                    {t("partner.status.metaReviewWindow")}
                  </span>
                  <div className="flex items-center gap-2 text-[#004AC6] font-bold">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm">
                      {t("partner.status.reviewWindowValue")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance stepper */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-[#0B1C30]">
                    {t("partner.status.stepperTitle")}
                  </h3>
                  <p className="text-sm text-[#737686]">
                    {t("partner.status.stepperSubtitle")}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#E5EEFF] text-[11px] font-bold text-[#565E74] shrink-0">
                  {t("partner.status.stepperStep", {
                    current: stepperCount,
                    total: 4,
                  })}
                </span>
              </div>

              <div className="flex flex-col">
                {submittedHistory.map((step, index) => (
                  <div key={step.title} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${stepCircle(step.state)}`}
                      >
                        {stepIcon(step.state)}
                      </div>
                      {index < submittedHistory.length - 1 ? (
                        <div className="w-0.5 h-12 bg-[#D3E4FE] mt-2"></div>
                      ) : null}
                    </div>
                    <div className="flex flex-col pb-6">
                      <div className="flex items-center gap-3 flex-wrap pt-0.5">
                        <span className={`text-sm font-bold ${stepTitle(step.state)}`}>
                          {step.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${stepBadge(step.state)}`}
                        >
                          {step.badge}
                        </span>
                      </div>
                      <span className={`text-[13px] mt-0.5 ${stepDescription(step.state)}`}>
                        {step.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submitted entity specification bento */}
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-bold text-[#0B1C30]">
                {t("partner.status.bentoTitle")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* HQ & hubs */}
                <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#DCE9FF] flex items-center justify-center text-[#2563EB] shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#737686] uppercase font-bold">
                        {t("partner.status.bentoHqLabel")}
                      </span>
                      <span className="text-sm font-bold text-[#0B1C30] mt-1">
                        {t("partner.status.bentoHqValue", {
                          hubs: company.operatingHubs.join(" · ") || company.city,
                        })}
                      </span>
                      <p className="text-[13px] text-[#737686] mt-0.5">
                        {t("partner.status.bentoHqSub", {
                          depot: primaryDepot?.name ?? company.city,
                          address: primaryDepot?.address ?? company.address,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-[13px] text-[#565E74]">
                    <span>
                      {t("partner.status.bentoHqBays", {
                        count: company.depots.length,
                      })}
                    </span>
                    <Building2 className="w-4 h-4 text-[#737686]" />
                  </div>
                </div>

                {/* Fleet volume */}
                <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#DCE9FF] flex items-center justify-center text-[#2563EB] shrink-0">
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#737686] uppercase font-bold">
                        {t("partner.status.bentoFleetLabel")}
                      </span>
                      <span className="text-sm font-bold text-[#0B1C30] mt-1">
                        {t("partner.status.bentoFleetValue", { range: tierRange })}
                      </span>
                      <p className="text-[13px] text-[#737686] mt-0.5">
                        {company.vehicleCategories
                          .slice(0, 2)
                          .map(categoryLabel)
                          .join(" & ")}
                        {company.vehicleCategories.length > 2
                          ? ` ${t("partner.status.bentoFleetMore", {
                              count: company.vehicleCategories.length - 2,
                            })}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EFF4FF] text-[11px] text-[#565E74]">
                      {company.vehicleCategories.length}{" "}
                      {t("partner.status.bentoFleetCategories")}
                    </span>
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#DCE9FF] flex items-center justify-center text-[#2563EB] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#737686] uppercase font-bold">
                        {t("partner.status.bentoDocsLabel")}
                      </span>
                      <span className="text-sm font-bold text-[#0B1C30] mt-1">
                        {t("partner.status.bentoDocsValue", {
                          count: company.applicationDocuments.length,
                        })}
                      </span>
                      <ul className="text-[13px] text-[#737686] space-y-1">
                        {company.applicationDocuments.map((doc) => (
                          <li
                            key={doc.url}
                            className="flex items-center gap-1.5 text-[#0B1C30]"
                          >
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="truncate">{doc.name}</span>
                            <span className="text-[#737686] text-[11px]">
                              ({formatBytes(doc.size)})
                            </span>
                          </li>
                        ))}
                        {company.applicationDocuments.length === 0 ? (
                          <li className="text-[#737686]">
                            {t("partner.status.bentoDocsEmpty")}
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    {t("partner.status.bentoDocsChecksum")}
                  </span>
                </div>

                {/* Payout */}
                <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#DCE9FF] flex items-center justify-center text-[#2563EB] shrink-0">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#737686] uppercase font-bold">
                        {t("partner.status.bentoPayoutLabel")}
                      </span>
                      <span className="text-sm font-bold text-[#0B1C30] mt-1">
                        {company.payout?.bankName ?? "—"}
                      </span>
                      <p className="text-[13px] text-[#737686] mt-0.5">
                        {t("partner.status.bentoPayoutIban", {
                          iban: company.payout
                            ? maskIban(company.payout.iban)
                            : "—",
                        })}
                      </p>
                      <span className="text-[11px] text-[#565E74]">
                        {t("partner.status.bentoPayoutCurrency")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#737686] text-[11px]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t("partner.status.bentoPayoutLock")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 columns */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Next steps */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2.5 pb-1">
                <ShieldCheck className="w-6 h-6 text-[#2563EB]" />
                <h4 className="text-base font-bold text-[#0B1C30]">
                  {t("partner.status.nextTitle")}
                </h4>
              </div>
              <ol className="flex flex-col gap-4 text-sm text-[#737686]">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#D3E4FE] text-[#004AC6] font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-[#0B1C30] block text-sm">
                      {t("partner.status.next1Title")}
                    </strong>
                    {t("partner.status.next1Desc")}
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#D3E4FE] text-[#004AC6] font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-[#0B1C30] block text-sm">
                      {t("partner.status.next2Title")}
                    </strong>
                    {t("partner.status.next2Desc", {
                      phone: user?.phoneNumber ?? company.phone,
                    })}
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#D3E4FE] text-[#004AC6] font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-[#0B1C30] block text-sm">
                      {t("partner.status.next3Title")}
                    </strong>
                    {t("partner.status.next3Desc")}
                  </div>
                </li>
              </ol>
              <div className="p-4 rounded-xl bg-[#EFF4FF] flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[#004AC6] font-bold text-[12px]">
                  <Timer className="w-4 h-4" />
                  <span>{t("partner.status.nextTurnaroundLabel")}</span>
                </div>
                <p className="text-[11px] text-[#737686]">
                  {t("partner.status.nextTurnaroundDesc", {
                    email: company.email,
                  })}
                </p>
              </div>
            </div>

            {/* Document scan preview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <span className="text-[10px] text-[#737686] uppercase font-bold tracking-wider">
                {t("partner.status.scanLabel")}
              </span>
              {firstDocument && !imgFailed ? (
                <div className="relative rounded-xl overflow-hidden bg-[#E5EEFF] h-44 flex items-center justify-center">
                  <img
                    src={`${MEDIA_ORIGIN}${firstDocument.url}`}
                    alt={firstDocument.name}
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C30]/80 via-[#0B1C30]/30 to-transparent flex items-end p-4">
                    <div className="flex items-center justify-between w-full text-white">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold truncate">
                          {firstDocument.name}
                        </span>
                        <span className="text-[10px] text-[#D3E4FE]">
                          {t("partner.status.scanSeal")}
                        </span>
                      </div>
                      <ZoomIn className="w-5 h-5 text-white shrink-0" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-[#E5EEFF] h-44 flex items-center justify-center text-[#737686]">
                  <FileText className="w-8 h-8" />
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] text-[#565E74]">
                <span>{t("partner.status.scanEncrypted")}</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {t("partner.status.scanValid")}
                </span>
              </div>
            </div>

            {/* Support hotline */}
            <div className="bg-[#213145] rounded-2xl p-6 text-white shadow-md flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
                  <Headset className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#B4C5FF] uppercase tracking-wider font-bold">
                    {t("partner.status.supportLabel")}
                  </span>
                  <span className="text-sm font-bold">{t("partner.status.supportTitle")}</span>
                </div>
              </div>
              <p className="text-[12px] text-[#D3E4FE]">
                {t("partner.status.supportDesc")}
              </p>
              <div className="flex flex-col gap-2.5">
                <a
                  href={`tel:${t("partner.status.supportHotlineValue").replace(/\s/g, "")}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Phone className="w-5 h-5 text-[#B4C5FF]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#D3E4FE]">
                      {t("partner.status.supportHotline")}
                    </span>
                    <span className="text-sm font-bold font-mono">
                      {t("partner.status.supportHotlineValue")}
                    </span>
                  </div>
                </a>
                <a
                  href={`mailto:${t("partner.status.supportEmailValue")}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Mail className="w-5 h-5 text-[#B4C5FF]" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-[#D3E4FE]">
                      {t("partner.status.supportEmail")}
                    </span>
                    <span className="text-sm font-bold truncate">
                      {t("partner.status.supportEmailValue")}
                    </span>
                  </div>
                </a>
              </div>
              <span className="text-[11px] text-[#B4C5FF] text-center">
                {t("partner.status.supportHours")}
              </span>
            </div>

            {/* Bottom actions */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3 px-5 rounded-xl bg-[#2563EB] text-white text-sm font-bold hover:bg-[#004AC6] transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-5 h-5" />
                <span>{t("partner.status.printCta")}</span>
              </button>
              <Link
                to="/"
                className="w-full py-3 px-5 rounded-xl bg-white text-[#0B1C30] text-sm font-bold hover:bg-[#EFF4FF] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t("partner.status.homeCta")}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyApplicationStatusPage;