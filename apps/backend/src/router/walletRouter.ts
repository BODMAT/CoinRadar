import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import transactionRouter from "./transactionRouter.js";
import swapRouter from "./swapRouter.js";
import prisma from "../prisma.js";

import {
  getWallets,
  createWallet,
  getWallet,
  updateWallet,
  deleteWallet,
} from "../controllers/walletController.js";
import { protect } from "../middleware/authMiddleware.js";

const walletRouter = express.Router();

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
    if (!walletId) {
      return res.status(400).json({ error: "Wallet ID is required." });
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

export default walletRouter;
