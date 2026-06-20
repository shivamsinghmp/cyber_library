import { z } from "zod";

export const authorSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  slug: z
    .string()
    .min(1)
    .max(120)
    .transform((s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    ),
  bio: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
});

export type AuthorInput = z.infer<typeof authorSchema>;
