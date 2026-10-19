import dns from "node:dns";
import { isIP } from "node:net";

export const parseDnsServers = (value) => {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((server) => server.trim())
    .filter((server) => server.length > 0 && isIP(server) !== 0);
};

export const configureDnsServers = (value, resolver = dns) => {
  // Node's fetch/undici resolves hosts through dns.lookup(), which is not
  // affected by setServers(). Render can return Moamalat's AAAA record first
  // even though the service has no working IPv6 egress, producing a generic
  // `fetch failed` before an HTTP response exists. Prefer the gateway's A
  // record while retaining IPv6 as a fallback.
  resolver.setDefaultResultOrder?.("ipv4first");

  const servers = parseDnsServers(value);
  if (servers.length > 0) {
    resolver.setServers(servers);
  }
  return servers;
};
