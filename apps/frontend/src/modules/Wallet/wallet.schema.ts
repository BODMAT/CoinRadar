import { z } from "zod";

export const WalletSchema = z.object({
  id: z.string().uuid("ID must be UUID"),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(20, "Name must be at most 20 characters"),
  createdAt: z.coerce.date(),
  userId: z.string().uuid("ID must be UUID"),

  totalInvested: z.number().optional().default(0),
  totalRealizedPnL: z.number().optional().default(0),
});

export const WalletCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(20, "Name must be at most 20 characters"),
});

export const WalletPatchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(20, "Name must be at most 20 characters")
    .optional(),
});

export const WalletListItemResponseSchema = z.object({
  id: z.string().uuid("ID must be UUID"),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(20, "Name must be at most 20 characters"),

  totalInvested: z.number().optional().default(0),
  totalRealizedPnL: z.number().optional().default(0),
});

export type WalletListItem = z.infer<typeof WalletListItemResponseSchema>;
export type Wallet = z.infer<typeof WalletSchema>;
export type WalletCreate = z.infer<typeof WalletCreateSchema>;
export type WalletPatch = z.infer<typeof WalletPatchSchema>;
