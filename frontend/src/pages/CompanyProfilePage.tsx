import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import {
  Home,
  MapPin,
  Star,
  BadgeCheck,
  Car,
  Warehouse,
  Phone,
  ChevronLeft,
  ChevronRight,
  Search,
  SearchX,
  RefreshCcw,
  ShieldCheck,
  Store,
  Navigation,
  MessageCircle,
} from "lucide-react";
import { useCompanyProfile } from "../hooks/useCompanyProfile";
import { companyLogoUrl, initialsFrom, photoUrl } from "../lib/vehicleMapper";
import type { VehicleType } from "../types/vehicle";
import type { CompanyProfileVehicle } from "../types/companyProfile";
import {
  CompanyProfileVehicleCard,
  CompanyProfileVehicleSkeleton,
} from "../components/companyProfile/CompanyProfileVehicleCard";

const PAGE_SIZE = 6;
const SKELETON_KEYS = ["a", "b", "c"];

type SortKey = "recommended" | "price-asc" | "price-desc" | "newest";
type PriceTier = "all" | "under-400" | "400-600" | "over-600";

const avatarGradient =
  "bg-gradient-to-br from-slate-900 to-slate-600 text-white";

const Stars: React.FC<{ rating: number; className?: string }> = ({
  rating,
  className,
}) => (
  <div className={`flex text-amber-500 ${className ?? ""}`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-[22px] h-[22px] ${
          rating >= i + 0.75
            ? "fill-amber-400 text-amber-400"
            : "fill-transparent text-slate-300"
        }`}
      />
    ))}
  </div>
);

/** Deterministic, pure date renderer — no relative "now" during render. */
const ReviewDate: React.FC<{ iso?: string }> = ({ iso }) => {
  const { i18n } = useTranslation();
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <span>
      {date.toLocaleDateString(i18n.language === "ar" ? "ar-LY" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
    </span>
  );
};

const pageWindow = (current: number, total: number): (number | "...")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
};

export const CompanyProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { companyId = "" } = useParams<{ companyId: string }>();
  const {
    company,
    vehicleDtos,
    rating,
    reviewsCount,
    pickupStations,
    reviews,
    starCounts,
    loading,
    notFound,
    error,
    retry,
  } = useCompanyProfile(companyId);

  const [contactOpen, setContactOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [transmission, setTransmission] = useState<"all" | VehicleType[number] | "AUTOMATIC" | "MANUAL">("all");
  const [priceTier, setPriceTier] = useState<PriceTier>("all");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const fleet: CompanyProfileVehicle[] = useMemo(
    () =>
      vehicleDtos.map((vehicle) => ({
        id: vehicle._id,
        title: `${vehicle.make} ${vehicle.model}`,
        year: vehicle.year,
        type: vehicle.type,
        typeLabel: t(`fleet.types.${vehicle.type}`, vehicle.type),
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        seats: vehicle.seats,
        doors: vehicle.doors,
        dailyPrice: vehicle.dailyPrice,
        image: photoUrl(vehicle.photos?.[0]),
        rating: vehicle.ratingsAverage,
        reviewsCount: vehicle.ratingsQuantity,
        href: `/vehicles/${vehicle._id}`,
        pickupLocation: vehicle.pickupLocation?.trim() ?? "",
      })),
    [vehicleDtos, t],
  );

  const newestYear = useMemo(
    () =>
      fleet.reduce((max, v) => (v.year > max ? v.year : max), 0),
    [fleet],
  );

  const categories = useMemo(() => {
    const counts = new Map<VehicleType, number>();
    fleet.forEach((v) =>
      counts.set(v.type, (counts.get(v.type) ?? 0) + 1),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [fleet]);

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    const list = fleet.filter((v) => {
      const matchesCategory = category === "all" || v.type === category;
      const matchesTransmission =
        transmission === "all" || v.transmission === transmission;
      let matchesPrice = true;
      if (priceTier === "under-400") matchesPrice = v.dailyPrice < 400;
      else if (priceTier === "400-600")
        matchesPrice = v.dailyPrice >= 400 && v.dailyPrice <= 600;
      else if (priceTier === "over-600") matchesPrice = v.dailyPrice > 600;
      const matchesSearch =
        term.length === 0 ||
        v.title.toLowerCase().includes(term) ||
        String(v.year).includes(term) ||
        v.typeLabel.toLowerCase().includes(term);
      return (
        matchesCategory && matchesTransmission && matchesPrice && matchesSearch
      );
    });

    if (sort === "price-asc") return [...list].sort((a, b) => a.dailyPrice - b.dailyPrice);
    if (sort === "price-desc") return [...list].sort((a, b) => b.dailyPrice - a.dailyPrice);
    if (sort === "newest") return [...list].sort((a, b) => b.year - a.year);
    return [...list].sort(
      (a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount,
    );
  }, [fleet, keyword, transmission, priceTier, sort, category]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  const resetFilters = () => {
    setKeyword("");
    setTransmission("all");
    setPriceTier("all");
    setSort("recommended");
    setCategory("all");
    setPage(1);
  };

  const hasFilters =
    keyword.trim() !== "" ||
    transmission !== "all" ||
    priceTier !== "all" ||
    category !== "all";

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="bg-white/70 border-b border-slate-200 py-4 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="h-4 w-56 bg-slate-200 rounded animate-pulse" />
            <div className="h-7 w-28 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 space-y-6">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
            <div className="h-28 bg-gradient-to-r from-[#2563EB] to-[#60a5fa]" />
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-start gap-6">
              <div className="w-24 h-24 rounded-2xl bg-slate-200" />
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SKELETON_KEYS.map((k) => (
              <CompanyProfileVehicleSkeleton key={k} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 text-center">
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
              <Warehouse className="w-10 h-10" />
            </div>
            <h2 className="text-[24px] font-bold text-slate-900">
              {t("companyProfile.notFoundTitle")}
            </h2>
            <p className="text-[14px] text-slate-500">
              {t("companyProfile.notFoundDesc")}
            </p>
            <Link
              to="/companies"
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[14px] font-bold shadow-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              {t("companyProfile.notFoundAction")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 text-center">
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-red-200 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
              <Warehouse className="w-10 h-10" />
            </div>
            <h2 className="text-[20px] font-bold text-slate-900">
              {t("companyProfile.errorTitle")}
            </h2>
            <p className="text-[14px] text-slate-500">
              {error || t("companyProfile.errorDesc")}
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[13px] font-bold transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              {t("companyProfile.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const name = company?.name ?? "";
  const initials = initialsFrom(name);
  const companyLogo = companyLogoUrl(company?.logo);
  const fleetSize = fleet.length;
  const totalCollected = starCounts.reduce((s, c) => s + c.count, 0);
  const mapQuery = encodeURIComponent(
    [name, company?.city].filter(Boolean).join(" "),
  );

  const quickFacts = [
    {
      icon: BadgeCheck,
      iconClass: "text-[#2563EB]",
      title: t("companyProfile.quickFacts.instant"),
      desc: t("companyProfile.quickFacts.instantDesc", {
        count: fleetSize,
      }),
    },
    {
      icon: ShieldCheck,
      iconClass: "text-emerald-600",
      title: t("companyProfile.quickFacts.rating"),
      desc:
        reviewsCount > 0
          ? t("companyProfile.quickFacts.ratingDesc", {
              rating: rating.toFixed(1),
              count: reviewsCount,
            })
          : t("companyProfile.quickFacts.ratingEmpty"),
    },
    {
      icon: Store,
      iconClass: "text-[#2563EB]",
      title: t("companyProfile.quickFacts.hubs"),
      desc: t("companyProfile.quickFacts.hubsDesc", {
        count: Math.max(1, pickupStations.length + (company?.city ? 1 : 0)),
      }),
    },
    {
      icon: Car,
      iconClass: "text-orange-600",
      title: t("companyProfile.quickFacts.fleetYear"),
      desc:
        newestYear > 0
          ? t("companyProfile.quickFacts.fleetYearDesc", { year: newestYear })
          : "—",
    },
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Breadcrumb bar */}
      <section className="bg-white/70 border-b border-slate-200 py-4 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[13px] text-slate-500 flex-wrap"
          >
            <Link
              to="/"
              className="hover:text-[#2563EB] transition-colors flex items-center gap-1 font-semibold"
            >
              <Home className="w-[18px] h-[18px]" />
              {t("companies.breadcrumbHome")}
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              to="/companies"
              className="hover:text-[#2563EB] transition-colors font-semibold"
            >
              {t("companies.breadcrumbCurrent")}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-bold truncate">{name}</span>
          </nav>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold self-start md:self-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t("companyProfile.fleetCount", { count: fleetSize })}
          </span>
        </div>
      </section>

      {/* Back to directory */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-6">
        <Link
          to="/companies"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#2563EB] transition-colors text-[14px] font-semibold"
        >
          <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          {t("companyProfile.backToDirectory")}
        </Link>
      </div>

      {/* Hero card */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-4 pb-8">
        <div className="w-full bg-white rounded-2xl shadow-md overflow-hidden relative">
          <div className="h-28 w-full bg-gradient-to-r from-[#1d4ed8] to-[#2563EB] relative overflow-hidden flex items-end justify-between px-8 pb-3">
            <span className="text-[11px] tracking-widest text-blue-100 uppercase font-bold flex items-center gap-1.5 z-10">
              <ShieldCheck className="w-4 h-4" />
              {t("companyProfile.supplierTier")}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-blue-100 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full z-10">
              <BadgeCheck className="w-[14px] h-[14px]" />
              {t("companyProfile.verifiedPartner")}
            </span>
          </div>

          <div className="p-6 md:p-8 -mt-10 relative z-20 flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white shadow-xl p-2 flex flex-col items-center justify-center relative flex-shrink-0">
                {companyLogo ? <img src={companyLogo} alt={name} className="h-full w-full rounded-xl object-cover" /> : <div
                  className={`w-full h-full rounded-xl ${avatarGradient} flex flex-col items-center justify-center shadow-inner`}
                >
                  <span className="text-[28px] font-extrabold text-amber-300 tracking-tight">
                    {initials}
                  </span>
                  <span className="text-[10px] text-white/80 font-bold tracking-widest uppercase max-w-[90px] truncate">
                    {name}
                  </span>
                </div>}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                  <BadgeCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-col gap-2.5 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight">
                    {name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[12px] font-bold bg-emerald-50 text-emerald-700">
                    <BadgeCheck className="w-4 h-4" />
                    {t("companyProfile.verifiedPartner")}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-slate-600">
                  {company?.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-[18px] h-[18px] text-[#2563EB]" />
                      <span className="font-semibold">{company.city}</span>
                    </span>
                  )}
                  {reviewsCount > 0 ? (
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-[18px] h-[18px] fill-amber-400 text-amber-400" />
                      <span className="text-slate-900">{rating.toFixed(1)}</span>
                      <span className="text-slate-500 font-normal">
                        {t("companyProfile.reviewsChip", {
                          count: reviewsCount,
                        })}
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Star className="w-[18px] h-[18px] text-slate-400" />
                      <span>{t("companyProfile.noReviewsChip")}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Car className="w-[18px] h-[18px] text-[#2563EB]" />
                    <span className="font-semibold">
                      {t("companyProfile.fleetAvailable", {
                        count: fleetSize,
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Store className="w-[18px] h-[18px] text-slate-400" />
                    <span>
                      {t("companyProfile.stationsChip", {
                        count: Math.max(
                          1,
                          pickupStations.length + (company?.city ? 1 : 0),
                        ),
                      })}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-end gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setContactOpen((open) => !open)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[14px] font-bold shadow-md transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  {t("companyProfile.contactCompany")}
                </button>
              </div>
              {contactOpen && (
                <div className="w-full max-w-xs p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="font-bold text-slate-900">
                      {t("companyProfile.contactTitle")}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {t("companyProfile.contactOnline")}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    {t("companyProfile.contactNote", { name })}
                  </p>
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 text-[13px] font-bold text-[#2563EB] hover:underline"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t("companyProfile.contactCta")}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="px-6 md:px-8 pb-6 pt-2">
            <p className="text-[14px] text-slate-600 max-w-4xl leading-relaxed">
              {company?.description?.trim() ||
                t("companyProfile.bioFallback", { name })}
            </p>
          </div>
        </div>
      </section>

      {/* Quick company facts */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickFacts.map((fact) => (
            <div
              key={fact.title}
              className="p-4 rounded-xl bg-white shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow border border-[#E2E8F0]"
            >
              <div
                className={`w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 ${fact.iconClass}`}
              >
                <fact.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-slate-900 truncate">
                  {fact.title}
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  {fact.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fleet */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h2 className="text-[20px] font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                {t("companyProfile.fleetTitle")}
                <span className="text-[12px] px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563EB] font-bold">
                  {t("companyProfile.fleetCount", { count: fleetSize })}
                </span>
              </h2>
              <p className="text-[13px] text-slate-500">
                {t("companyProfile.fleetSubtitle")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-bold uppercase text-slate-500 whitespace-nowrap">
                {t("companyProfile.sortLabel")}
              </label>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="recommended">
                  {t("companyProfile.sortRecommended")}
                </option>
                <option value="price-asc">
                  {t("companyProfile.sortPriceAsc")}
                </option>
                <option value="price-desc">
                  {t("companyProfile.sortPriceDesc")}
                </option>
                <option value="newest">{t("companyProfile.sortNewest")}</option>
              </select>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder={t("companyProfile.searchPlaceholder")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={transmission}
                onChange={(e) => {
                  setTransmission(
                    e.target.value as "all" | "AUTOMATIC" | "MANUAL",
                  );
                  setPage(1);
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-50 text-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">
                  {t("companyProfile.transmissionAll")}
                </option>
                <option value="AUTOMATIC">
                  {t("companyProfile.transmissionAutomatic")}
                </option>
                <option value="MANUAL">
                  {t("companyProfile.transmissionManual")}
                </option>
              </select>
              <select
                value={priceTier}
                onChange={(e) => {
                  setPriceTier(e.target.value as PriceTier);
                  setPage(1);
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-50 text-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">{t("companyProfile.priceAll")}</option>
                <option value="under-400">{t("companyProfile.priceUnder")}</option>
                <option value="400-600">{t("companyProfile.priceMid")}</option>
                <option value="over-600">{t("companyProfile.priceOver")}</option>
              </select>
              <button
                type="button"
                onClick={resetFilters}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors text-[11px] font-bold uppercase flex items-center gap-1"
              >
                <RefreshCcw className="w-4 h-4" />
                {t("companyProfile.reset")}
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-[14px] font-semibold whitespace-nowrap transition-all ${
                category === "all"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {t("companyProfile.categoryAll", { count: fleetSize })}
            </button>
            {categories.map(([type, count]) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setCategory(category === type ? "all" : type);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-[14px] font-semibold whitespace-nowrap transition-all ${
                  category === type
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {t("companyProfile.categoryPill", {
                  name: t(`fleet.types.${type}`, type),
                  count,
                })}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet results */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-10">
        {fleetSize === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Warehouse className="w-8 h-8" />
            </div>
            <h3 className="text-[20px] font-bold text-slate-900">
              {t("companyProfile.fleetEmptyTitle")}
            </h3>
            <p className="text-[14px] text-slate-500 mt-1 max-w-md">
              {t("companyProfile.fleetEmptyDesc", { name })}
            </p>
            <button
              type="button"
              onClick={() => navigate("/companies")}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[14px] font-bold shadow-md transition-colors"
            >
              {t("companyProfile.browseDirectory")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
              <SearchX className="w-8 h-8" />
            </div>
            <h3 className="text-[20px] font-bold text-slate-900">
              {t("companyProfile.filterEmptyTitle")}
            </h3>
            <p className="text-[14px] text-slate-500 mt-1 max-w-md">
              {t("companyProfile.filterEmptyDesc", { name })}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[14px] font-bold shadow-md transition-colors"
            >
              {t("companyProfile.filterEmptyAction")}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageItems.map((vehicle) => (
                <CompanyProfileVehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="self-center text-xs font-semibold text-[#2563EB] hover:underline px-2"
              >
                {t("companyProfile.filterEmptyAction")}
              </button>
            )}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-slate-200 mt-8">
              <span className="text-[13px] text-slate-500">
                {t("companyProfile.paginationSummary", {
                  from,
                  to,
                  count: filtered.length,
                  name,
                })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage(safePage - 1)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 text-[13px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  {t("companyProfile.previous")}
                </button>
                {pageWindow(safePage, pageCount).map((p, index) =>
                  p === "..." ? (
                    <span key={`gap-${index}`} className="px-1.5 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-[13px] font-bold transition-colors ${
                        p === safePage
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={safePage === pageCount}
                  onClick={() => setPage(safePage + 1)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 text-[13px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
                >
                  {t("companyProfile.next")}
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Reviews */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-16">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 md:p-8 flex flex-col gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center pb-6 border-b border-slate-100">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {t("companyProfile.ratingTitle")}
              </span>
              <h3 className="text-[20px] font-bold text-slate-900">
                {t("companyProfile.reviewsHeading")}
              </h3>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-[42px] font-black text-slate-900 tracking-tight">
                  {reviewsCount > 0 ? rating.toFixed(1) : "—"}
                </span>
                <div className="flex flex-col gap-1">
                  <Stars rating={rating} />
                  <span className="text-[12px] text-slate-500 font-semibold">
                    {t("companyProfile.verifiedTrips", { count: reviewsCount })}
                  </span>
                </div>
              </div>
            </div>
            {totalCollected > 0 ? (
              <div className="lg:col-span-2 flex flex-col gap-2.5">
                {starCounts.map(({ star, count }) => {
                  const percent =
                    totalCollected > 0 ? (count / totalCollected) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-[12px] font-bold text-slate-900 w-16">
                        {t("companyProfile.starsLabel", { star })}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-slate-400 w-10 text-right">
                        {Math.round(percent)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="lg:col-span-2 text-[13px] text-slate-500">
                {t("companyProfile.distributionPending")}
              </p>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review) => (
                <div
                  key={review.id}
                  className="p-5 rounded-xl bg-slate-50 flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              review.rating >= i + 1
                                ? "fill-amber-400 text-amber-400"
                                : "fill-transparent text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        <ReviewDate iso={review.createdAt} />
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-700 leading-relaxed line-clamp-5">
                      "{review.review}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex flex-col">
                    <span className="text-[14px] font-bold text-slate-900">
                      {review.author ?? t("companyProfile.verifiedCustomer")}
                    </span>
                    <span className="text-[12px] text-slate-500">
                      {t("companyProfile.reviewVehicle", {
                        vehicle: review.vehicleTitle,
                      })}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                      <BadgeCheck className="w-[14px] h-[14px]" />
                      {t("companyProfile.reviewVerified")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-[15px] font-bold text-slate-700">
                {t("companyProfile.noReviewsTitle")}
              </p>
              <p className="text-[13px] text-slate-500 mt-1">
                {t("companyProfile.noReviewsDesc")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Location & pickup stations */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-16">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 md:p-8 flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/2 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {t("companyProfile.hubsHeading")}
              </span>
              <h3 className="text-[20px] font-bold text-slate-900">
                {t("companyProfile.hubsSubtitle")}
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {company?.city && (
                <div className="p-4 rounded-xl bg-slate-50 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-slate-900">
                      {t("companyProfile.hubsMain")}
                    </span>
                    <span className="text-[13px] text-slate-500">
                      {name} — {company.city}
                    </span>
                  </div>
                </div>
              )}
              {pickupStations.map((station) => (
                <div
                  key={station}
                  className="p-4 rounded-xl bg-slate-50 flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-slate-900">
                      {t("companyProfile.hubsStation")}
                    </span>
                    <span className="text-[13px] text-slate-500">
                      {station}
                    </span>
                  </div>
                </div>
              ))}
              {pickupStations.length === 0 && !company?.city && (
                <p className="text-[13px] text-slate-500">
                  {t("companyProfile.hubsNone")}
                </p>
              )}
            </div>
          </div>

          <div className="lg:w-1/2 min-h-[300px] rounded-xl overflow-hidden border border-slate-200 relative flex flex-col justify-end p-6 bg-gradient-to-br from-blue-600/15 via-slate-100 to-slate-200">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
              <div>
                <p className="text-[15px] font-bold">
                  {t("companyProfile.hubsMapTitle", {
                    city: company?.city || name,
                  })}
                </p>
                <p className="text-[11px] text-white/80">
                  {t("companyProfile.hubsMapBody")}
                </p>
              </div>
              <a
                href={`https://maps.google.com/?q=${mapQuery}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-white/90 backdrop-blur-md text-slate-900 text-[12px] font-bold hover:bg-white transition-colors flex items-center gap-1.5 shadow"
              >
                <Navigation className="w-4 h-4" />
                {t("companyProfile.openMaps")}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CompanyProfilePage;
