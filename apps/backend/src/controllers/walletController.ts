import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma.js";
import {
  WalletSchema,
  WalletCreateSchema,
  WalletPatchSchema,
} from "../models/WalletSchema.js";
import { handleZodError } from "../utils/helpers.js";

const WalletsArraySchema = z.array(WalletSchema);

export const getWallets = async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const walletsWithStats = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        totalInvested: number | string;
        totalRealizedPnL: number | string;
      }[]
    >`
      WITH joined AS (
        SELECT
          w."id" AS "walletId",
          w."name",
          w."createdAt",
          w."userId",
          t."coinSymbol",
          t."buyOrSell",
          t."price",
          t."quantity"
        FROM "Transaction" t
        RIGHT JOIN "Wallet" w ON w."id" = t."walletId"
        WHERE w."userId" = ${userId}
      ),
      coin_rollup AS (
        SELECT
          "walletId",
          "coinSymbol",
          SUM(CASE WHEN "buyOrSell" = 'buy' THEN "price" * "quantity" ELSE 0 END) AS "totalBuyCost",
          SUM(CASE WHEN "buyOrSell" = 'buy' THEN "quantity" ELSE 0 END) AS "totalBuyQty",
          SUM(CASE WHEN "buyOrSell" = 'sell' THEN "price" * "quantity" ELSE 0 END) AS "totalSellRevenue",
          SUM(CASE WHEN "buyOrSell" = 'sell' THEN "quantity" ELSE 0 END) AS "totalSellQty"
        FROM joined
        GROUP BY "walletId", "coinSymbol"
      ),
      wallet_stats AS (
        SELECT
          "walletId",
          COALESCE(
            SUM(
              CASE
                WHEN ("totalBuyQty" - "totalSellQty") > 0
                  THEN ("totalBuyQty" - "totalSellQty") * ("totalBuyCost" / NULLIF("totalBuyQty", 0))
                ELSE 0
              END
            ),
            0
          ) AS "totalInvested",
          COALESCE(
            SUM("totalSellRevenue" - ("totalSellQty" * ("totalBuyCost" / NULLIF("totalBuyQty", 0)))),
            0
          ) AS "totalRealizedPnL"
        FROM coin_rollup
        GROUP BY "walletId"
      )
      SELECT
        w."id",
        w."name",
        w."createdAt",
        w."userId",
        ROUND(COALESCE(ws."totalInvested", 0)::numeric, 2) AS "totalInvested",
        ROUND(COALESCE(ws."totalRealizedPnL", 0)::numeric, 2) AS "totalRealizedPnL"
      FROM "Wallet" w
      LEFT JOIN wallet_stats ws ON ws."walletId" = w."id"
      WHERE w."userId" = ${userId}
      ORDER BY w."createdAt" ASC;
    `;

    // const wallets = await prisma.wallet.findMany({
    //   where: {
    //     userId: userId,
    //   },
    //   include: {
    //     transactions: {
    //       select: {
    //         price: true,
    //         quantity: true,
    //         buyOrSell: true,
    //         coinSymbol: true,
    //       },
    //       orderBy: { createdAt: "desc" },
    //     },
    //   },
    // });
    // const walletsWithStats = wallets.map((wallet: any) => {
    //   const { invested, realized } = calculateWalletStats(wallet.transactions);
    //   const { transactions, ...walletData } = wallet;
    //
    //   return {
    //     ...walletData,
    //     totalInvested: invested,
    //     totalRealizedPnL: realized,
    //   };
    // });

    const normalizedWallets = walletsWithStats.map(
      (wallet: {
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        totalInvested: number | string;
        totalRealizedPnL: number | string;
      }) => ({
        ...wallet,
        totalInvested: Number(wallet.totalInvested ?? 0),
        totalRealizedPnL: Number(wallet.totalRealizedPnL ?? 0),
      }),
    );

    const validatedWallets = WalletsArraySchema.parse(normalizedWallets);
    return res.status(200).json(validatedWallets);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }

    console.error("Error fetching wallets:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//====================================================================

export const createWallet = async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const validatedData = WalletCreateSchema.parse(req.body);
    const name = validatedData.name;

    const newWallet = await prisma.wallet.create({
      data: {
        name: name,
        userId: userId,
      },
    });

    const validatedWalletResponse = WalletSchema.parse(newWallet);
    return res.status(201).json(validatedWalletResponse);
  } catch (error: any) {
    if (error.code === "P2002") {
      const targetFields = error.meta?.target ?? [];

      const targetArray = Array.isArray(targetFields) ? targetFields : [];

      const field = targetArray.includes("name")
        ? "name"
        : targetArray.length > 0
          ? targetArray[0]
          : "wallet";

      return res.status(409).json({
        error: `A wallet with the same ${field} already exists for this user.`,
      });
    }

    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }

    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//====================================================================

export const getWallet = async (req: Request, res: Response) => {
  const userId = req.userId;
  const walletId = req.params.walletId;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  if (!walletId) {
    return res.status(400).json({ error: "Wallet ID is required." });
  }

  try {
    const [wallet] = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        totalInvested: number | string;
        totalRealizedPnL: number | string;
      }[]
    >`
      WITH target_wallet AS (
        SELECT w."id", w."name", w."createdAt", w."userId"
        FROM "Wallet" w
        INNER JOIN "User" u ON u."id" = w."userId"
        WHERE w."id" = ${walletId} AND w."userId" = ${userId}
      ),
      coin_rollup AS (
        SELECT
          tw."id" AS "walletId",
          t."coinSymbol",
          SUM(CASE WHEN t."buyOrSell" = 'buy' THEN t."price" * t."quantity" ELSE 0 END) AS "totalBuyCost",
          SUM(CASE WHEN t."buyOrSell" = 'buy' THEN t."quantity" ELSE 0 END) AS "totalBuyQty",
          SUM(CASE WHEN t."buyOrSell" = 'sell' THEN t."price" * t."quantity" ELSE 0 END) AS "totalSellRevenue",
          SUM(CASE WHEN t."buyOrSell" = 'sell' THEN t."quantity" ELSE 0 END) AS "totalSellQty"
        FROM target_wallet tw
        LEFT JOIN "Transaction" t ON t."walletId" = tw."id"
        GROUP BY tw."id", t."coinSymbol"
      ),
      wallet_stats AS (
        SELECT
          "walletId",
          COALESCE(
            SUM(
              CASE
                WHEN ("totalBuyQty" - "totalSellQty") > 0
                  THEN ("totalBuyQty" - "totalSellQty") * ("totalBuyCost" / NULLIF("totalBuyQty", 0))
                ELSE 0
              END
            ),
            0
          ) AS "totalInvested",
          COALESCE(
            SUM("totalSellRevenue" - ("totalSellQty" * ("totalBuyCost" / NULLIF("totalBuyQty", 0)))),
            0
          ) AS "totalRealizedPnL"
        FROM coin_rollup
        GROUP BY "walletId"
      )
      SELECT
        tw."id",
        tw."name",
        tw."createdAt",
        tw."userId",
        ROUND(COALESCE(ws."totalInvested", 0)::numeric, 2) AS "totalInvested",
        ROUND(COALESCE(ws."totalRealizedPnL", 0)::numeric, 2) AS "totalRealizedPnL"
      FROM target_wallet tw
      LEFT JOIN wallet_stats ws ON ws."walletId" = tw."id";
    `;

    // const wallet = await prisma.wallet.findUnique({
    //   where: {
    //     id: walletId,
    //     userId: userId,
    //   },
    //   include: {
    //     transactions: {
    //       select: {
    //         price: true,
    //         quantity: true,
    //         buyOrSell: true,
    //         coinSymbol: true,
    //       },
    //       orderBy: { createdAt: "desc" },
    //     },
    //   },
    // });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    const responseData = {
      ...wallet,
      totalInvested: Number(wallet.totalInvested ?? 0),
      totalRealizedPnL: Number(wallet.totalRealizedPnL ?? 0),
    };

    const validatedWallet = WalletSchema.parse(responseData);
    return res.status(200).json(validatedWallet);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ error: "Wallet not found or access denied." });
    }
    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }

    console.error("Error fetching wallet:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//====================================================================

export const updateWallet = async (req: Request, res: Response) => {
  const userId = req.userId;
  const walletId = req.params.walletId;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  if (!walletId) {
    return res.status(400).json({ error: "Wallet ID is required." });
  }

  try {
    const validatedData = WalletPatchSchema.parse(req.body); //!patch

    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({ error: "No fields provided for update." });
    }

    const updateData = {
      ...(validatedData.name !== undefined ? { name: validatedData.name } : {}),
    };

    const updatedWallet = await prisma.wallet.update({
      where: {
        id: walletId,
      },
      data: updateData,
    });

    const validatedResponse = WalletSchema.parse(updatedWallet);
    return res.status(200).json(validatedResponse);
  } catch (error: any) {
    if (error.code === "P2002") {
      const targetFields = error.meta?.target ?? [];
      const targetArray = Array.isArray(targetFields) ? targetFields : [];
      const field = targetArray.includes("name")
        ? "name"
        : targetArray.length > 0
          ? targetArray[0]
          : "wallet";

      return res.status(409).json({
        error: `A wallet with the same ${field} already exists for this user.`,
      });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ error: "Wallet not found or access denied." });
    }

    if (error instanceof z.ZodError) {
      return handleZodError(res, error);
    }

    console.error("Error updating wallet:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//====================================================================

export const deleteWallet = async (req: Request, res: Response) => {
  const userId = req.userId;
  const walletId = req.params.walletId;

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  if (!walletId) {
    return res.status(400).json({ error: "Wallet ID is required." });
  }

  try {
    const deletedWallet = await prisma.wallet.delete({
      where: {
        id: walletId,
      },
    });

    return res.status(200).json({
      message: `Wallet "${deletedWallet.name}" successfully deleted.`,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ error: "Wallet not found or access denied." });
    }

    console.error("Error deleting wallet:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
