import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Plane,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Map,
} from "lucide-react";

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_HEADS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }) : "";
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

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
      className={`absolute top-full left-0 mt-2 z-40 origin-top-right transition-all duration-150 ${
        open
          ? "opacity-100 scale-100"
          : "pointer-events-none opacity-0 scale-95"
      }`}
    >
      <div className="w-[min(92vw,300px)] rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/15 overflow-hidden z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600">
              {chip}
            </span>
            <span className="text-sm font-bold text-slate-900">
              {MONTHS[view.month]} {view.year}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prev}
              disabled={!canGoPrev}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canGoNext}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
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
            Today
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
            Tomorrow
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
            + 1 Week
          </button>
        </div>

        {/* Calendar grid */}
        <div className="p-3 pb-1">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_HEADS.map((w) => (
              <span key={w} className="text-center text-[9px] font-bold text-slate-400 py-1">
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
                  className={`w-8 h-8 text-[11px] font-bold rounded-lg transition-colors ${
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

        {/* Time list (horizontal grid, no scroll) */}
        <div className="px-3 pb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {chip} time
          </div>
          <div className="grid grid-cols-8 gap-1">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onPick(value ?? today, t)}
                className={`py-1 rounded-md text-[10px] font-bold text-center transition-colors ${
                  time === t
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500">
            Select date &amp; time
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold text-blue-600 hover:underline"
          >
            Close
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
  const [filterKind, setFilterKind] = useState<"city" | "airport" | "all">("all");
  const [query, setQuery] = useState("");
  const [mapMode, setMapMode] = useState(false);

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
    <div className="relative flex flex-col h-full">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 text-left px-4 py-3.5"
      >
        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </div>
          <div className={`flex items-center gap-1.5 truncate text-sm font-bold ${value ? "text-slate-900" : "text-slate-400"}`}>
            {value ? value.name : placeholder}
            {value?.code && (
              <span className="px-1 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                {value.code}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popup */}
      <div
        ref={popupRef}
        className={`absolute top-full left-0 mt-2 z-40 origin-top-left transition-all duration-150 ${
          open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
        }`}
      >
        <div className="w-[min(92vw,360px)] rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/15 overflow-hidden z-50">
          {/* Kind tabs */}
          <div className="flex items-center gap-1 p-2">
            {(
              [
                ["all", "All"],
                ["city", "Cities"],
                ["airport", "Airports"],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilterKind(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
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
          <div className="px-2 pb-2">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus={open}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a city or airport…"
                className="w-full bg-transparent py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
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
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                <Plane className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                No locations match "{query}".
              </div>
            )}
          </div>

          {/* Map toggle */}
          <button
            type="button"
            onClick={() => setMapMode((m) => !m)}
            className="w-full flex items-center justify-between px-3 py-2.5 border-t border-slate-100 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
              <Map className="w-3.5 h-3.5 text-slate-400" />
              Rental offers on the map
            </span>
            <span
              className={`w-8 h-[18px] rounded-full p-[2px] transition-colors ${
                mapMode ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`block w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${
                  mapMode ? "translate-x-[14px]" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Date & time field
// ----------------------------------------------------------------------------

export const SearchConsole: React.FC = () => {
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

  const handlePickupDate = (d: Date, t: string) => {
    setPickupDate(d);
    setPickupTime(t);
    if (returnDate && returnDate < d) setReturnDate(d);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to GET /api/v1/cars when integrating with the backend
  };

  const fromValue = (
    <div className="flex items-center gap-1.5">
      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Pick-up date &amp; time
        </div>
        <div className={`truncate text-sm font-bold ${pickupDate ? "text-slate-900" : "text-slate-400"}`}>
          {pickupDate ? `${fmtDate(pickupDate)} · ${pickupTime}` : "Today · 10:00"}
        </div>
      </div>
      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
    </div>
  );

  const toValue = (
    <div className="flex items-center gap-1.5">
      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Return date &amp; time
        </div>
        <div className={`truncate text-sm font-bold ${returnDate ? "text-slate-900" : "text-slate-400"}`}>
          {returnDate ? `${fmtDate(returnDate)} · ${returnTime}` : `Today · ${returnTime}`}
        </div>
      </div>
      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
    </div>
  );

  return (
    <div id="search-engine" className="relative z-40 mt-8 w-full">
      {/* Card */}
      <div className="rounded-2xl bg-slate-200 shadow-2xl shadow-slate-900/15 border border-slate-200">
        {/* Main row */}
        <form
          className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_auto] gap-px rounded-2xl overflow-visible"
          onSubmit={handleSubmit}
        >
          {/* Pick-up location */}
          <div className="bg-white rounded-t-2xl lg:rounded-tr-none relative">
            <LocationField
              label="Pick-up"
              value={pickupLocation}
              open={openPicker === "pickup"}
              placeholder="Choose pick-up location"
              onToggle={() => setOpenPicker(openPicker === "pickup" ? null : "pickup")}
              onPick={(opt) => {
                setPickupLocation(opt);
                setOpenPicker(null);
              }}
              popupRef={pickupRef}
            />
          </div>

          {/* Pick-up date & time */}
          <div className="bg-white relative">
            <button
              type="button"
              onClick={() => setOpenPicker(openPicker === "from" ? null : "from")}
              className="w-full h-full flex items-center px-4 py-3.5 text-left"
            >
              {fromValue}
            </button>
            <CalendarPopup
              key={openPicker === "from" ? "from-open" : "from-closed"}
              open={openPicker === "from"}
              chip="Pick-up"
              value={pickupDate}
              time={pickupTime}
              min={today}
              onPick={handlePickupDate}
              onClose={() => setOpenPicker(null)}
              popupRef={fromRef}
            />
          </div>

          {/* Return date & time */}
          <div className="bg-white lg:rounded-tr-2xl relative">
            <button
              type="button"
              onClick={() => setOpenPicker(openPicker === "to" ? null : "to")}
              className="w-full h-full flex items-center px-4 py-3.5 text-left"
            >
              {toValue}
            </button>
            <CalendarPopup
              key={openPicker === "to" ? "to-open" : "to-closed"}
              open={openPicker === "to"}
              chip="Return"
              value={returnDate}
              time={returnTime}
              min={pickupDate ?? today}
              onPick={(d, t) => {
                clampReturn(d);
                setReturnTime(t);
              }}
              onClose={() => setOpenPicker(null)}
              popupRef={toRef}
            />
          </div>

          {/* Search CTA */}
          <div className="bg-white rounded-b-2xl lg:rounded-bl-none lg:rounded-r-2xl lg:rounded-br-2xl p-2">
            <button
              type="submit"
              className="w-full h-full min-h-[56px] rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 px-6 transition-colors shadow-lg shadow-blue-600/25"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Options row */}
        <div className="bg-white rounded-b-2xl border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={differentReturn}
              onChange={(e) => setDifferentReturn(e.target.checked)}
              className="peer sr-only"
            />
            <span className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center transition-colors peer-checked:bg-blue-600 peer-checked:border-blue-600">
              <Check className="w-3 h-3 text-white" />
            </span>
            <span className="text-xs font-bold text-slate-700">
              Return car at a different location
            </span>
          </label>
          <span className="text-[11px] font-medium text-slate-400">
            Free cancellation · No prepayment required
          </span>
        </div>

        {/* Different-return location */}
        {differentReturn && (
          <div className="mx-2 mb-2 rounded-xl bg-slate-50 border border-slate-200 relative overflow-visible">
            <div className="bg-white rounded-xl relative">
              <LocationField
                label="Return location"
                value={returnLocation}
                open={openPicker === "return"}
                placeholder="Choose return location"
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
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Popular:
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
            className="px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur border border-white/60 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:border-blue-600 shadow-sm transition-colors"
          >
            {pick}
          </button>
        ))}
      </div>
    </div>
  );
};