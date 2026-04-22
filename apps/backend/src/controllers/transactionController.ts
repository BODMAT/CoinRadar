import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
const crypto = require("crypto");
const { getCoinBalance } = require("../utils/helpers");
const prisma = require("../prisma");
const z = require("zod");
const {
  TransactionResponseSchema,
  CreateTransactionDto,
  PaginatedTransactionsSchema,
} = require("../models/TransactionSchema");
const { handleZodError, getStartDate } = require("../utils/helpers");

const TransactionsArraySchema = z.array(TransactionResponseSchema);
const {
  CoinInfoSchema,
  CoinForChartSchema,
} = require("../models/CoinInfoSchema");

type TransactionPayload = Prisma.TransactionGetPayload<{}>;
type TransactionRow = {
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

const formatTransaction = (tx: TransactionPayload | TransactionRow) => {
  return {
    ...tx,
    price: Number(tx.price),
    quantity: Number(tx.quantity),
    total: Number(tx.price) * Number(tx.quantity),
  };
};

// ======================================================================

exports.getTransactions = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;

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

exports.createTransaction = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const validationResult = CreateTransactionDto.safeParse({
      ...req.body,
      walletId,
    });

    if (!validationResult.success) {
      return handleZodError(res, validationResult.error);
    }

    const { coinSymbol, buyOrSell, price, quantity, createdAt } =
      validationResult.data;

    if (buyOrSell === "sell") {
      const balanceAtTime = await getCoinBalance(
        walletId,
        coinSymbol,
        createdAt,
      );

      if (balanceAtTime < quantity) {
        return res.status(400).json({
          error: `Insufficient funds. Available balance was ${balanceAtTime} ${coinSymbol.toUpperCase()} up to transaction time (${createdAt.toLocaleString()}), but tried to sell ${quantity}.`,
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
        ${createdAt ?? new Date()},
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

    const formatted = formatTransaction(newTransaction);
    const response = TransactionResponseSchema.parse(formatted);

    return res.status(201).json(response);
  } catch (error: any) {
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Wallet not found." });
    }
    if (error instanceof z.ZodError) return handleZodError(res, error);

    console.error("Error creating transaction:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

// ======================================================================
exports.getPaginatedTransactions = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
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

exports.getTransaction = async (req: Request, res: Response) => {
  try {
    const { walletId, transactionId } = req.params;

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

exports.deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId, walletId } = req.params;

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

exports.updateTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId, walletId } = req.params;

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

// ======================================================================

exports.getAllTransactionsGroupByCoinSymbol = async (
  req: Request,
  res: Response,
) => {
  try {
    const { walletId } = req.params;

    const portfolio = await prisma.$queryRaw<
      {
        coinSymbol: string;
        totalQuantity: number | string;
        avgBuyingPrice: number | string;
      }[]
    >`
      SELECT
        t."coinSymbol",
        ROUND(
          SUM(CASE WHEN t."buyOrSell" = 'buy' THEN t."quantity" ELSE -t."quantity" END)::numeric,
          8
        ) AS "totalQuantity",
        COALESCE(
          ROUND(
            (
              SUM(CASE WHEN t."buyOrSell" = 'buy' THEN t."price" * t."quantity" ELSE 0 END)
              / NULLIF(SUM(CASE WHEN t."buyOrSell" = 'buy' THEN t."quantity" ELSE 0 END), 0)
            )::numeric,
            2
          ),
          0
        ) AS "avgBuyingPrice"
      FROM "Transaction" t
      INNER JOIN "Wallet" w ON w."id" = t."walletId"
      INNER JOIN "User" u ON u."id" = w."userId"
      WHERE
        t."walletId" = ${walletId}
        AND (u."id" = w."userId")
        AND t."coinSymbol" LIKE '%'
      GROUP BY t."coinSymbol"
      HAVING SUM(CASE WHEN t."buyOrSell" = 'buy' THEN t."quantity" ELSE -t."quantity" END) > 0
      ORDER BY SUM(CASE WHEN t."buyOrSell" = 'buy' THEN t."quantity" ELSE -t."quantity" END) DESC;
    `;

    // const transactions = await prisma.transaction.findMany({
    //   where: { walletId },
    //   orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    // });

    const normalizedPortfolio = portfolio.map(
      (item: {
        coinSymbol: string;
        totalQuantity: number | string;
        avgBuyingPrice: number | string;
      }) => ({
        coinSymbol: item.coinSymbol,
        totalQuantity: Number(item.totalQuantity),
        avgBuyingPrice: Number(item.avgBuyingPrice),
      }),
    );

    const validatedPortfolio = z
      .array(CoinInfoSchema)
      .parse(normalizedPortfolio);

    return res.status(200).json(validatedPortfolio);
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);

    console.error("Error calculating portfolio:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ======================================================================

exports.getTransactionsByCoin = async (req: Request, res: Response) => {
  try {
    const { walletId, coinSymbol } = req.params;

    if (!coinSymbol) {
      return res.status(400).json({ error: "Coin symbol is required" });
    }

    const normalizedCoin = coinSymbol.toLowerCase();
    const transactions = await prisma.$queryRaw<TransactionRow[]>`
      SELECT
        t."id",
        t."walletId",
        t."coinSymbol",
        t."swapGroupId",
        t."buyOrSell",
        t."price",
        t."quantity",
        t."createdAt",
        t."updatedAt"
      FROM "Transaction" t
      WHERE
        t."walletId" = ${walletId}
        AND (
          t."coinSymbol" LIKE ${normalizedCoin}
          OR t."coinSymbol" = ANY(ARRAY[${normalizedCoin}]::text[])
        )
        AND t."buyOrSell" IN ('buy'::"BuyOrSell", 'sell'::"BuyOrSell")
      ORDER BY t."createdAt" DESC, t."id" DESC;
    `;

    // const transactions = await prisma.transaction.findMany({
    //   where: {
    //     walletId,
    //     coinSymbol: coinSymbol.toLowerCase(),
    //   },
    //   orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    // });

    const formatted = transactions.map((tx: TransactionRow) =>
      formatTransaction(tx),
    );

    const validatedTransactions = TransactionsArraySchema.parse(formatted);

    return res.status(200).json(validatedTransactions);
  } catch (error: any) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Error fetching transactions by coin:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ======================================================================
exports.getCoinStats = async (req: Request, res: Response) => {
  try {
    const { walletId, coinSymbol } = req.params;

    if (!coinSymbol) {
      return res.status(400).json({ error: "Coin symbol is required" });
    }

    const normalizedCoin = coinSymbol.toLowerCase();

    const [statsRow] = await prisma.$queryRaw<
      {
        coinSymbol: string;
        totalQuantity: number | string;
        avgBuyingPrice: number | string;
        transactionsCount: bigint | number;
        minPrice: number | string | null;
        maxPrice: number | string | null;
      }[]
    >`
      SELECT
        ${normalizedCoin}::text AS "coinSymbol",
        ROUND(
          COALESCE(
            SUM(CASE WHEN "buyOrSell" = 'buy' THEN "quantity" ELSE -"quantity" END),
            0
          )::numeric,
          8
        ) AS "totalQuantity",
        COALESCE(
          ROUND(
            (
              SUM(CASE WHEN "buyOrSell" = 'buy' THEN "price" * "quantity" ELSE 0 END)
              / NULLIF(SUM(CASE WHEN "buyOrSell" = 'buy' THEN "quantity" ELSE 0 END), 0)
            )::numeric,
            2
          ),
          0
        ) AS "avgBuyingPrice",
        COUNT(*) AS "transactionsCount",
        MIN("price") AS "minPrice",
        MAX("price") AS "maxPrice"
      FROM "Transaction"
      WHERE "walletId" = ${walletId} AND "coinSymbol" = ${normalizedCoin}
      GROUP BY "coinSymbol";
    `;

    // const transactions = await prisma.transaction.findMany({
    //   where: {
    //     walletId,
    //     coinSymbol: coinSymbol.toLowerCase(),
    //   },
    //   orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    // });

    const stats = {
      coinSymbol: normalizedCoin,
      totalQuantity: Number(statsRow?.totalQuantity ?? 0),
      avgBuyingPrice: Number(statsRow?.avgBuyingPrice ?? 0),
    };

    const validatedStats = CoinInfoSchema.parse(stats);

    return res.status(200).json(validatedStats);
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Error getting coin stats:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ======================================================================

exports.getGroupedTransactionsForChart = async (
  req: Request,
  res: Response,
) => {
  try {
    const { walletId } = req.params;
    let { range } = req.query as { range?: string };
    const effectiveRange = range || "7d"; // Default

    if (!walletId) {
      return res.status(400).json({ error: "Wallet ID is required." });
    }
    const startDate = getStartDate(effectiveRange);

    // Get initial balance (parsed Decimal quantities safely)
    const initialBalanceAggregations = await prisma.$queryRaw`
            SELECT 
                "coinSymbol",
                SUM(CASE WHEN "buyOrSell" = 'buy' THEN "quantity" ELSE -"quantity" END) AS "initialQuantity"
            FROM "Transaction"
            WHERE 
                "walletId" = ${walletId} AND "createdAt" < ${startDate}
            GROUP BY "coinSymbol"
            HAVING SUM(CASE WHEN "buyOrSell" = 'buy' THEN "quantity" ELSE -"quantity" END) != 0;
        `;
    const initialBalances: Record<string, number> = {};
    for (const agg of initialBalanceAggregations as any[]) {
      initialBalances[agg.coinSymbol] = Number(agg.initialQuantity) || 0;
    }

    // TRANSACTION in range
    const transactionsInPeriod = await prisma.$queryRaw<
      {
        coinSymbol: string;
        createdAt: Date;
        quantity: number | string;
        buyOrSell: string;
      }[]
    >`
      SELECT
        t."coinSymbol",
        t."createdAt",
        t."quantity",
        t."buyOrSell"
      FROM "Transaction" t
      WHERE
        t."walletId" = ${walletId}
        AND t."createdAt" BETWEEN ${startDate} AND NOW()
        AND t."coinSymbol" IN (
          SELECT DISTINCT t2."coinSymbol"
          FROM "Transaction" t2
          WHERE t2."walletId" = ${walletId}
        )
        AND EXISTS (
          SELECT 1
          FROM "Wallet" w
          WHERE w."id" = t."walletId" AND w."id" = ${walletId}
        )
        AND NOW() > (
          SELECT MIN(t3."createdAt")
          FROM "Transaction" t3
          WHERE t3."walletId" = t."walletId"
        )
        AND t."createdAt" < (
          SELECT MAX(t4."createdAt") + INTERVAL '100 years'
          FROM "Transaction" t4
          WHERE t4."walletId" = t."walletId"
        )
      ORDER BY t."createdAt" ASC, t."id" ASC;
    `;

    // const transactionsInPeriod = await prisma.transaction.findMany({
    //   where: {
    //     walletId,
    //     createdAt: { gte: startDate },
    //   },
    //   select: {
    //     coinSymbol: true,
    //     createdAt: true,
    //     quantity: true,
    //     buyOrSell: true,
    //   },
    //   orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    // });

    const groupedData: Record<
      string,
      {
        coinSymbol: string;
        initialQuantity: number;
        agregatedData: {
          createdAt: Date;
          quantity: number;
          buyOrSell: string;
        }[];
      }
    > = {};

    for (const tx of transactionsInPeriod) {
      const symbol = tx.coinSymbol;

      if (!groupedData[symbol]) {
        groupedData[symbol] = {
          coinSymbol: symbol,
          agregatedData: [],
          initialQuantity: initialBalances[symbol] ?? 0,
        };
      }

      groupedData[symbol].agregatedData.push({
        createdAt: tx.createdAt,
        quantity: Number(tx.quantity),
        buyOrSell: tx.buyOrSell,
      });
    }

    // Add missing symbols - sleeping coins
    Object.keys(initialBalances).forEach((symbol) => {
      if (!groupedData[symbol]) {
        groupedData[symbol] = {
          coinSymbol: symbol,
          agregatedData: [],
          initialQuantity: initialBalances[symbol] ?? 0,
        };
      }
    });

    const finalGroupedArray = Object.values(groupedData);
    const validatedResponse = z
      .array(CoinForChartSchema)
      .parse(finalGroupedArray);
    return res.status(200).json(validatedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(res, error);
    console.error("Error getting coin stats:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
