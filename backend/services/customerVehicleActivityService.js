import CustomerVehicleActivity from "../models/CustomerVehicleActivity_model.js";
import Vehicle from "../models/vehicle_model.js";
import AppError from "../utils/appError.js";
import { getPublicVehicleFilter } from "./vehicleService.js";

const assertPublicVehicle = async (vehicleId) => {
  const vehicle = await Vehicle.exists(await getPublicVehicleFilter(vehicleId));
  if (!vehicle) throw new AppError("Vehicle not found or unavailable", 404);
};

const populateVehicles = (query) =>
  query.populate({
    path: "vehicleId",
    populate: { path: "companyId", select: "name logo city status" },
  });

export const listCustomerVehicleActivity = async (customerId) => {
  const publicFilter = await getPublicVehicleFilter();
  const visibleIds = await Vehicle.find(publicFilter).distinct("_id");
  const visible = { customerId, vehicleId: { $in: visibleIds } };

  const [favorites, recentlyViewed] = await Promise.all([
    populateVehicles(
      CustomerVehicleActivity.find({ ...visible, favorite: true })
        .sort({ favoritedAt: -1 })
        .limit(100),
    ),
    populateVehicles(
      CustomerVehicleActivity.find({ ...visible, lastViewedAt: { $ne: null } })
        .sort({ lastViewedAt: -1 })
        .limit(20),
    ),
  ]);

  return {
    favorites: favorites.map((entry) => entry.vehicleId).filter(Boolean),
    recentlyViewed: recentlyViewed.map((entry) => entry.vehicleId).filter(Boolean),
  };
};

export const setVehicleFavorite = async (customerId, vehicleId, favorite) => {
  await assertPublicVehicle(vehicleId);
  await CustomerVehicleActivity.findOneAndUpdate(
    { customerId, vehicleId },
    { $set: { favorite, favoritedAt: favorite ? new Date() : null } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { vehicleId, favorite };
};

export const recordVehicleView = async (customerId, vehicleId) => {
  await assertPublicVehicle(vehicleId);
  await CustomerVehicleActivity.findOneAndUpdate(
    { customerId, vehicleId },
    { $set: { lastViewedAt: new Date() }, $inc: { viewCount: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};
