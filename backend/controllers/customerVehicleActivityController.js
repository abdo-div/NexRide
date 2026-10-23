import catchAsync from "../utils/catchAsync.js";
import {
  listCustomerVehicleActivity,
  recordVehicleView,
  setVehicleFavorite,
} from "../services/customerVehicleActivityService.js";

export const listActivity = catchAsync(async (req, res) => {
  const activity = await listCustomerVehicleActivity(req.user.id);
  res.status(200).json({ status: "success", data: activity });
});

export const updateFavorite = catchAsync(async (req, res) => {
  const result = await setVehicleFavorite(
    req.user.id,
    req.params.vehicleId,
    req.body.favorite,
  );
  res.status(200).json({ status: "success", data: result });
});

export const recordView = catchAsync(async (req, res) => {
  await recordVehicleView(req.user.id, req.params.vehicleId);
  res.status(204).send();
});
