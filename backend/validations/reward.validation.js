import { z } from "zod";
import { objectId, isoDate } from "./common.validation.js";

export const promotionQuoteSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1).max(32),
    vehicleId: objectId,
    startDate: isoDate,
    endDate: isoDate,
    addonIds: z.array(z.enum(["insurance", "driver", "childseat", "delivery"])).max(4).default([]),
  }).strict().refine((value) => new Date(value.endDate) > new Date(value.startDate), { message: "End date must be after start date", path: ["endDate"] }),
});
