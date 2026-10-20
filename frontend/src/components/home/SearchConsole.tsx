import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  MagnifyingGlass as Search,
  MapPinArea as MapPin,
  Airplane as Plane,
  CalendarDots as Calendar,
  CaretDown as ChevronDown,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  ArrowRight,
  Check,
} from "@phosphor-icons/react";

// ----------------------------------------------------------------------------
// Data
// ----------------------------------------------------------------------------

const LOCATIONS = {
  cities: ["Tripoli", "Benghazi", "Misrata", "Sabha", "Zawiya", "Tobruk", "Al Khums"],
  airports: [
    { name: "Mitiga International Airport", code: "MJI", city: "Tripoli" },
    { name: "Benina International Airport", code: "BEN", city: "Benghazi" },
    { name: "Misrata International Airport", code: "MRA", city: "Misrata" },
    { name: "Sabha International Airport", code: "SEB", city: "Sabha" },
  ],
};

const POPULAR_PICKS = [
  "Mitiga International Airport",
  "Benina International Airport",
  "Tripoli",
  "Benghazi",
];

const TIME_OPTIONS: string[] = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

interface LocationOption {
  name: string;
  kind: "city" | "airport";
  code?: string;
}

function buildMonth(year: number, month: number): (Date | null)[] {
  const offset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const fmtDate = (
  d: Date | null,
  weekdayHeads: string[],
  months: string[],
) =>
  d
    ? `${weekdayHeads[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
    : "";
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

// ----------------------------------------------------------------------------
// Calendar popup (shared by From / Return)
// ----------------------------------------------------------------------------

interface CalendarPopupProps {
  open: boolean;
  chip: string;
  value: Date | null;
  time: string;
  min: Date | null;
  onPick: (d: Date, t: string) => void;
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement | null>;
}

const CalendarPopup: React.FC<CalendarPopupProps> = ({
  open,
  chip,
  value,
  time,
  min,
  onPick,
  onClose,
  popupRef,
}) => {
  const { t } = useTranslation();
  const months = t("home.search.months").split(" ");
  const weekdayHeads = t("home.search.weekdayHeads").split(" ");

  const today = startOfDay(new Date());
  const initial = value && value >= (min ?? today) ? value : min ?? today;
  const [view, setView] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });

  const minDay = min ?? today;
  const prev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const next = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

  const days = buildMonth(view.year, view.month);
  const canGoPrev =
    view.year > minDay.getFullYear() ||
    (view.year === minDay.getFullYear() && view.month > minDay.getMonth());
  const canGoNext =
    view.year < minDay.getFullYear() + 1 ||
    (view.year === minDay.getFullYear() + 1 && view.month < minDay.getMonth());

  const quick = (offset: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    if (d >= minDay) {
      setView({ year: d.getFullYear(), month: d.getMonth() });
      onPick(d, time);
    }
  };

  return (
    <div
      ref={popupRef}
      className={`absolute top-full start-0 mt-1 z-[200] origin-top transition-all duration-150 ${
        open
          ? "opacity-100 scale-100"
          : "pointer-events-none opacity-0 scale-95"
      }`}
    >
      <div className="w-[min(92vw,360px)] rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/15 overflow-hidden z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600">
              {chip}
            </span>
            <span className="text-sm font-bold text-slate-900">
              {months[view.month]} {view.year}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prev}
              disabled={!canGoPrev}
              aria-label="Previous month"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canGoNext}
              aria-label="Next month"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>

        {/* Quick selects */}
        <div className="flex gap-2 px-3 pt-2.5">
          <button
            type="button"
            onClick={() => quick(0)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              sameDay(value ?? today, today)
                ? "bg-blue-600 text-white border-blue-600"
                : "border-slate-200 text-slate-600 hover:border-blue-600 hover:text-blue-600"
            }`}
          >
            {t("home.search.today")}
          </button>
          <button
            type="button"
            onClick={() => quick(1)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              sameDay(value ?? today, new Date(today.getTime() + 86400000))
                ? "bg-blue-600 text-white border-blue-600"
                : "border-slate-200 text-slate-600 hover:border-blue-600 hover:text-blue-600"
            }`}
          >
            {t("home.search.tomorrow")}
          </button>
          <button
            type="button"
            onClick={() => quick(7)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              sameDay(value ?? today, new Date(today.getTime() + 7 * 86400000))
                ? "bg-blue-600 text-white border-blue-600"
                : "border-slate-200 text-slate-600 hover:border-blue-600 hover:text-blue-600"
            }`}
          >
            {t("home.search.plusWeek")}
          </button>
        </div>

        {/* Calendar grid */}
        <div className="p-3 pb-1">
          <div className="grid grid-cols-7 mb-1">
            {weekdayHeads.map((w, i) => (
              <span key={i} className="text-center text-[9px] font-bold text-slate-400 py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((d, i) => {
              if (!d) return <span key={i} />;
              const disabled = d < minDay;
              const selected = value !== null && sameDay(d, value);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(d, time)}
                  className={`aspect-square w-full text-[11px] font-bold rounded-lg transition-colors ${
                    selected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                      : disabled
                      ? "text-slate-300"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time list */}
        <div className="px-3 pb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {chip} · {t("home.search.time")}
          </div>
          <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto pe-1 sm:grid-cols-6 [scrollbar-gutter:stable]">
            {TIME_OPTIONS.map((tEl) => (
              <button
                key={tEl}
                type="button"
                dir="ltr"
                onClick={() => onPick(value ?? today, tEl)}
                className={`min-w-0 whitespace-nowrap rounded-lg px-1 py-1.5 text-center text-[11px] font-bold tabular-nums transition-colors ${
                  time === tEl
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tEl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500">
            {t("home.search.selectDateTime")}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold text-blue-600 hover:underline"
          >
            {t("home.search.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Location field with popup (Pick-up / Return)
// ----------------------------------------------------------------------------

interface LocationFieldProps {
  label: string;
  value: LocationOption | null;
  open: boolean;
  placeholder: string;
  onToggle: () => void;
  onPick: (opt: LocationOption) => void;
  popupRef: React.RefObject<HTMLDivElement | null>;
}

const LocationField: React.FC<LocationFieldProps> = ({
  label,
  value,
  open,
  placeholder,
  onToggle,
  onPick,
  popupRef,
}) => {
  const { t } = useTranslation();
  const [filterKind, setFilterKind] = useState<"city" | "airport" | "all">("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const cityList = LOCATIONS.cities.filter(
    (c) => filterKind !== "airport" && (!q || c.toLowerCase().includes(q)),
  );
  const airportList = LOCATIONS.airports.filter(
    (a) =>
      filterKind !== "city" &&
      (!q ||
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q)),
  );

  return (
    <div className="relative flex h-full flex-col">
      <button
        type="button"
        onClick={onToggle}
        className={`group/field flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors duration-200 lg:min-h-[70px] ${open ? "bg-slate-50" : "hover:bg-slate-50/70"}`}
      >
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors ${open ? "border-[#142b4a] bg-[#142b4a] text-white" : "border-slate-200 bg-slate-50 text-[#142b4a]"}`}>
          <MapPin weight="duotone" className="h-[18px] w-[18px]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </div>
          <div className={`flex items-center gap-1.5 truncate text-[15px] font-extrabold ${value ? "text-slate-950" : "text-slate-400"}`}>
            {value ? value.name : placeholder}
            {value?.code && (
              <span className="px-1 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                {value.code}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          weight="bold"
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popup */}
      <div
        ref={popupRef}
        className={`absolute top-full start-0 mt-2 z-[100] origin-top transition-all duration-150 ${
          open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
        }`}
      >
        <div className="w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_28px_70px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl z-50">
          {/* Kind tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 p-3">
            {(
              [
                ["all", t("home.search.all")],
                ["city", t("home.search.cities")],
                ["airport", t("home.search.airports")],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilterKind(k)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-colors ${
                  filterKind === k
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-3 pb-2 pt-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:bg-white">
              <Search weight="bold" className="w-3.5 h-3.5 text-slate-500" />
              <input
                autoFocus={open}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("home.search.searchLocation")}
                className="w-full bg-transparent py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-56 overflow-y-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cityList.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onPick({ name: c, kind: "city" })}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  value?.name === c ? "bg-slate-50" : "hover:bg-slate-50"
                }`}
              >
                <MapPin weight="duotone" className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="flex-1 text-xs font-bold text-slate-800">{c}</span>
                {value?.name === c && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            ))}
            {airportList.map((a) => (
              <button
                key={a.code}
                type="button"
                onClick={() => onPick({ name: a.name, kind: "airport", code: a.code })}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  value?.name === a.name ? "bg-slate-50" : "hover:bg-slate-50"
                }`}
              >
                <Plane weight="duotone" className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="flex-1">
                  <span className="block text-xs font-bold text-slate-800">{a.name}</span>
                  <span className="block text-[10px] text-slate-400">
                    {a.city} · {a.code}
                  </span>
                </span>
                {value?.name === a.name && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            ))}
            {cityList.length === 0 && airportList.length === 0 && (
              <div className="px-2.5 py-4 text-xs text-slate-400 text-center">
                {t("home.search.noLocations", { query })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Date & time field
// ----------------------------------------------------------------------------

export const SearchConsole: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = startOfDay(new Date());

  const [openPicker, setOpenPicker] = useState<
    "pickup" | "return" | "from" | "to" | null
  >(null);

  const [pickupLocation, setPickupLocation] = useState<LocationOption | null>(null);
  const [returnLocation, setReturnLocation] = useState<LocationOption | null>(null);
  const [differentReturn, setDifferentReturn] = useState(false);

  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [returnTime, setReturnTime] = useState("16:00");

  const pickupRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  const pickRefs = React.useMemo<Record<string, React.RefObject<HTMLDivElement | null>>>(
    () => ({
      pickup: pickupRef,
      return: returnRef,
      from: fromRef,
      to: toRef,
    }),
    [],
  );

  // Close any open picker when clicking outside
  useEffect(() => {
    if (!openPicker) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest(`[data-search-picker="${openPicker}"]`)
      ) {
        return;
      }
      const ref = pickRefs[openPicker];
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenPicker(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPicker(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openPicker, pickRefs]);

  const clampReturn = (toDate: Date) => {
    const base = pickupDate ?? today;
    if (toDate < base) toDate = base;
    setReturnDate(toDate);
  };

  const handlePickupDate = (d: Date, tEl: string) => {
    setPickupDate(d);
    setPickupTime(tEl);
    if (returnDate && returnDate < d) setReturnDate(d);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (pickupLocation) params.set("location", pickupLocation.name);

    // A single-day rental is implied when the customer picks a date but not a
    // return date, so the backend availability window is always meaningful.
    const start = pickupDate;
    let end = returnDate;
    if (start && !end) {
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    }
    if (start && end) {
      params.set("startDate", toISODate(start));
      params.set("endDate", toISODate(end));
    }

    navigate(`/fleet?${params.toString()}`);
  };

  const fromValue = (
    <div className="flex items-center gap-2.5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${openPicker === "from" ? "border-[#142b4a] bg-[#142b4a] text-white" : "border-slate-200 bg-slate-50 text-[#142b4a]"}`}>
        <Calendar weight="duotone" className="h-[18px] w-[18px]" />
      </span>
      <div className="flex-1 min-w-0 text-left">
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {t("home.search.pickupDateTime")}
        </div>
        <div className={`truncate text-[15px] font-extrabold ${pickupDate ? "text-slate-950" : "text-slate-400"}`}>
          {pickupDate
            ? `${fmtDate(pickupDate, t("home.search.weekdayHeads").split(" "), t("home.search.months").split(" "))} · ${pickupTime}`
            : `${t("home.search.today")} · ${pickupTime}`}
        </div>
      </div>
      <ChevronDown weight="bold" className="w-4 h-4 text-slate-400 shrink-0" />
    </div>
  );

  const toValue = (
    <div className="flex items-center gap-2.5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${openPicker === "to" ? "border-[#142b4a] bg-[#142b4a] text-white" : "border-slate-200 bg-slate-50 text-[#142b4a]"}`}>
        <Calendar weight="duotone" className="h-[18px] w-[18px]" />
      </span>
      <div className="flex-1 min-w-0 text-left">
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {t("home.search.returnDateTime")}
        </div>
        <div className={`truncate text-[15px] font-extrabold ${returnDate ? "text-slate-950" : "text-slate-400"}`}>
          {returnDate
            ? `${fmtDate(returnDate, t("home.search.weekdayHeads").split(" "), t("home.search.months").split(" "))} · ${returnTime}`
            : `${t("home.search.today")} · ${returnTime}`}
        </div>
      </div>
      <ChevronDown weight="bold" className="w-4 h-4 text-slate-400 shrink-0" />
    </div>
  );

  return (
    <div id="search-engine" className="relative z-[60] mt-10 w-full overflow-visible isolate">
      {/* Card */}
      <div className="overflow-visible rounded-[26px] border border-white/20 bg-white/95 p-1 shadow-[0_34px_90px_-28px_rgba(0,0,0,.72),0_8px_24px_-12px_rgba(15,23,42,.35)] ring-1 ring-white/15 backdrop-blur-xl">
        {/* Main row */}
        <form
          className={`relative grid grid-cols-1 overflow-visible rounded-[22px] bg-slate-200/80 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:gap-px ${openPicker ? "z-30" : "z-10"}`}
          onSubmit={handleSubmit}
        >
          {/* Pick-up location */}
          <div
            data-search-picker="pickup"
            className={`relative overflow-visible rounded-t-[22px] bg-white lg:rounded-s-[22px] lg:rounded-tr-none lg:rounded-br-none ${openPicker === "pickup" ? "z-20" : ""}`}
          >
            <LocationField
              label={t("home.search.pickup")}
              value={pickupLocation}
              open={openPicker === "pickup"}
              placeholder={t("home.search.choosePickup")}
              onToggle={() => setOpenPicker(openPicker === "pickup" ? null : "pickup")}
              onPick={(opt) => {
                setPickupLocation(opt);
                setOpenPicker(null);
              }}
              popupRef={pickupRef}
            />
          </div>

          {/* Pick-up date & time */}
          <div data-search-picker="from" className={`relative bg-white transition-colors ${openPicker === "from" ? "z-20 bg-slate-50" : ""}`}>
            <button
              type="button"
              onClick={() => setOpenPicker(openPicker === "from" ? null : "from")}
              aria-expanded={openPicker === "from"}
              className="flex h-full w-full items-center px-4 py-3 text-left transition-colors hover:bg-slate-50/70 lg:min-h-[70px]"
            >
              {fromValue}
            </button>
            <CalendarPopup
              key={openPicker === "from" ? "from-open" : "from-closed"}
              open={openPicker === "from"}
              chip={t("home.search.pickup")}
              value={pickupDate}
              time={pickupTime}
              min={today}
              onPick={handlePickupDate}
              onClose={() => setOpenPicker(null)}
              popupRef={fromRef}
            />
          </div>

          {/* Return date & time */}
          <div data-search-picker="to" className={`relative bg-white transition-colors ${openPicker === "to" ? "z-20 bg-slate-50" : ""}`}>
            <button
              type="button"
              onClick={() => setOpenPicker(openPicker === "to" ? null : "to")}
              aria-expanded={openPicker === "to"}
              className="flex h-full w-full items-center px-4 py-3 text-left transition-colors hover:bg-slate-50/70 lg:min-h-[70px]"
            >
              {toValue}
            </button>
            <CalendarPopup
              key={openPicker === "to" ? "to-open" : "to-closed"}
              open={openPicker === "to"}
              chip={t("home.search.return")}
              value={returnDate}
              time={returnTime}
              min={pickupDate ?? today}
              onPick={(d, tEl) => {
                clampReturn(d);
                setReturnTime(tEl);
              }}
              onClose={() => setOpenPicker(null)}
              popupRef={toRef}
            />
          </div>

          {/* Search CTA */}
          <div className="rounded-b-[22px] bg-white p-2 lg:rounded-e-[22px] lg:rounded-bl-none">
            <button
              type="submit"
              className="premium-button group flex h-full min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-7 text-sm font-extrabold tracking-wide"
            >
              <Search weight="bold" className="w-4 h-4" />
              <span>{t("home.search.search")}</span>
              <ArrowRight weight="bold" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5 rtl:rotate-180 rtl:group-hover:-translate-x-1.5" />
            </button>
          </div>
        </form>

        {/* Options row */}
        <div className="relative z-0 mt-px flex flex-wrap items-center justify-between gap-2 rounded-b-[22px] bg-slate-50/90 px-5 py-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={differentReturn}
              onChange={(e) => setDifferentReturn(e.target.checked)}
              className="peer sr-only"
            />
            <span className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white shadow-sm transition-colors peer-checked:border-[#142b4a] peer-checked:bg-[#142b4a]">
              <Check weight="bold" className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-xs font-extrabold text-slate-700">
              {t("home.search.differentReturn")}
            </span>
          </label>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
            {t("home.search.freeCancellation")}
          </span>
        </div>

        {/* Different-return location */}
        {differentReturn && (
          <div className="mx-2 mb-2 rounded-xl bg-slate-50 border border-slate-200 relative overflow-visible">
            <div data-search-picker="return" className="bg-white rounded-xl relative">
              <LocationField
                label={t("home.search.returnLocation")}
                value={returnLocation}
                open={openPicker === "return"}
                placeholder={t("home.search.chooseReturn")}
                onToggle={() =>
                  setOpenPicker(openPicker === "return" ? null : "return")
                }
                onPick={(opt) => {
                  setReturnLocation(opt);
                  setOpenPicker(null);
                }}
                popupRef={returnRef}
              />
            </div>
          </div>
        )}
      </div>

      {/* Popular picks */}
      <div className={`relative z-0 mt-3 flex flex-wrap items-center gap-2 transition-opacity ${openPicker ? "invisible opacity-0" : "opacity-100"}`}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {t("home.search.popular")}
        </span>
        {POPULAR_PICKS.map((pick) => (
          <button
            key={pick}
            type="button"
            onClick={() => {
              const isAirport = LOCATIONS.airports.some((a) => a.name === pick);
              const airport = LOCATIONS.airports.find((a) => a.name === pick);
              setPickupLocation(
                isAirport && airport
                  ? { name: airport.name, kind: "airport", code: airport.code }
                  : { name: pick, kind: "city" },
              );
              setOpenPicker(null);
            }}
            className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-slate-200 shadow-sm backdrop-blur transition-colors hover:border-blue-400/70 hover:bg-blue-500/20 hover:text-white"
          >
            {pick}
          </button>
        ))}
      </div>
    </div>
  );
};
