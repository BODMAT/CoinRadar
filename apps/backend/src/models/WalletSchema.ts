import { z } from "zod";

export const WalletSchema = z.object({
  id: z.string().uuid("ID має бути UUID"),
  name: z
    .string()
    .trim()
    .min(1, "Назва не може бути пустою")
    .max(20, "Назва має бути не більше 20 символів"),
  createdAt: z.date(),
  userId: z.string().uuid("ID має бути UUID"),

  //! transactions: z.array(TransactionResponseSchema).optional(),
  totalInvested: z.number().optional().default(0),
  totalRealizedPnL: z.number().optional().default(0),
});

export const WalletCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Назва не може бути пустою")
    .max(20, "Назва має бути не більше 20 символів"),
});

export const WalletPatchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Назва не може бути пустою")
    .max(20, "Назва має бути не більше 20 символів")
    .optional(),
});

export const WalletListItemResponseSchema = z.object({
  id: z.string().uuid("ID має бути UUID"),
  name: z
    .string()
    .trim()
    .min(1, "Назва не може бути пустою")
    .max(20, "Назва має бути не більше 20 символів"),
});
