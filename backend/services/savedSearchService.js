import mongoose from "mongoose";
import SavedSearch from "../models/SavedSearch_model.js";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import { getPublicVehicleFilter } from "./vehicleService.js";
import { createCustomerNotification } from "./notificationService.js";

const MAX_SAVED_SEARCHES = 10;

export const listSavedSearches = (customerId) => SavedSearch.find({ customerId }).sort({ createdAt: -1 });

export const createSavedSearch = async (customerId, input) => {
  if (await SavedSearch.exists({ customerId, name: input.name })) throw new AppError("A saved search with this name already exists", 409);
  if (await SavedSearch.countDocuments({ customerId }) >= MAX_SAVED_SEARCHES) throw new AppError(`You can save up to ${MAX_SAVED_SEARCHES} searches`, 409);
  try {
    return await SavedSearch.create({ customerId, ...input });
  } catch (error) {
    if (error?.code === 11000) throw new AppError("A saved search with this name already exists", 409);
    throw error;
  }
};

export const updateSavedSearch = async (customerId, id, patch) => {
  const search = await SavedSearch.findOneAndUpdate({ _id: id, customerId }, patch, { new: true, runValidators: true });
  if (!search) throw new AppError("Saved search not found", 404);
  return search;
};

export const deleteSavedSearch = async (customerId, id) => {
  const search = await SavedSearch.findOneAndDelete({ _id: id, customerId });
  if (!search) throw new AppError("Saved search not found", 404);
};

export const matchesSavedSearch = (criteria, vehicle) => {
  if (criteria.location) {
    const needle = criteria.location.toLowerCase();
    if (![vehicle.city, vehicle.pickupLocation].some((value) => value?.toLowerCase().includes(needle))) return false;
  }
  if (criteria.type?.length && !criteria.type.includes(vehicle.type)) return false;
  if (criteria.transmission && criteria.transmission !== vehicle.transmission) return false;
  if (criteria.fuelType && criteria.fuelType !== vehicle.fuelType) return false;
  if (criteria.maxPrice != null && vehicle.dailyPrice > criteria.maxPrice) return false;
  return true;
};

export const notifySavedSearchMatches = async (vehicleId) => {
  if (mongoose.connection.readyState === 0) return 0;
  const vehicle = await Vehicle.findOne(await getPublicVehicleFilter(vehicleId));
  if (!vehicle) return 0;
  const searches = await SavedSearch.find({ alertsEnabled: true });
  const matched = searches.filter((search) => matchesSavedSearch(search.criteria, vehicle));
  await Promise.all(matched.map((search) => createCustomerNotification({
    userId: search.customerId,
    type: "SAVED_SEARCH_MATCH",
    title: "New vehicle matches your search",
    message: `${vehicle.make} ${vehicle.model} is now available for ${vehicle.dailyPrice.toLocaleString()} LYD per day.`,
    actionUrl: "/saved-searches",
    dedupeKey: `SAVED_SEARCH_MATCH:${search._id}:${vehicle._id}`,
  })));
  return matched.length;
};
