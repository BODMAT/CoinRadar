import { z } from "zod";

export const WalletSchema = z.object({
  id: z.string().uuid("ID must be UUID"),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(20, "Name must be at most 20 characters"),
  createdAt: z.date(),
  userId: z.string().uuid("ID must be UUID"),

  //! transactions: z.array(TransactionResponseSchema).optional(),
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
});
