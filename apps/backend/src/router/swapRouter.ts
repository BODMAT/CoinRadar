const express = require("express");
const swapRouter = express.Router({ mergeParams: true });

const {
  createSwap,
  getSwapSettings,
  updateSwapSettings,
} = require("../controllers/swapController");
const { protect } = require("../middleware/authMiddleware");

swapRouter.use(protect);

swapRouter.post("/swap", createSwap);
swapRouter.get("/swap-settings", getSwapSettings);
swapRouter.patch("/swap-settings", updateSwapSettings);

module.exports = swapRouter;
