import { useCallback, useMemo, useState } from "react";
import { ApiError } from "../lib/apiClient";
import { companyVehicleApi } from "../lib/companyVehicleApi";
import type { CompanyVehicleProfile } from "../types/companyVehicle";

export type CompanyVehicleListingStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED";

/** The full editable state + actions exposed to the edit-form cards. */
export type CompanyVehicleEditForm = ReturnType<typeof useCompanyVehicleEditForm>;

/** Every editable scalar attribute, held as raw strings so inputs feed it directly. */
export type CompanyVehicleEditField =
  | "make"
  | "model"
  | "year"
  | "type"
  | "transmission"
  | "fuelType"
  | "seats"
  | "doors"
  | "description"
  | "dailyPrice"
  | "weeklyPrice"
  | "city"
  | "pickupLocation"
  | "plateNumber" | "vin" | "odometer" | "engine" | "drivetrain"
  | "exteriorColor" | "interiorColor" | "tankCapacity" | "features"
  | "monthlyPrice" | "depositAmount" | "mileageLimit" | "extraMileageFee"
  | "lng" | "lat";

export interface CompanyVehicleEditDraft {
  make: string;
  model: string;
  year: string;
  type: string;
  transmission: string;
  fuelType: string;
  seats: string;
  doors: string;
  description: string;
  dailyPrice: string;
  weeklyPrice: string;
  city: string;
  pickupLocation: string;
  plateNumber: string; vin: string; odometer: string; engine: string; drivetrain: string;
  exteriorColor: string; interiorColor: string; tankCapacity: string; features: string;
  monthlyPrice: string; depositAmount: string; mileageLimit: string; extraMileageFee: string;
  lng: string; lat: string;
}

/** Fields that arrive as numbers in the API contract. */
const numericKeys: CompanyVehicleEditField[] = [
  "year",
  "seats",
  "doors",
  "dailyPrice",
  "weeklyPrice",
  "odometer", "tankCapacity", "monthlyPrice", "depositAmount", "mileageLimit", "extraMileageFee",
  "lng", "lat",
];

const fromVehicle = (vehicle: CompanyVehicleProfile): CompanyVehicleEditDraft => ({
  make: vehicle.make ?? "",
  model: vehicle.model ?? "",
  year: vehicle.year != null ? String(vehicle.year) : "",
  type: vehicle.type ?? "",
  transmission: vehicle.transmission ?? "",
  fuelType: vehicle.fuelType ?? "",
  seats: vehicle.seats != null ? String(vehicle.seats) : "",
  doors: vehicle.doors != null ? String(vehicle.doors) : "",
  description: vehicle.description ?? "",
  dailyPrice: String(vehicle.dailyPrice ?? 0),
  weeklyPrice: vehicle.weeklyPrice != null ? String(vehicle.weeklyPrice) : "",
  city: vehicle.city ?? "",
  pickupLocation: vehicle.pickupLocation ?? "",
  plateNumber: vehicle.plateNumber ?? "", vin: vehicle.vin ?? "",
  odometer: vehicle.odometer != null ? String(vehicle.odometer) : "", engine: vehicle.engine ?? "",
  drivetrain: vehicle.drivetrain ?? "", exteriorColor: vehicle.exteriorColor ?? "",
  interiorColor: vehicle.interiorColor ?? "", tankCapacity: vehicle.tankCapacity != null ? String(vehicle.tankCapacity) : "",
  features: (vehicle.features ?? []).join(", "), monthlyPrice: vehicle.monthlyPrice != null ? String(vehicle.monthlyPrice) : "",
  depositAmount: String(vehicle.depositAmount ?? 0), mileageLimit: vehicle.mileageLimit != null ? String(vehicle.mileageLimit) : "",
  extraMileageFee: vehicle.extraMileageFee != null ? String(vehicle.extraMileageFee) : "",
  lng: vehicle.coordinates ? String(vehicle.coordinates[0]) : "", lat: vehicle.coordinates ? String(vehicle.coordinates[1]) : "",
});

const effectivePhotos = (vehicle: CompanyVehicleProfile): string[] =>
  vehicle.photos.length > 0 ? [...vehicle.photos] : vehicle.photo ? [vehicle.photo] : [];

/** Normalise a raw string against the stored value so e.g. "250.0" === "250". */
const comparable = (value: string, key: CompanyVehicleEditField): string => {
  if (numericKeys.includes(key)) {
    return value.trim() === "" ? "" : String(Number(value));
  }
  return value.trim();
};

const mapBase = (vehicle: CompanyVehicleProfile): Record<CompanyVehicleEditField, string> => ({
  make: vehicle.make ?? "",
  model: vehicle.model ?? "",
  year: vehicle.year != null ? String(vehicle.year) : "",
  type: vehicle.type ?? "",
  transmission: vehicle.transmission ?? "",
  fuelType: vehicle.fuelType ?? "",
  seats: vehicle.seats != null ? String(vehicle.seats) : "",
  doors: vehicle.doors != null ? String(vehicle.doors) : "",
  description: vehicle.description ?? "",
  dailyPrice: String(vehicle.dailyPrice ?? 0),
  weeklyPrice: vehicle.weeklyPrice != null ? String(vehicle.weeklyPrice) : "",
  city: vehicle.city ?? "",
  pickupLocation: vehicle.pickupLocation ?? "",
  plateNumber: vehicle.plateNumber ?? "", vin: vehicle.vin ?? "", odometer: vehicle.odometer != null ? String(vehicle.odometer) : "",
  engine: vehicle.engine ?? "", drivetrain: vehicle.drivetrain ?? "", exteriorColor: vehicle.exteriorColor ?? "",
  interiorColor: vehicle.interiorColor ?? "", tankCapacity: vehicle.tankCapacity != null ? String(vehicle.tankCapacity) : "",
  features: (vehicle.features ?? []).join(", "), monthlyPrice: vehicle.monthlyPrice != null ? String(vehicle.monthlyPrice) : "",
  depositAmount: String(vehicle.depositAmount ?? 0), mileageLimit: vehicle.mileageLimit != null ? String(vehicle.mileageLimit) : "",
  extraMileageFee: vehicle.extraMileageFee != null ? String(vehicle.extraMileageFee) : "",
  lng: vehicle.coordinates ? String(vehicle.coordinates[0]) : "", lat: vehicle.coordinates ? String(vehicle.coordinates[1]) : "",
});

const mapCurrent = (draft: CompanyVehicleEditDraft): Record<CompanyVehicleEditField, string> => ({
  make: draft.make,
  model: draft.model,
  year: draft.year,
  type: draft.type,
  transmission: draft.transmission,
  fuelType: draft.fuelType,
  seats: draft.seats,
  doors: draft.doors,
  description: draft.description,
  dailyPrice: draft.dailyPrice,
  weeklyPrice: draft.weeklyPrice,
  city: draft.city,
  pickupLocation: draft.pickupLocation,
  plateNumber: draft.plateNumber, vin: draft.vin, odometer: draft.odometer, engine: draft.engine,
  drivetrain: draft.drivetrain, exteriorColor: draft.exteriorColor, interiorColor: draft.interiorColor,
  tankCapacity: draft.tankCapacity, features: draft.features, monthlyPrice: draft.monthlyPrice,
  depositAmount: draft.depositAmount, mileageLimit: draft.mileageLimit, extraMileageFee: draft.extraMileageFee,
  lng: draft.lng, lat: draft.lat,
});

const toNumber = (value: string): number | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
};

/**
 * Holds the editable clone of one vehicle dossier and diffs it against the
 * server value so only genuinely changed fields are ever patched. Saving calls
 * the tenant-gated PATCH /cars/:id (JSON body, or multipart when new photos are
 * pending — uploads replace the current photo set). After a successful save the
 * dossier is refetched and every field is reseeded from the fresh record.
 */
export const useCompanyVehicleEditForm = (
  vehicle: CompanyVehicleProfile,
  onSaved: () => void = () => {},
) => {
  const [draft, setDraftState] = useState<CompanyVehicleEditDraft>(() =>
    fromVehicle(vehicle),
  );
  const [listingStatus, setListingStatus] = useState<CompanyVehicleListingStatus>(
    vehicle.listingStatus,
  );
  const [photos, setPhotos] = useState<string[]>(() => effectivePhotos(vehicle));
  const [newImages, setNewImages] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reseed the editable clone whenever the loaded vehicle is replaced (a fresh
  // record arrives after a successful save, or the user navigated elsewhere).
  // React's documented "adjust state during render" pattern keeps the reset in
  // sync with the changed record instead of cascading setState inside an effect.
  const [prevVehicle, setPrevVehicle] = useState(vehicle);
  if (vehicle !== prevVehicle) {
    setPrevVehicle(vehicle);
    setDraftState(fromVehicle(vehicle));
    setListingStatus(vehicle.listingStatus);
    setPhotos(effectivePhotos(vehicle));
    setNewImages([]);
    setSaveError(null);
    setFieldErrors({});
  }

  const markEditing = useCallback(() => {
    setSaved(false);
    setSaveError(null);
  }, []);

  const setField = useCallback(
    (field: CompanyVehicleEditField, value: string) => {
      setDraftState((prev) => ({ ...prev, [field]: value }));
      markEditing();
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [markEditing],
  );

  const changeListingStatus = useCallback(
    (status: CompanyVehicleListingStatus) => {
      setListingStatus(status);
      markEditing();
      setFieldErrors((prev) => {
        if (!prev.listingStatus) return prev;
        const next = { ...prev };
        delete next.listingStatus;
        return next;
      });
    },
    [markEditing],
  );

  const setCover = useCallback(
    (index: number) => {
      setPhotos((prev) => {
        const next = [...prev];
        const [item] = next.splice(index, 1);
        next.unshift(item);
        return next;
      });
      markEditing();
    },
    [markEditing],
  );

  const removePhoto = useCallback(
    (index: number) => {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
      markEditing();
    },
    [markEditing],
  );

  const addNewImages = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setNewImages((prev) => [...prev, ...files].slice(0, Math.max(0, 8 - photos.length)));
      markEditing();
    },
    [markEditing, photos.length],
  );

  const removeNewImage = useCallback(
    (index: number) => {
      setNewImages((prev) => prev.filter((_, i) => i !== index));
      markEditing();
    },
    [markEditing],
  );

  const reset = useCallback(() => {
    setDraftState(fromVehicle(vehicle));
    setListingStatus(vehicle.listingStatus);
    setPhotos(effectivePhotos(vehicle));
    setNewImages([]);
    setSaved(false);
    setSaveError(null);
    setFieldErrors({});
  }, [vehicle]);

  const changed = useMemo(() => {
    const base = mapBase(vehicle);
    const current = mapCurrent(draft);
    const fields: CompanyVehicleEditField[] = [];
    (Object.keys(current) as CompanyVehicleEditField[]).forEach((key) => {
      if (comparable(current[key], key) !== comparable(base[key], key)) {
        fields.push(key);
      }
    });
    const photosChanged =
      photos.join("\u0000") !== effectivePhotos(vehicle).join("\u0000");
    const listingChanged = listingStatus !== vehicle.listingStatus;
    return { fields, photosChanged, listingChanged };
  }, [draft, photos, listingStatus, vehicle]);

  const dirty = useMemo(
    () =>
      changed.fields.length > 0 || changed.photosChanged || changed.listingChanged || newImages.length > 0,
    [changed, newImages.length],
  );

  const dirtyCount = useMemo(
    () =>
      changed.fields.length +
      (changed.photosChanged ? 1 : 0) +
      (changed.listingChanged ? 1 : 0) +
      newImages.length,
    [changed, newImages.length],
  );

  const previewVehicle = useMemo<CompanyVehicleProfile>(() => {
    const year = toNumber(draft.year);
    const seats = toNumber(draft.seats);
    const doors = toNumber(draft.doors);
    const dailyPrice = toNumber(draft.dailyPrice);
    const weeklyPrice = toNumber(draft.weeklyPrice);
    return {
      ...vehicle,
      make: draft.make.trim() || vehicle.make,
      model: draft.model.trim() || vehicle.model,
      year: year ?? vehicle.year,
      type: (draft.type || vehicle.type) as CompanyVehicleProfile["type"],
      transmission: (draft.transmission ||
        vehicle.transmission) as CompanyVehicleProfile["transmission"],
      fuelType: (draft.fuelType || vehicle.fuelType) as CompanyVehicleProfile["fuelType"],
      seats: seats ?? vehicle.seats,
      doors: doors ?? vehicle.doors,
      dailyPrice: dailyPrice ?? 0,
      weeklyPrice: weeklyPrice ?? null,
      city: draft.city.trim() || vehicle.city,
      pickupLocation: draft.pickupLocation.trim() || vehicle.pickupLocation,
      description: draft.description || null,
      listingStatus,
      photos,
      photo: photos[0] ?? vehicle.photo,
    };
  }, [vehicle, draft, photos, listingStatus]);

  const save = useCallback(
    async (mode: "save" | "draft") => {
      setSaveError(null);
      setFieldErrors({});
      setSaving(true);
      try {
        const current = mapCurrent(draft);
        const payload: Record<string, unknown> = {};

        if (mode === "draft") {
          // "Save as draft" always parks the listing in DRAFT regardless of the
          // status toggle; a tone change cannot slip a published listing out or
          // publish one while the operator only asked to save their work.
          payload.listingStatus = "DRAFT";
        } else if (changed.listingChanged) {
          payload.listingStatus = listingStatus;
        }

        changed.fields.forEach((key) => {
          const raw = current[key];
          switch (key) {
            case "make":
            case "model":
            case "city":
            case "pickupLocation":
              payload[key] = raw.trim();
              break;
            case "description":
              payload[key] = raw;
              break;
            case "year":
            case "seats":
            case "doors":
            case "dailyPrice":
              // Clearing a required number cannot be stored, so the field is
              // simply omitted and the refetch restores the previous value.
              if (raw.trim() !== "") payload[key] = Number(raw);
              break;
            case "weeklyPrice":
              payload[key] = raw.trim() === "" ? null : Number(raw);
              break;
            case "type":
            case "transmission":
            case "fuelType":
              payload[key] = raw.trim();
              break;
            default:
              payload[key] = raw.trim();
          }
        });

        if (changed.photosChanged) payload.photos = photos;

        if (newImages.length > 0) {
          const formData = new FormData();
          Object.entries(payload).forEach(([key, value]) => {
            // Multipart fields are strings. A null (cleared weekly rate) is
            // conveyed as an empty string — the backend normalises "" back to
            // null — and uploads replace the photo set, so the new filenames
            // from `photos` cannot cross this wire and are skipped here.
            if (Array.isArray(value)) return;
            formData.append(key, value === null ? "" : String(value));
          });
          newImages.forEach((file) => formData.append("images", file));
          await companyVehicleApi.update(vehicle.id, formData);
        } else {
          await companyVehicleApi.update(vehicle.id, payload);
        }

        setSaved(true);
        onSaved();
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.fieldErrors.length > 0) {
            const map: Record<string, string> = {};
            error.fieldErrors.forEach((item) => {
              const field = item.field.replace(/^body\./, "");
              map[field] = item.message;
            });
            setFieldErrors(map);
          }
          setSaveError(error.message || "Request failed");
        } else {
          setSaveError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        setSaving(false);
      }
    },
    [vehicle, draft, photos, listingStatus, newImages, changed, onSaved],
  );

  const saveChanges = useCallback(() => save("save"), [save]);
  const saveDraft = useCallback(() => save("draft"), [save]);

  return {
    draft,
    listingStatus,
    photos,
    newImages,
    previewVehicle,
    dirty,
    dirtyCount,
    saving,
    saved,
    saveError,
    fieldErrors,
    setField,
    changeListingStatus,
    setCover,
    removePhoto,
    addNewImages,
    removeNewImage,
    reset,
    saveChanges,
    saveDraft,
  };
};
