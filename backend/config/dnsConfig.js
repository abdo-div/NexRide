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
  const servers = parseDnsServers(value);
  if (servers.length > 0) {
    resolver.setServers(servers);
  }
  return servers;
};
