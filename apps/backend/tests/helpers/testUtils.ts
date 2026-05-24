import request from "supertest";
import prisma from "../../src/prisma.js";
import { app } from "../../src/app.js";

export const getApp = () => app;
export type TestAgent = ReturnType<typeof request.agent>;

export const resetDatabase = async (): Promise<void> => {
  await prisma.transaction.deleteMany();
  await prisma.swapSettings.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.emailToken.deleteMany();
  await prisma.authIdentity.deleteMany();
  await prisma.user.deleteMany();
};

export const registerAndCreateWallet = async () => {
  const agent = request.agent(getApp());
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const login = `user_${unique}`;
  const password = "password123";

  const registerResponse = await agent.post("/api/auth/register").send({
    login,
    password,
    email: `user_${unique}@mail.com`,
  });

  if (registerResponse.status !== 201) {
    throw new Error(
      `Registration failed: ${registerResponse.status} ${JSON.stringify(registerResponse.body)}`,
    );
  }

  // Flip emailVerified directly; tests can't click the confirmation link.
  await prisma.user.update({
    where: { login },
    data: { emailVerified: true },
  });

  const loginResponse = await agent
    .post("/api/auth/login")
    .send({ login, password });

  if (loginResponse.status !== 200) {
    throw new Error(
      `Login after verification failed: ${loginResponse.status} ${JSON.stringify(loginResponse.body)}`,
    );
  }

  const walletResponse = await agent.post("/api/wallets").send({
    name: `wallet_${unique}`.slice(0, 20),
  });

  if (walletResponse.status !== 201) {
    throw new Error(
      `Wallet creation failed: ${walletResponse.status} ${JSON.stringify(walletResponse.body)}`,
    );
  }

  return {
    agent,
    walletId: walletResponse.body.id as string,
  };
};

export const enableSwap = async (agent: TestAgent, walletId: string) => {
  const response = await agent
    .patch(`/api/wallets/${walletId}/swap-settings`)
    .send({
      swapEnabled: true,
      stableCoin: "usdt",
    });

  if (response.status !== 200) {
    throw new Error(
      `Failed to enable swap: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }
};

export const createTransaction = async (
  agent: TestAgent,
  walletId: string,
  payload: {
    buyOrSell: "buy" | "sell";
    coinSymbol: string;
    price: number;
    quantity: number;
    createdAt?: string;
  },
) => {
  return agent.post(`/api/wallets/${walletId}/transactions`).send(payload);
};
