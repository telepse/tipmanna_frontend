import * as z from "zod";

export const searchVideoSchema = z.object({
  searchTerm: z.string().min(1, "Enter a search term"),
});

export type SearchVideoFormData = z.infer<typeof searchVideoSchema>;
