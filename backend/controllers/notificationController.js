import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import {
  listCustomerNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationService.js";

export const listNotifications = catchAsync(async (req, res) => {
  const data = await listCustomerNotifications(req.user.id, req.query.limit);
  res.status(200).json({ status: "success", data });
});

export const readNotification = catchAsync(async (req, res, next) => {
  const notification = await markNotificationRead(req.user.id, req.params.id);
  if (!notification) return next(new AppError("Notification not found", 404));
  res.status(200).json({ status: "success", data: { notification } });
});

export const readAllNotifications = catchAsync(async (req, res) => {
  await markAllNotificationsRead(req.user.id);
  res.status(200).json({ status: "success" });
});
