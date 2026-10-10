export const BOOKING_ADDONS = Object.freeze({
  insurance: Object.freeze({ unitPrice: 45, unit: "DAY" }),
  driver: Object.freeze({ unitPrice: 25, unit: "DAY" }),
  childseat: Object.freeze({ unitPrice: 20, unit: "FLAT" }),
  delivery: Object.freeze({ unitPrice: 50, unit: "FLAT" }),
});

export const MUNICIPAL_FEE_LYD = 25;

export const calculateBookingExtras = (addonIds = [], totalDays = 1) => {
  const uniqueIds = [...new Set(addonIds)];
  const addons = uniqueIds.map((id) => {
    const definition = BOOKING_ADDONS[id];
    if (!definition) throw new Error(`Unsupported booking add-on: ${id}`);
    const quantity = definition.unit === "DAY" ? totalDays : 1;
    return {
      id,
      unit: definition.unit,
      unitPrice: definition.unitPrice,
      quantity,
      amount: definition.unitPrice * quantity,
    };
  });

  return {
    addons,
    addonsTotal: addons.reduce((sum, addon) => sum + addon.amount, 0),
  };
};
