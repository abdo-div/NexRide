import { afterEach, describe, expect, it, vi } from "vitest";
import { notificationApi } from "./notificationApi";

afterEach(() => vi.restoreAllMocks());

const ok = () =>
  Promise.resolve(
    new Response(JSON.stringify({ status: "success", data: { notifications: [], unreadCount: 0 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

describe("notificationApi", () => {
  it("loads the customer notification inbox", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(ok);
    await notificationApi.list();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/notifications?limit=20");
  });

  it("marks one or every notification as read", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(ok);
    await notificationApi.markRead("abc");
    await notificationApi.markAllRead();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/notifications/abc/read");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/notifications/read-all");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PATCH" });
  });
});
