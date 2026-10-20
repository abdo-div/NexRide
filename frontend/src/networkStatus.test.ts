import { describe, expect, it } from "vitest";
import { nextNetworkNotice } from "./utils/networkStatus";
import en from "./i18n/locales/en.json";
import ar from "./i18n/locales/ar.json";

describe("network status notices", () => {
  it("shows an offline notice whenever the connection drops", () => {
    expect(nextNetworkNotice(null, "offline")).toBe("offline");
    expect(nextNetworkNotice("restored", "offline")).toBe("offline");
  });

  it("only announces restoration after an offline state", () => {
    expect(nextNetworkNotice("offline", "online")).toBe("restored");
    expect(nextNetworkNotice(null, "online")).toBeNull();
  });

  it("distinguishes API outages from browser connectivity", () => {
    expect(nextNetworkNotice(null, "api-unavailable")).toBe("serviceUnavailable");
    expect(nextNetworkNotice("serviceUnavailable", "api-available")).toBe("serviceRestored");
    expect(nextNetworkNotice("offline", "api-unavailable")).toBe("offline");
  });

  it("provides matching localized and accessible notice copy", () => {
    expect(Object.keys(ar.networkStatus)).toEqual(Object.keys(en.networkStatus));
    expect(en.networkStatus.dismiss).toBeTruthy();
    expect(ar.networkStatus.dismiss).toBeTruthy();
  });
});
