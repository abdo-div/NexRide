import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("static deployment resilience", () => {
  it("uses hash routing so nested routes survive static-host refreshes", () => {
    const source = readSource("./App.tsx");
    expect(source).toContain("HashRouter");
    expect(source).not.toContain("BrowserRouter");
  });

  it("falls back to an embedded map when Mapbox is missing or rejected", () => {
    const source = readSource("./components/maps/VehicleLocationMap.tsx");
    expect(source).toContain("OpenStreetMapFallback");
    expect(source).toContain("!MAPBOX_TOKEN || mapError");
    expect(source).toContain("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
  });

  it("keeps the location picker editable on the OpenStreetMap fallback", () => {
    const source = readSource("./components/maps/VehicleLocationMap.tsx");
    expect(source).toContain('map.on("click"');
    expect(source).toContain('marker.on("dragend"');
    expect(source).toContain("scrollWheelZoom: true");
    expect(source).toContain("dragging: true");
    expect(source).toContain("editable={editable}");
    expect(source).toContain("onChange={onChange}");
  });

  it("keeps a booking retryable after temporary Moamalat gateway failures", () => {
    const paymentPage = readSource("./pages/PaymentPage.tsx");
    expect(paymentPage).toContain("showRetryableGatewayError");
    expect(paymentPage).toContain("getMoamalatErrorMessage(gatewayError)");
    expect(paymentPage).toContain('setStatus("ready")');
    expect(paymentPage).toContain('gatewayEnv === "test"');
    expect(paymentPage).toContain("6395 0431 6572 5698");
    expect(paymentPage).toContain("OTP: 111111");
    expect(paymentPage).toContain("handleSimulatedPayment");
    expect(paymentPage).toContain("moamalatApi.simulate");
    expect(paymentPage).toContain('activeGatewayEnv === "test"');
    expect(paymentPage).toContain("await completeTestPayment()");
  });
});
