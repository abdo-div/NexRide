import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.object({
    body: z
      .string()
      .trim()
      .min(1, "Message text cannot be empty")
      .max(4000, "Message cannot exceed 4000 characters"),
  }),
});

export const broadcastNoticeSchema = z.object({
  body: z.object({
    body: z
      .string()
      .trim()
      .min(1, "Broadcast text cannot be empty")
      .max(2000, "Broadcast cannot exceed 2000 characters"),
  }),
});
