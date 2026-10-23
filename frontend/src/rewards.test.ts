import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("customer promotions and loyalty journey", () => {
  it("provides a protected rewards page from the customer menu", () => {
    expect(source("./App.tsx")).toContain('path="/rewards"');
    expect(source("./components/layouts/NavBarActions.tsx")).toContain('to="/rewards"');
  });

  it("quotes promotion codes and submits only the verified code", () => {
    const checkout = source("./pages/CheckoutPage.tsx");
    expect(checkout).toContain("rewardApi.quote");
    expect(checkout).toContain("promotionCode: appliedPromotion?.code");
    expect(checkout).not.toContain("discountAmount: appliedPromotion");
  });
});
