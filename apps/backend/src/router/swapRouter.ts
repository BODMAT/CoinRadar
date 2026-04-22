import express from "express";
const swapRouter = express.Router({ mergeParams: true });

import {
  createSwap,
  getSwapSettings,
  updateSwapSettings,
} from "../controllers/swapController.js";
import { protect } from "../middleware/authMiddleware.js";

swapRouter.use(protect);

swapRouter.post("/swap", createSwap);
swapRouter.get("/swap-settings", getSwapSettings);
swapRouter.patch("/swap-settings", updateSwapSettings);

export default swapRouter;
