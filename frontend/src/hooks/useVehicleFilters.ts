import { useState, useMemo } from "react";
import { SEGMENTS, LOCATION_OPTIONS } from "../data/vehicleData";
import type { Vehicle } from "../types/vehicle";

const toggleIn = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

/**
 * Client-side filtering over the vehicles returned by GET /vehicles. The
 * source list is owned by the caller so this hook stays purely presentational.
 */
export const useVehicleFilters = (vehicles: Vehicle[]) => {
  const [maxPrice, setMaxPrice] = useState<number>(2200);
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
      if (v.pricePerDay > maxPrice) return false;
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

  // Live location options: option ids are the real database city strings, so
  // counts reflect the currently fetched fleet. A city with no available
  // vehicles is hidden instead of shown with a dead checkbox.
  const locationOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of vehicles) {
      counts[v.location] = (counts[v.location] ?? 0) + 1;
    }
    return LOCATION_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
      count: counts[o.id] ?? 0,
    })).filter((o) => o.count > 0);
  }, [vehicles]);

  const activeCount =
    selectedLocations.length +
    selectedBodies.length +
    selectedDrives.length +
    selectedOperators.length +
    selectedPerks.length +
    (segment ? 1 : 0);

  const resetFilters = () => {
    setMaxPrice(2200);
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
    selectedLocations,
    toggleLocation,
    removeLocation,
    locationOptions,
    selectedBodies,
    toggleBody,
    removeBody,
    selectedDrives,
    toggleDrive,
    removeDrive,
    selectedOperators,
    toggleOperator,
    removeOperator,
    selectedPerks,
    togglePerk,
    removePerk,
    segment,
    setSegment,
    filteredVehicles,
    segmentCounts,
    activeCount,
    resetFilters,
  };
};

export type VehicleFilters = ReturnType<typeof useVehicleFilters>;