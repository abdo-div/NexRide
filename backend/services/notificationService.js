import mongoose from "mongoose";
import Booking from "../models/booking_model.js";
import Notification from "../models/Notification_model.js";
import User from "../models/User_model.js";
import Email from "../utils/email.js";
import { resolveClientUrl } from "../config/clientUrl.js";
import logger from "../utils/logger.js";

const bookingUrl = (bookingId) => `/my-bookings/${bookingId}`;

export const createCustomerNotification = async ({
  userId,
  bookingId = null,
  type,
  title,
  message,
  dedupeKey,
  sendEmail = true,
}) => {
  let notification;
  try {
    notification = await Notification.create({
      userId,
      bookingId,
      type,
      title,
      message,
      actionUrl: bookingId ? bookingUrl(bookingId) : "/my-bookings",
      dedupeKey,
      emailStatus: sendEmail ? "PENDING" : "NOT_REQUESTED",
    });
  } catch (error) {
    if (error?.code === 11000 && dedupeKey) {
      return Notification.findOne({ userId, dedupeKey });
    }
    throw error;
  }

  if (sendEmail) {
    const user = await User.findById(userId).select("name email");
    if (user?.email) {
      new Email(
        user,
        `${resolveClientUrl()}${notification.actionUrl}`,
      )
        .sendNotification({ title, message })
        .then(() =>
          Notification.findByIdAndUpdate(notification._id, {
            emailStatus: "SENT",
          }),
        )
        .catch((error) => {
          logger.warn(
            { err: error.message, notificationId: notification._id },
            "Customer notification email failed",
          );
          return Notification.findByIdAndUpdate(notification._id, {
            emailStatus: "FAILED",
          });
        });
    }
  }

  return notification;
};

export const notifyBookingEvent = async (booking, event) => {
  if (mongoose.connection.readyState === 0) return null;
  const customerId = booking.customerId?._id ?? booking.customerId;
  if (!customerId) return null;
  const id = booking._id.toString();
  const content = {
    BOOKING_CREATED: ["Reservation created", "Your reservation is saved. Complete payment to confirm it."],
    PAYMENT_COMPLETED: ["Payment completed", "Your payment was approved and the vehicle is reserved for you."],
    PAYMENT_FAILED: ["Payment not completed", "Payment was not completed and the vehicle has been released."],
    BOOKING_CONFIRMED: ["Booking confirmed", "Your rental company confirmed the booking."],
    BOOKING_CHANGED: ["Booking updated", "Your itinerary and price were updated successfully."],
    BOOKING_CANCELLED: ["Booking cancelled", "Your booking was cancelled. Any eligible refund will be tracked in your booking."],
  }[event];
  if (!content) return null;

  return createCustomerNotification({
    userId: customerId,
    bookingId: booking._id,
    type: event,
    title: content[0],
    message: content[1],
    dedupeKey: `${event}:${id}:${event === "BOOKING_CHANGED" ? booking.updatedAt?.getTime?.() ?? Date.now() : "v1"}`,
  });
};

export const listCustomerNotifications = async (userId, limit = 20) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(safeLimit),
    Notification.countDocuments({ userId, readAt: null }),
  ]);
  return { notifications, unreadCount };
};

export const markNotificationRead = (userId, notificationId) =>
  Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { readAt: new Date() } },
    { new: true },
  );

export const markAllNotificationsRead = (userId) =>
  Notification.updateMany(
    { userId, readAt: null },
    { $set: { readAt: new Date() } },
  );

export const sendDueBookingReminders = async ({ now = new Date() } = {}) => {
  const in23Hours = new Date(now.getTime() + 23 * 3600000);
  const in25Hours = new Date(now.getTime() + 25 * 3600000);
  const bookings = await Booking.find({
    bookingStatus: { $in: ["PAID", "CONFIRMED", "ACTIVE"] },
    $or: [
      { startDate: { $gte: in23Hours, $lte: in25Hours } },
      { endDate: { $gte: in23Hours, $lte: in25Hours } },
    ],
  });

  let sent = 0;
  for (const booking of bookings) {
    const customerId = booking.customerId?._id ?? booking.customerId;
    if (!customerId) continue;
    const isPickup = new Date(booking.startDate) >= in23Hours && new Date(booking.startDate) <= in25Hours;
    const type = isPickup ? "PICKUP_REMINDER" : "RETURN_REMINDER";
    await createCustomerNotification({
      userId: customerId,
      bookingId: booking._id,
      type,
      title: isPickup ? "Pickup tomorrow" : "Return due tomorrow",
      message: isPickup
        ? `Your vehicle pickup is scheduled for ${new Date(booking.startDate).toLocaleString()}.`
        : `Your vehicle return is scheduled for ${new Date(booking.endDate).toLocaleString()}.`,
      dedupeKey: `${type}:${booking._id}`,
    });
    sent += 1;
  }
  return sent;
};

let reminderTimer = null;
export const startNotificationReminderWorker = (intervalMs = 60 * 60 * 1000) => {
  if (reminderTimer) return reminderTimer;
  const sweep = () => sendDueBookingReminders().catch((error) =>
    logger.error({ err: error.message }, "Notification reminder sweep failed"),
  );
  sweep();
  reminderTimer = setInterval(sweep, intervalMs);
  reminderTimer.unref?.();
  return reminderTimer;
};

export const stopNotificationReminderWorker = () => {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = null;
};
