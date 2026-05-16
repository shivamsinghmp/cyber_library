import { z } from "zod";

export const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type FaqInput = z.infer<typeof faqSchema>;
