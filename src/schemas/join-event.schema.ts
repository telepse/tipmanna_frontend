import * as z from "zod";

export const joinEventSchema = z.object({
  eventCode: z.string().min(1, "Enter a keyword"),
});

export type JoinEventFormData = z.infer<typeof joinEventSchema>;
