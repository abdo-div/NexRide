import type { CompanyVehicleEditDraft } from "../hooks/useCompanyVehicleEditForm";

export const validateVehicleDraft = (draft: CompanyVehicleEditDraft) => {
  const errors: Record<string, string> = {};
  const required = ["make", "model", "year", "type", "transmission", "fuelType", "seats", "dailyPrice", "city", "pickupLocation"] as const;
  required.forEach((field) => {
    if (!draft[field].trim()) errors[field] = "company.vehicleValidation.required";
  });
  const year = Number(draft.year);
  if (draft.year && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1)) errors.year = "company.vehicleValidation.year";
  if (draft.seats && Number(draft.seats) < 1) errors.seats = "company.vehicleValidation.positive";
  if (draft.dailyPrice && Number(draft.dailyPrice) <= 0) errors.dailyPrice = "company.vehicleValidation.price";
  if (draft.weeklyPrice && Number(draft.weeklyPrice) <= 0) errors.weeklyPrice = "company.vehicleValidation.price";
  if (draft.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(draft.vin)) errors.vin = "company.vehicleValidation.vin";
  return errors;
};
