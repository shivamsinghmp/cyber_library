import { z } from "zod";

export const couponSchema = z.object({
  code: z.string().min(1).max(50).transform((s) => s.trim().toUpperCase()),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().int().min(0),
  minOrderAmount: z.number().int().min(0).nullable().optional(),
  maxTotalUses: z.number().int().min(0).nullable().optional(),
  validFrom: z
    .string()
    .nullable()
    .optional()
    .transform((s) => (s ? new Date(s).toISOString() : null)),
  validUntil: z
    .string()
    .nullable()
    .optional()
    .transform((s) => (s ? new Date(s).toISOString() : null)),
  isActive: z.boolean().optional().default(true),
  isPublic: z.boolean().optional().default(false),
  description: z.string().max(200).nullable().optional(),
});

export type CouponInput = z.infer<typeof couponSchema>;
