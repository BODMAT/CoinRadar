import { z } from "zod";

export const CreateSwapSchema = z.object({
  fromCoin: z.string().trim().toLowerCase().min(1),
  fromQuantity: z.number().positive(),
  fromPrice: z.number().positive(),
  toCoin: z.string().trim().toLowerCase().min(1),
  toQuantity: z.number().positive(),
  toPrice: z.number().positive(),
  createdAt: z.coerce.date().optional(),
});

export const UpdateSwapSettingsSchema = z.object({
  swapEnabled: z.boolean().optional(),
  stableCoins: z.array(z.string().trim().toLowerCase().min(1)).optional(),
});
