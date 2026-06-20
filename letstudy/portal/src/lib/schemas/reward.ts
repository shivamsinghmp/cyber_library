import { z } from "zod";

export const rewardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().int().min(0),
  enrollmentAmount: z.number().int().min(0).optional().default(0),
  type: z.enum(["STREAK", "REFERRAL", "CONTEST", "STUDY", "OTHER"]).default("OTHER"),
  isActive: z.boolean().default(true),
});

export type RewardInput = z.infer<typeof rewardSchema>;
