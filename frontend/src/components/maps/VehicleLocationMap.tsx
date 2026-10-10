import React, { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

const TRIPOLI: [number, number] = [32.8872, 13.1913];

interface VehicleLocationMapProps {
  coordinates?: [number, number] | null; // GeoJSON order: [longitude, latitude]
  editable?: boolean;
  label?: string;
  onChange?: (longitude: number, latitude: number) => void;
  className?: string;
  pickerHint?: string;
}

const Recenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
    requestAnimationFrame(() => map.invalidateSize());
  }, [center, map]);
  return null;
};

const CompactAttribution: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.attributionControl.setPrefix(false);
  }, [map]);
  return null;
};

const CoordinatePicker: React.FC<{
  enabled: boolean;
  onChange?: (longitude: number, latitude: number) => void;
}> = ({ enabled, onChange }) => {
  useMapEvents({
    click(event) {
      if (enabled) onChange?.(event.latlng.lng, event.latlng.lat);
    },
  });
  return null;
};

/** OpenStreetMap view shared by the operator coordinate picker and public listing. */
export const VehicleLocationMap: React.FC<VehicleLocationMapProps> = ({
  coordinates,
  editable = false,
  label,
  onChange,
  className = "h-64",
  pickerHint = "Click the map to set the pickup point",
}) => {
  const valid =
    coordinates &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1]);
  const center: [number, number] = valid
    ? [coordinates[1], coordinates[0]]
    : TRIPOLI;

  return (
    <div
      className={`vehicle-location-map relative z-0 isolate overflow-hidden rounded-2xl border border-[#E2E8F0] ${className}`}
    >
      <MapContainer
        center={center}
        zoom={valid ? 15 : 11}
        scrollWheelZoom
        className="relative z-0 h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        <CompactAttribution />
        <CoordinatePicker enabled={editable} onChange={onChange} />
        {valid && (
          <CircleMarker
            center={center}
            radius={10}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }}
          >
            {label && <Popup>{label}</Popup>}
          </CircleMarker>
        )}
      </MapContainer>
      {editable && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#0B1C30] shadow-md">
          {pickerHint}
        </div>
      )}
    </div>
  );
};

export default VehicleLocationMap;
