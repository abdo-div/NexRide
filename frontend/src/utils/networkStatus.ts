export type NetworkNotice = "offline" | "restored" | null;

export function nextNetworkNotice(
  current: NetworkNotice,
  event: "online" | "offline",
): NetworkNotice {
  if (event === "offline") return "offline";
  return current === "offline" ? "restored" : null;
}
