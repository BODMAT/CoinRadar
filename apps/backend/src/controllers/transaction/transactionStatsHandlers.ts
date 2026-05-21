import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma.js";
import { TransactionResponseSchema } from "../../models/TransactionSchema.js";
import {
  CoinInfoSchema,
  CoinForChartSchema,
} from "../../models/CoinInfoSchema.js";
import { getStartDate, handleZodError } from "../../utils/helpers.js";
import {
  formatTransaction,
  type TransactionRow,
} from "./transactionHelpers.js";

const TransactionsArraySchema = z.array(TransactionResponseSchema);

export const getAllTransactionsGroupByCoinSymbol = async (
  req: Request,
  res: Response,
) => {
  try {
    const { walletId } = req.params;
    if (!walletId) {
      return res.status(400).json({ error: "Wallet ID is required." });
    }

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

export const getTransactionsByCoin = async (req: Request, res: Response) => {
  try {
    const { walletId, coinSymbol } = req.params;

    if (!walletId || !coinSymbol) {
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

export const getCoinStats = async (req: Request, res: Response) => {
  try {
    const { walletId, coinSymbol } = req.params;

    if (!walletId || !coinSymbol) {
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

export const getGroupedTransactionsForChart = async (
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
