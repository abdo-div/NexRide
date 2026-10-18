import { useState, useMemo } from "react";
import {
  SEGMENTS,
  LOCATION_OPTIONS,
  BODY_PROFILES,
  DRIVETRAIN_OPTIONS,
  CERTIFIED_FLEETS,
  PERK_OPTIONS,
  PRICE_MIN,
  PRICE_MAX,
  DEFAULT_MAX_PRICE,
  type DynamicFilterOption,
} from "../data/vehicleData";
import type { Vehicle } from "../types/vehicle";

export interface OperatorFilterOption {
  id: string;
  name: string;
  rating: string;
  count: number;
}

const toggleIn = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

/**
 * Client-side filtering over the vehicles returned by GET /vehicles. The
 * source list is owned by the caller so this hook stays purely presentational.
 */
export const useVehicleFilters = (vehicles: Vehicle[]) => {
  // Derive real min/max price from the actual vehicle list.
  const priceMin = useMemo(
    () => (vehicles.length > 0 ? Math.floor(Math.min(...vehicles.map((v) => v.pricePerDay))) : PRICE_MIN),
    [vehicles],
  );
  const priceMax = useMemo(
    () => (vehicles.length > 0 ? Math.ceil(Math.max(...vehicles.map((v) => v.pricePerDay))) : PRICE_MAX),
    [vehicles],
  );

  // The slider follows the real price ceiling of the loaded fleet. An explicit
  // user drag overrides it until the ceiling changes (a new fleet arrives) or
  // the filters are reset, so no cars are accidentally hidden by the initial
  // slider position. Derived during render instead of synced in an effect.
  const [maxPriceState, setMaxPriceState] = useState<{
    value: number;
    forMax: number;
  } | null>(null);
  const maxPrice =
    maxPriceState && maxPriceState.forMax === priceMax
      ? maxPriceState.value
      : vehicles.length > 0
        ? priceMax
        : DEFAULT_MAX_PRICE;
  const setMaxPrice = (value: number) =>
    setMaxPriceState({ value, forMax: priceMax });
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedBodies, setSelectedBodies] = useState<string[]>([]);
  const [selectedDrives, setSelectedDrives] = useState<string[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [segment, setSegment] = useState<string | null>(null);

  const toggleLocation = (id: string) =>
    setSelectedLocations((prev) => toggleIn(prev, id));
  const toggleBody = (id: string) => setSelectedBodies((prev) => toggleIn(prev, id));
  const toggleDrive = (id: string) => setSelectedDrives((prev) => toggleIn(prev, id));
  const toggleOperator = (id: string) =>
    setSelectedOperators((prev) => toggleIn(prev, id));
  const togglePerk = (id: string) => setSelectedPerks((prev) => toggleIn(prev, id));

  const removeLocation = (id: string) =>
    setSelectedLocations((prev) => prev.filter((x) => x !== id));
  const removeBody = (id: string) => setSelectedBodies((prev) => prev.filter((x) => x !== id));
  const removeDrive = (id: string) => setSelectedDrives((prev) => prev.filter((x) => x !== id));
  const removeOperator = (id: string) =>
    setSelectedOperators((prev) => prev.filter((x) => x !== id));
  const removePerk = (id: string) => setSelectedPerks((prev) => prev.filter((x) => x !== id));

  const filteredVehicles = useMemo<Vehicle[]>(() => {
    return vehicles.filter((v) => {
      if (v.pricePerDay > maxPrice || v.pricePerDay < priceMin) return false;
      if (selectedLocations.length > 0 && !selectedLocations.includes(v.location)) return false;
      if (selectedBodies.length > 0 && !selectedBodies.includes(v.body)) return false;
      if (selectedDrives.length > 0 && !selectedDrives.includes(v.drive)) return false;
      if (selectedOperators.length > 0 && !selectedOperators.includes(v.operatorId)) return false;
      if (segment && v.segment !== segment) return false;
      if (selectedPerks.includes("instant") && !v.isInstantConfirmation) return false;
      if (selectedPerks.includes("airport") && !v.airportVip) return false;
      if (selectedPerks.includes("zero") && !v.zeroDeposit) return false;
      return true;
    });
  }, [
    vehicles,
    maxPrice,
    priceMin,
    selectedLocations,
    selectedBodies,
    selectedDrives,
    selectedOperators,
    selectedPerks,
    segment,
  ]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: vehicles.length };
    for (const seg of SEGMENTS) {
      counts[seg.id] = vehicles.filter((v) => v.segment === seg.id).length;
    }
    return counts;
  }, [vehicles]);

  // Live location options with real counts
  const locationOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of vehicles) {
      if (v.location) {
        counts[v.location] = (counts[v.location] ?? 0) + 1;
      }
    }
    return LOCATION_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
      count: counts[o.id] ?? 0,
    })).filter((o) => o.count > 0);
  }, [vehicles]);

  // Live body options with real counts — only show options that have vehicles
  const bodyOptions = useMemo<DynamicFilterOption[]>(() => {
    const counts: Record<string, number> = {};
    for (const v of vehicles) {
      if (v.body) {
        counts[v.body] = (counts[v.body] ?? 0) + 1;
      }
    }
    return BODY_PROFILES.map((b) => ({
      id: b.id,
      label: b.label,
      count: counts[b.id] ?? 0,
    })).filter((b) => b.count > 0);
  }, [vehicles]);

  // Live drivetrain options with real counts — only show options that have vehicles
  const driveOptions = useMemo<DynamicFilterOption[]>(() => {
    const counts: Record<string, number> = {};
    for (const v of vehicles) {
      if (v.drive) {
        counts[v.drive] = (counts[v.drive] ?? 0) + 1;
      }
      if (v.fuelType === "GASOLINE") {
        counts["octane"] = (counts["octane"] ?? 0) + 1;
      }
    }
    return DRIVETRAIN_OPTIONS.map((d) => ({
      id: d.id,
      label: d.label,
      count: counts[d.id] ?? 0,
    })).filter((d) => d.count > 0);
  }, [vehicles]);

  // Live certified operators with real counts from vehicles
  const operatorOptions = useMemo<OperatorFilterOption[]>(() => {
    const opMap = new Map<string, { name: string; rating: number; count: number }>();
    for (const v of vehicles) {
      if (!v.operatorId) continue;
      const existing = opMap.get(v.operatorId);
      if (existing) {
        existing.count += 1;
      } else {
        opMap.set(v.operatorId, {
          name: v.operator.name,
          rating: v.operator.rating,
          count: 1,
        });
      }
    }

    if (opMap.size > 0) {
      return Array.from(opMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        rating: data.rating ? data.rating.toFixed(1) : "5.0",
        count: data.count,
      }));
    }

    return CERTIFIED_FLEETS.map((f) => ({
      id: f.id,
      name: f.name,
      rating: f.rating,
      count: 0,
    }));
  }, [vehicles]);

  // Live perk options with real counts
  const perkOptions = useMemo<DynamicFilterOption[]>(() => {
    const counts: Record<string, number> = {
      instant: vehicles.filter((v) => v.isInstantConfirmation).length,
      airport: vehicles.filter((v) => v.airportVip).length,
      zero: vehicles.filter((v) => v.zeroDeposit).length,
    };
    return PERK_OPTIONS.map((p) => ({
      id: p.id,
      label: p.label,
      count: counts[p.id] ?? 0,
    }));
  }, [vehicles]);

  const activeCount =
    selectedLocations.length +
    selectedBodies.length +
    selectedDrives.length +
    selectedOperators.length +
    selectedPerks.length +
    (segment ? 1 : 0);

  const resetFilters = () => {
    setMaxPriceState(null);
    setSelectedLocations([]);
    setSelectedBodies([]);
    setSelectedDrives([]);
    setSelectedOperators([]);
    setSelectedPerks([]);
    setSegment(null);
  };

  return {
    maxPrice,
    setMaxPrice,
    priceMin,
    priceMax,
    selectedLocations,
    toggleLocation,
    removeLocation,
    locationOptions,
    selectedBodies,
    toggleBody,
    removeBody,
    bodyOptions,
    selectedDrives,
    toggleDrive,
    removeDrive,
    driveOptions,
    selectedOperators,
    toggleOperator,
    removeOperator,
    operatorOptions,
    selectedPerks,
    togglePerk,
    removePerk,
    perkOptions,
    segment,
    setSegment,
    filteredVehicles,
    segmentCounts,
    activeCount,
    resetFilters,
  };
};

export type VehicleFilters = ReturnType<typeof useVehicleFilters>;