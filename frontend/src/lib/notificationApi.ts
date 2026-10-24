import { request } from "./apiClient";

export interface CustomerNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationListResponse {
  status: string;
  data: { notifications: CustomerNotification[]; unreadCount: number };
}

export const notificationApi = {
  list: (signal?: AbortSignal) =>
    request<NotificationListResponse>("/notifications?limit=20", { signal }),
  markRead: (id: string) =>
    request(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
  markAllRead: () => request("/notifications/read-all", { method: "PATCH" }),
};
