import { z } from "zod";

export const subscribeNewsletterSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Please enter a valid email address").max(254),
    locale: z.enum(["ar", "en"]).default("ar"),
  }),
});
