export type NetworkNotice =
  | "offline"
  | "restored"
  | "serviceUnavailable"
  | "serviceRestored"
  | null;

export type NetworkStatusEvent =
  | "online"
  | "offline"
  | "api-unavailable"
  | "api-available";

export function nextNetworkNotice(
  current: NetworkNotice,
  event: NetworkStatusEvent,
): NetworkNotice {
  if (event === "offline") return "offline";
  if (event === "online") return current === "offline" ? "restored" : current;
  if (event === "api-unavailable") {
    return current === "offline" ? current : "serviceUnavailable";
  }
  return current === "serviceUnavailable" ? "serviceRestored" : current;
}
