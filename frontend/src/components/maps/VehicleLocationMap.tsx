import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import L from "leaflet";
import "mapbox-gl/dist/mapbox-gl.css";
import "leaflet/dist/leaflet.css";

const TRIPOLI: [number, number] = [13.1913, 32.8872];
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
const MAP_STYLE = "mapbox://styles/mapbox/standard";

const OpenStreetMapFallback: React.FC<{
  coordinates?: [number, number] | null;
  editable: boolean;
  label?: string;
  onChange?: (longitude: number, latitude: number) => void;
  className: string;
  pickerHint: string;
}> = ({ coordinates, editable, label, onChange, className, pickerHint }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const editableRef = useRef(editable);
  const labelRef = useRef(label);
  const initialCoordinatesRef = useRef<[number, number]>(
    isValidCoordinate(coordinates) ? coordinates : TRIPOLI,
  );
  const initiallyValidRef = useRef(isValidCoordinate(coordinates));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    labelRef.current = label;
    const markerElement = markerRef.current?.getElement();
    if (markerElement) markerElement.setAttribute("title", label || "Selected location");
  }, [label]);

  useEffect(() => {
    editableRef.current = editable;
    const marker = markerRef.current;
    if (marker) {
      if (editable) marker.dragging?.enable();
      else marker.dragging?.disable();
    }
    const map = mapRef.current;
    if (map) map.getContainer().style.cursor = editable ? "crosshair" : "grab";
  }, [editable]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialPoint = initialCoordinatesRef.current;
    const map = L.map(container, {
      center: [initialPoint[1], initialPoint[0]],
      zoom: initiallyValidRef.current ? 15 : 12,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
    });
    mapRef.current = map;
    map.getContainer().style.cursor = editableRef.current ? "crosshair" : "grab";

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const createMarker = (longitude: number, latitude: number) => {
      const marker = L.marker([latitude, longitude], {
        draggable: editableRef.current,
        icon: L.divIcon({
          className: "nexride-osm-marker-icon",
          html: '<span class="nexride-osm-marker" aria-hidden="true"></span>',
          iconSize: [34, 42],
          iconAnchor: [17, 40],
        }),
        title: labelRef.current || "Selected location",
      }).addTo(map);
      marker.on("dragend", () => {
        const next = marker.getLatLng();
        onChangeRef.current?.(next.lng, next.lat);
      });
      markerRef.current = marker;
      return marker;
    };

    if (initiallyValidRef.current) createMarker(initialPoint[0], initialPoint[1]);

    map.on("click", (event) => {
      if (!editableRef.current) return;
      const marker =
        markerRef.current ?? createMarker(event.latlng.lng, event.latlng.lat);
      marker.setLatLng(event.latlng);
      onChangeRef.current?.(event.latlng.lng, event.latlng.lat);
    });

    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);

    return () => {
      observer.disconnect();
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isValidCoordinate(coordinates)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([coordinates[1], coordinates[0]]);
      return;
    }

    const marker = L.marker([coordinates[1], coordinates[0]], {
      draggable: editable,
      icon: L.divIcon({
        className: "nexride-osm-marker-icon",
        html: '<span class="nexride-osm-marker" aria-hidden="true"></span>',
        iconSize: [34, 42],
        iconAnchor: [17, 40],
      }),
      title: label || "Selected location",
    }).addTo(map);
    marker.on("dragend", () => {
      const next = marker.getLatLng();
      onChangeRef.current?.(next.lng, next.lat);
    });
    markerRef.current = marker;
  }, [coordinates, editable, label]);

  return (
    <div
      className={`vehicle-location-map relative isolate overflow-hidden rounded-2xl border border-[#D8E2F0] bg-slate-100 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.55)] ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" aria-label={label || "Location map"} />
      {editable && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/70 bg-white/95 px-3.5 py-2 text-xs font-bold text-[#0B1C30] shadow-lg backdrop-blur-md">
          {pickerHint}
        </div>
      )}
    </div>
  );
};

interface VehicleLocationMapProps {
  coordinates?: [number, number] | null; // GeoJSON and Mapbox order: [longitude, latitude]
  editable?: boolean;
  label?: string;
  onChange?: (longitude: number, latitude: number) => void;
  className?: string;
  pickerHint?: string;
}

const isValidCoordinate = (
  coordinates?: [number, number] | null,
): coordinates is [number, number] =>
  Boolean(
    coordinates &&
      Number.isFinite(coordinates[0]) &&
      Number.isFinite(coordinates[1]) &&
      coordinates[0] >= -180 &&
      coordinates[0] <= 180 &&
      coordinates[1] >= -90 &&
      coordinates[1] <= 90,
  );

/** Mapbox view shared by public listings and editable operator location forms. */
export const VehicleLocationMap: React.FC<VehicleLocationMapProps> = ({
  coordinates,
  editable = false,
  label,
  onChange,
  className = "h-64",
  pickerHint = "Click the map to set the pickup point",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onChangeRef = useRef(onChange);
  const editableRef = useRef(editable);
  const initialCoordinatesRef = useRef<[number, number]>(
    isValidCoordinate(coordinates) ? coordinates : TRIPOLI,
  );
  const initiallyValidRef = useRef(isValidCoordinate(coordinates));
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    editableRef.current = editable;
    const map = mapRef.current;
    markerRef.current?.setDraggable(editable);
    if (map) map.getCanvas().style.cursor = editable ? "crosshair" : "grab";
  }, [editable]);

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;

    const map = new mapboxgl.Map({
      accessToken: MAPBOX_TOKEN,
      container: containerRef.current,
      style: MAP_STYLE,
      center: initialCoordinatesRef.current,
      zoom: initiallyValidRef.current ? 15 : 10.5,
      pitch: editableRef.current ? 0 : 28,
      bearing: 0,
      cooperativeGestures: true,
      attributionControl: false,
    });
    mapRef.current = map;
    map.getCanvas().style.cursor = editableRef.current ? "crosshair" : "grab";

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }),
      "top-left",
    );
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    const createMarker = (point: [number, number]) => {
      const marker = new mapboxgl.Marker({
        color: "#1769ff",
        draggable: editableRef.current,
        scale: 0.92,
      })
        .setLngLat(point)
        .addTo(map);

      marker.on("dragend", () => {
        const next = marker.getLngLat();
        onChangeRef.current?.(next.lng, next.lat);
      });
      markerRef.current = marker;
      return marker;
    };

    if (initiallyValidRef.current) createMarker(initialCoordinatesRef.current);

    map.on("click", (event) => {
      if (!editableRef.current) return;
      const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      const marker = markerRef.current ?? createMarker(point);
      marker.setLngLat(point);
      onChangeRef.current?.(point[0], point[1]);
    });

    map.on("style.load", () => {
      const language = document.documentElement.lang.toLowerCase().startsWith("ar")
        ? "ar"
        : "en";
      map.setConfigProperty("basemap", "language", language);
      map.setConfigProperty("basemap", "lightPreset", "day");
      map.setConfigProperty("basemap", "show3dObjects", !editableRef.current);
    });

    map.on("error", (event) => {
      if (event.error) setMapError("The map could not be loaded. Please try again.");
    });

    resizeObserverRef.current = new ResizeObserver(() => map.resize());
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isValidCoordinate(coordinates)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    let marker = markerRef.current;
    if (!marker) {
      marker = new mapboxgl.Marker({ color: "#1769ff", draggable: editable, scale: 0.92 })
        .setLngLat(coordinates)
        .addTo(map);
      marker.on("dragend", () => {
        const next = marker?.getLngLat();
        if (next) onChangeRef.current?.(next.lng, next.lat);
      });
      markerRef.current = marker;
    } else {
      marker.setLngLat(coordinates).setDraggable(editable);
    }

    if (label) {
      marker.setPopup(
        new mapboxgl.Popup({ offset: 28, closeButton: false, className: "nexride-map-popup" })
          .setText(label),
      );
    } else {
      marker.setPopup(null);
    }

    map.easeTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), 14),
      duration: 650,
      essential: true,
    });
  }, [coordinates, editable, label]);

  if (!MAPBOX_TOKEN || mapError) {
    return (
      <OpenStreetMapFallback
        coordinates={coordinates}
        editable={editable}
        label={label}
        onChange={onChange}
        className={className}
        pickerHint={pickerHint}
      />
    );
  }

  return (
    <div
      className={`vehicle-location-map relative z-0 isolate overflow-hidden rounded-2xl border border-[#D8E2F0] bg-slate-100 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.55)] ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" aria-label={label || "Location map"} />

      {editable && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/70 bg-white/95 px-3.5 py-2 text-xs font-bold text-[#0B1C30] shadow-lg backdrop-blur-md">
          {pickerHint}
        </div>
      )}
    </div>
  );
};

export default VehicleLocationMap;
