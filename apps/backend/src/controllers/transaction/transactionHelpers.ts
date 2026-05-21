import type { Prisma } from "@prisma/client";

export type TransactionPayload = Prisma.TransactionGetPayload<{}>;

export type TransactionRow = {
  id: string;
  walletId: string;
  coinSymbol: string;
  swapGroupId: string | null;
  buyOrSell: "buy" | "sell";
  price: number | string;
  quantity: number | string;
  createdAt: Date;
  updatedAt: Date;
};

export const formatTransaction = (tx: TransactionPayload | TransactionRow) => ({
  ...tx,
  price: Number(tx.price),
  quantity: Number(tx.quantity),
  total: Number(tx.price) * Number(tx.quantity),
});
