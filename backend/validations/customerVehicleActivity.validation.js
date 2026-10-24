import { z } from "zod";
import { objectId } from "./common.validation.js";

export const vehicleActivityParamSchema = z.object({
  params: z.object({ vehicleId: objectId }),
});

export const favoriteVehicleSchema = z.object({
  params: z.object({ vehicleId: objectId }),
  body: z.object({ favorite: z.boolean() }).strict(),
});
