import type { Request, Response } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import prisma from "../../prisma.js";
import {
  TransactionResponseSchema,
  CreateTransactionDto,
  PaginatedTransactionsSchema,
} from "../../models/TransactionSchema.js";
import { getCoinBalance, handleZodError } from "../../utils/helpers.js";
import {
  formatTransaction,
  type TransactionRow,
} from "./transactionHelpers.js";

const TransactionsArraySchema = z.array(TransactionResponseSchema);

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    if (!walletId) {
      return res.status(400).json({ error: "Wallet ID is required." });
    }

    const transactions = await prisma.$queryRaw<TransactionRow[]>`
      SELECT
        "id",
        "walletId",
        "coinSymbol",
        "swapGroupId",
        "buyOrSell",
        "price",
        "quantity",
        "createdAt",
        "updatedAt"
      FROM "Transaction"
      WHERE "walletId" = ${walletId}
      ORDER BY "createdAt" DESC, "id" DESC;
    `;

    // const transactions = await prisma.transaction.findMany({
    //   where: { walletId },
    //   orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    // });

    const formatted = transactions.map((tx: TransactionRow) =>
      formatTransaction(tx),
    );

    const validatedTransactions = TransactionsArraySchema.parse(formatted);
    return res.status(200).json(validatedTransactions);
  } catch (error: any) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ======================================================================

export const getPaginatedTransactions = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    if (!walletId) {
      return res.status(400).json({ error: "Wallet ID is required." });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [countRow] = await prisma.$queryRaw<{ total: bigint | number }[]>`
      SELECT COUNT(*) AS "total"
      FROM "Transaction"
      WHERE "walletId" = ${walletId};
    `;

    const transactions = await prisma.$queryRaw<TransactionRow[]>`
      SELECT
        "id",
        "walletId",
        "coinSymbol",
        "swapGroupId",
        "buyOrSell",
        "price",
        "quantity",
        "createdAt",
        "updatedAt"
      FROM "Transaction"
      WHERE "walletId" = ${walletId}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT ${limit} OFFSET ${skip};
    `;

    // const [totalCount, transactions] = await prisma.$transaction([
    //   prisma.transaction.count({ where: { walletId } }),
    //   prisma.transaction.findMany({
    //     where: { walletId },
    //     orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    //     take: limit,
    //     skip: skip,
    //   }),
    // ]);

    const totalCount = Number(countRow?.total ?? 0);
    const formatted = transactions.map((tx: TransactionRow) =>
      formatTransaction(tx),
    );

    const responsePayload = {
      data: formatted,
      meta: {
        total: totalCount,
        page: page,
        last_page: Math.ceil(totalCount / limit),
        per_page: limit,
      },
    };

    const validatedResponse =
      PaginatedTransactionsSchema.parse(responsePayload);

    return res.status(200).json(validatedResponse);
  } catch (error: any) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Error fetching paginated transactions:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ======================================================================

export const getTransaction = async (req: Request, res: Response) => {
  try {
    const { walletId, transactionId } = req.params;
    if (!walletId || !transactionId) {
      return res
        .status(400)
        .json({ error: "Wallet ID and Transaction ID are required." });
    }

    const [transaction] = await prisma.$queryRaw<TransactionRow[]>`
      SELECT
        "id",
        "walletId",
        "coinSymbol",
        "swapGroupId",
        "buyOrSell",
        "price",
        "quantity",
        "createdAt",
        "updatedAt"
      FROM "Transaction"
      WHERE "id" = ${transactionId} AND "walletId" = ${walletId}
      LIMIT 1;
    `;

    // const transaction = await prisma.transaction.findFirst({
    //   where: { id: transactionId, walletId },
    // });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const formatted = formatTransaction(transaction);
    const validatedResponse = TransactionResponseSchema.parse(formatted);

    return res.status(200).json(validatedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ======================================================================

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    if (!walletId) {
      return res.status(400).json({ error: "Wallet ID is required." });
    }

    const validationResult = CreateTransactionDto.safeParse({
      ...req.body,
      walletId,
    });

    if (!validationResult.success) {
      return handleZodError(res, validationResult.error);
    }

    const { coinSymbol, buyOrSell, price, quantity, createdAt } =
      validationResult.data;
    const txDate = createdAt ?? new Date();

    if (buyOrSell === "sell") {
      const balanceAtTime = await getCoinBalance(walletId, coinSymbol, txDate);

      if (balanceAtTime < quantity) {
        return res.status(400).json({
          error: `Insufficient funds. Available balance was ${balanceAtTime} ${coinSymbol.toUpperCase()} up to transaction time (${txDate.toLocaleString()}), but tried to sell ${quantity}.`,
        });
      }
    }

    const [newTransaction] = await prisma.$queryRaw<TransactionRow[]>`
      INSERT INTO "Transaction" (
        "id",
        "walletId",
        "coinSymbol",
        "swapGroupId",
        "buyOrSell",
        "price",
        "quantity",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${walletId},
        ${coinSymbol},
        NULL,
        ${buyOrSell}::"BuyOrSell",
        ${price}::numeric,
        ${quantity}::numeric,
        ${txDate},
        NOW()
      )
      RETURNING
        "id",
        "walletId",
        "coinSymbol",
        "swapGroupId",
        "buyOrSell",
        "price",
        "quantity",
        "createdAt",
        "updatedAt";
    `;

    // const newTransaction = await prisma.transaction.create({
    //   data: {
    //     walletId,
    //     coinSymbol,
    //     buyOrSell,
    //     price,
    //     quantity,
    //     createdAt,
    //   },
    // });

    if (!newTransaction) {
      return res.status(500).json({ error: "Failed to create transaction." });
    }

    const formatted = formatTransaction(newTransaction);
    const response = TransactionResponseSchema.parse(formatted);

    return res.status(201).json(response);
  } catch (error: any) {
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Wallet not found." });
    }
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Error creating transaction:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ======================================================================

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId, walletId } = req.params;
    if (!walletId || !transactionId) {
      return res
        .status(400)
        .json({ error: "Wallet ID and Transaction ID are required." });
    }

    const [transactionToDelete] = await prisma.$queryRaw<TransactionRow[]>`
      SELECT
        "id",
        "walletId",
        "coinSymbol",
        "swapGroupId",
        "buyOrSell",
        "price",
        "quantity",
        "createdAt",
        "updatedAt"
      FROM "Transaction"
      WHERE "id" = ${transactionId} AND "walletId" = ${walletId}
      LIMIT 1;
    `;

    // const transactionToDelete = await prisma.transaction.findFirst({
    //   where: { id: transactionId, walletId },
    // });

    if (!transactionToDelete)
      return res.status(404).json({ error: "Transaction not found" });

    const symbol = transactionToDelete.coinSymbol;

    if (transactionToDelete.buyOrSell === "buy") {
      // Canonical chronology: (createdAt ASC, id ASC).
      // To validate deletion, replay full history without the target buy.
      const remainingTransactions = await prisma.$queryRaw<
        { buyOrSell: "buy" | "sell"; quantity: number | string }[]
      >`
        SELECT "buyOrSell", "quantity"
        FROM "Transaction"
        WHERE
          "walletId" = ${walletId}
          AND "coinSymbol" = ${symbol}
          AND "id" <> ${transactionId}
        ORDER BY "createdAt" ASC, "id" ASC;
      `;

      // const remainingTransactions = await prisma.transaction.findMany({
      //   where: {
      //     walletId,
      //     coinSymbol: symbol,
      //     id: { not: transactionId },
      //   },
      //   select: { buyOrSell: true, quantity: true },
      //   orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      // });

      let runningBalance = 0;
      let negativeBalanceOccurred = false;

      for (const tx of remainingTransactions) {
        const qty = Number(tx.quantity);
        runningBalance += tx.buyOrSell === "buy" ? qty : -qty;

        if (runningBalance < 0) {
          negativeBalanceOccurred = true;
          break;
        }
      }

      if (negativeBalanceOccurred) {
        return res.status(400).json({
          error: `Cannot delete purchase. This would break chronological balance for ${symbol.toUpperCase()} and produce a negative quantity at some point in history.`,
        });
      }
    }

    const [deleted] = await prisma.$queryRaw<{ id: string }[]>`
      DELETE FROM "Transaction"
      WHERE "id" = ${transactionId}
      RETURNING "id";
    `;

    // const deleted = await prisma.transaction.delete({
    //   where: { id: transactionId },
    // });

    if (!deleted) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    return res
      .status(200)
      .json({ message: "Transaction deleted", id: deleted.id });
  } catch (error: any) {
    if (error.code === "P2025")
      return res.status(404).json({ error: "Transaction not found" });
    return res.status(500).json({ error: "Server error" });
  }
};

// ======================================================================

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId, walletId } = req.params;
    if (!walletId || !transactionId) {
      return res
        .status(400)
        .json({ error: "Wallet ID and Transaction ID are required." });
    }

    const [oldTransaction] = await prisma.$queryRaw<TransactionRow[]>`
      SELECT
        "id",
        "walletId",
        "coinSymbol",
        "swapGroupId",
        "buyOrSell",
        "price",
        "quantity",
        "createdAt",
        "updatedAt"
      FROM "Transaction"
      WHERE "id" = ${transactionId} AND "walletId" = ${walletId}
      LIMIT 1;
    `;

    // const oldTransaction = await prisma.transaction.findFirst({
    //   where: { id: transactionId, walletId },
    // });

    if (!oldTransaction)
      return res.status(404).json({ error: "Transaction not found" });

    const validationResult = CreateTransactionDto.omit({
      walletId: true,
      coinSymbol: true,
    })
      .partial()
      .safeParse(req.body);
    if (!validationResult.success)
      return handleZodError(res, validationResult.error);

    const { price, quantity, buyOrSell, createdAt } = validationResult.data;

    const newQuantity =
      quantity !== undefined ? quantity : Number(oldTransaction.quantity);
    const newType =
      buyOrSell !== undefined ? buyOrSell : oldTransaction.buyOrSell;
    const newCreatedAt =
      createdAt !== undefined ? createdAt : oldTransaction.createdAt;
    const symbol = oldTransaction.coinSymbol;

    //! COMPLEX BALANCE VALIDATION LOGIC (CHRONOLOGICAL RECALCULATION)
    const transactionsWithoutCurrent = await prisma.$queryRaw<
      {
        id: string;
        buyOrSell: "buy" | "sell";
        quantity: number | string;
        createdAt: Date;
      }[]
    >`
      SELECT "id", "buyOrSell", "quantity", "createdAt"
      FROM "Transaction"
      WHERE
        "walletId" = ${walletId}
        AND "coinSymbol" = ${symbol}
        AND "id" <> ${transactionId}
      ORDER BY "createdAt" ASC, "id" ASC;
    `;

    // const transactionsWithoutCurrent = await prisma.transaction.findMany({
    //   where: {
    //     walletId,
    //     coinSymbol: symbol,
    //     id: { not: transactionId }, // Exclude old transaction
    //   },
    //   // Sorting by date VERY IMPORTANT for correct recalculation
    //   orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    // });

    const simulatedTransactions = [...transactionsWithoutCurrent];
    const newSimulatedTx = {
      id: transactionId,
      buyOrSell: newType,
      quantity: newQuantity,
      createdAt: newCreatedAt,
    };

    simulatedTransactions.push(newSimulatedTx as any);
    simulatedTransactions.sort((a, b) => {
      const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    let runningBalance = 0;
    let negativeBalanceOccurred = false;

    for (const tx of simulatedTransactions) {
      const qty = Number(tx.quantity);
      if (tx.buyOrSell === "buy") {
        runningBalance += qty;
      } else {
        runningBalance -= qty;
      }

      if (runningBalance < 0) {
        negativeBalanceOccurred = true;
        break;
      }
    }

    if (negativeBalanceOccurred) {
      return res.status(400).json({
        error: `Cannot update transaction. This change violates the chronological balance resulting in a negative balance for ${symbol.toUpperCase()}.`,
      });
    }

    const [updated] = await prisma.$queryRaw<TransactionRow[]>`
      UPDATE "Transaction"
      SET
        "price" = ${price ?? Number(oldTransaction.price)}::numeric,
        "quantity" = ${newQuantity}::numeric,
        "buyOrSell" = ${newType}::"BuyOrSell",
        "createdAt" = ${newCreatedAt},
        "updatedAt" = NOW()
      WHERE "id" = ${transactionId}
      RETURNING
        "id",
        "walletId",
        "coinSymbol",
        "swapGroupId",
        "buyOrSell",
        "price",
        "quantity",
        "createdAt",
        "updatedAt";
    `;

    // const updated = await prisma.transaction.update({
    //   where: { id: transactionId },
    //   data: {
    //     price,
    //     quantity,
    //     buyOrSell,
    //     createdAt: newCreatedAt,
    //   },
    // });

    if (!updated) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const formatted = formatTransaction(updated);
    const validatedResponse = TransactionResponseSchema.parse(formatted);
    return res.status(200).json(validatedResponse);
  } catch (error: any) {
    if (error.code === "P2025")
      return res.status(404).json({ error: "Transaction not found" });
    if (error instanceof z.ZodError) return handleZodError(res, error);
    return res.status(500).json({ error: "Server error" });
  }
};
