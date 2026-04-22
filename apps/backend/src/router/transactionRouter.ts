import express from "express";
const transactionRouter = express.Router({ mergeParams: true });

import {
  getTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getPaginatedTransactions,
  getAllTransactionsGroupByCoinSymbol,
  getTransactionsByCoin,
  getCoinStats,
  getGroupedTransactionsForChart,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

transactionRouter.use(protect);

transactionRouter.get("/", getTransactions);
transactionRouter.get("/paginated", getPaginatedTransactions);
transactionRouter.get("/grouped", getAllTransactionsGroupByCoinSymbol);
transactionRouter.get("/coins/:coinSymbol/stats", getCoinStats);
transactionRouter.get("/coins/:coinSymbol", getTransactionsByCoin);
transactionRouter.post("/", createTransaction);
transactionRouter.get("/chart-data", getGroupedTransactionsForChart); // ?range=30d

transactionRouter.get("/:transactionId", getTransaction);
transactionRouter.patch("/:transactionId", updateTransaction);
transactionRouter.delete("/:transactionId", deleteTransaction);

export default transactionRouter;
