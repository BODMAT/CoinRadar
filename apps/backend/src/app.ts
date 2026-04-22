require("dotenv").config();
const express = require("express");
import type { Express, Request, Response } from "express";
const cors = require("cors");
const prisma = require("./prisma");

const authRouter = require("./router/authRouter");
const walletRouter = require("./router/walletRouter");

const app: Express = express();

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin: string) => origin.trim())
  .filter(Boolean);

app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use("/api/auth", authRouter);
app.use("/api/wallets", walletRouter);

app.get("/api/status", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      message: "API Server is running and DB is connected!",
      status: "OK",
    });
  } catch (_error) {
    res.status(500).json({
      message: "API Server is running, but DB connection failed.",
      status: "ERROR",
    });
  }
});

module.exports = { app };
