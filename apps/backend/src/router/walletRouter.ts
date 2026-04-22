const express = require("express");
import type { NextFunction, Request, Response } from "express";
const walletRouter = express.Router();
const transactionRouter = require("./transactionRouter");
const swapRouter = require("./swapRouter");
const prisma = require("../prisma");

const {
  getWallets,
  createWallet,
  getWallet,
  updateWallet,
  deleteWallet,
} = require("../controllers/walletController");
const { protect } = require("../middleware/authMiddleware");

walletRouter.use(protect);

walletRouter.get("/", getWallets); // all wallets of user

walletRouter.post("/", createWallet);

walletRouter.use(
  "/:walletId",
  async (req: Request, res: Response, next: NextFunction) => {
    const { walletId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const wallet = await prisma.wallet.findFirst({
        where: {
          id: walletId,
          userId,
        },
        select: { id: true },
      });

      if (!wallet) {
        return res
          .status(404)
          .json({ error: "Wallet not found or access denied." });
      }

      next();
    } catch (error) {
      console.error("Error validating wallet access:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

walletRouter.get("/:walletId", getWallet);
walletRouter.patch("/:walletId", updateWallet);
walletRouter.delete("/:walletId", deleteWallet);

walletRouter.use("/:walletId/transactions", transactionRouter);
walletRouter.use("/:walletId", swapRouter);

module.exports = walletRouter;
