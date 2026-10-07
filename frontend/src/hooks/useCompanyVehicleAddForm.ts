import { useCallback, useMemo, useState } from "react";
import { ApiError } from "../lib/apiClient";
import { companyVehicleApi } from "../lib/companyVehicleApi";
import type { CompanyVehicleProfile } from "../types/companyVehicle";
import type {
  CompanyVehicleEditDraft,
  CompanyVehicleEditField,
  CompanyVehicleListingStatus,
} from "./useCompanyVehicleEditForm";

/** The shape of the form returned by this hook (compatible with edit-form card props). */
export type CompanyVehicleAddForm = ReturnType<typeof useCompanyVehicleAddForm>;

const EMPTY_DRAFT: CompanyVehicleEditDraft = {
  make: "",
  model: "",
  year: String(new Date().getFullYear()),
  type: "SEDAN",
  transmission: "AUTOMATIC",
  fuelType: "GASOLINE",
  seats: "5",
  doors: "4",
  description: "",
  dailyPrice: "",
  weeklyPrice: "",
  city: "",
  pickupLocation: "",
};

/** Placeholder vehicle so preview cards never receive null. */
const BLANK_VEHICLE: CompanyVehicleProfile = {
  id: "",
  code: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  type: "SEDAN",
  transmission: "AUTOMATIC",
  fuelType: "GASOLINE",
  seats: 5,
  doors: 4,
  description: null,
  dailyPrice: 0,
  weeklyPrice: null,
  city: "",
  pickupLocation: null,
  operationalStatus: "AVAILABLE",
  listingStatus: "DRAFT",
  photo: null,
  photos: [],
  gpsActive: false,
  coordinates: null,
  createdAt: null,
  displayStatus: "draft",
  rating: { average: null, count: 0 },
};

const toNumber = (value: string): number | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
};

/**
 * Manages the state for creating a new vehicle. Exposes exactly the same
 * property/method surface as `useCompanyVehicleEditForm` so every existing
 * edit-form card component can be passed an `AddForm` without any changes.
 */
export const useCompanyVehicleAddForm = (
  onCreated?: (vehicle: CompanyVehicleProfile) => void,
) => {
  const [draft, setDraftState] = useState<CompanyVehicleEditDraft>(EMPTY_DRAFT);
  const [listingStatus, setListingStatus] = useState<CompanyVehicleListingStatus>("DRAFT");
  const [photos] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    },
    [markEditing],
  );

  // Photos are upload-only for new vehicles (no existing server URLs yet).
  const setCover = useCallback(() => {}, []);
  const removePhoto = useCallback(() => {}, []);

  const addNewImages = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setNewImages((prev) => [...prev, ...files].slice(0, 8));
      markEditing();
    },
    [markEditing],
  );

  const removeNewImage = useCallback(
    (index: number) => {
      setNewImages((prev) => prev.filter((_, i) => i !== index));
      markEditing();
    },
    [markEditing],
  );

  const reset = useCallback(() => {
    setDraftState(EMPTY_DRAFT);
    setListingStatus("DRAFT");
    setNewImages([]);
    setSaved(false);
    setSaveError(null);
    setFieldErrors({});
  }, []);

  // Always "dirty" for a new vehicle — nothing to diff against.
  const dirty = true;
  const dirtyCount = 0;

  /** Preview composite built from the current draft + blank vehicle base. */
  const previewVehicle = useMemo<CompanyVehicleProfile>(() => {
    const year = toNumber(draft.year);
    const seats = toNumber(draft.seats);
    const doors = toNumber(draft.doors);
    const dailyPrice = toNumber(draft.dailyPrice);
    const weeklyPrice = toNumber(draft.weeklyPrice);
    return {
      ...BLANK_VEHICLE,
      make: draft.make.trim() || "Make",
      model: draft.model.trim() || "Model",
      year: year ?? new Date().getFullYear(),
      type: (draft.type || "SEDAN") as CompanyVehicleProfile["type"],
      transmission: (draft.transmission || "AUTOMATIC") as CompanyVehicleProfile["transmission"],
      fuelType: (draft.fuelType || "GASOLINE") as CompanyVehicleProfile["fuelType"],
      seats: seats ?? 5,
      doors: doors ?? 4,
      dailyPrice: dailyPrice ?? 0,
      weeklyPrice: weeklyPrice ?? null,
      city: draft.city.trim() || "",
      pickupLocation: draft.pickupLocation.trim() || null,
      description: draft.description || null,
      listingStatus,
    };
  }, [draft, listingStatus]);

  const save = useCallback(
    async (mode: "save" | "draft") => {
      setSaveError(null);
      setFieldErrors({});
      setSaving(true);

      try {
        const formData = new FormData();

        const appendIfValue = (key: string, value: string) => {
          if (value.trim() !== "") formData.append(key, value.trim());
        };

        appendIfValue("make", draft.make);
        appendIfValue("model", draft.model);
        appendIfValue("year", draft.year);
        appendIfValue("type", draft.type);
        appendIfValue("transmission", draft.transmission);
        appendIfValue("fuelType", draft.fuelType);
        appendIfValue("seats", draft.seats);
        if (draft.doors.trim()) appendIfValue("doors", draft.doors);
        if (draft.description.trim()) formData.append("description", draft.description.trim());
        appendIfValue("dailyPrice", draft.dailyPrice);
        if (draft.weeklyPrice.trim()) appendIfValue("weeklyPrice", draft.weeklyPrice);
        appendIfValue("city", draft.city);
        appendIfValue("pickupLocation", draft.pickupLocation);

        formData.append(
          "listingStatus",
          mode === "draft" ? "DRAFT" : listingStatus,
        );

        newImages.forEach((file) => formData.append("images", file));

        const response = await companyVehicleApi.create(formData);
        setSaved(true);
        onCreated?.(response.data.vehicle);
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
    [draft, listingStatus, newImages, onCreated],
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
