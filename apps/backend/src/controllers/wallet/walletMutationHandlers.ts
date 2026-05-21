import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma.js";
import {
  WalletSchema,
  WalletCreateSchema,
  WalletPatchSchema,
} from "../../models/WalletSchema.js";
import { handleZodError } from "../../utils/helpers.js";

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
