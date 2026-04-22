import {
  createTransaction,
  registerAndCreateWallet,
  resetDatabase,
} from "../helpers/testUtils";

describe("Transactions chronology", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns transactions in deterministic order: createdAt desc, id desc", async () => {
    const { agent, walletId } = await registerAndCreateWallet();

    const sameTime = "2026-01-01T10:00:00.000Z";
    const laterTime = "2026-01-01T11:00:00.000Z";

    const txA = await createTransaction(agent, walletId, {
      buyOrSell: "buy",
      coinSymbol: "btc",
      price: 100,
      quantity: 1,
      createdAt: sameTime,
    });
    const txB = await createTransaction(agent, walletId, {
      buyOrSell: "buy",
      coinSymbol: "btc",
      price: 101,
      quantity: 1,
      createdAt: sameTime,
    });
    const txC = await createTransaction(agent, walletId, {
      buyOrSell: "buy",
      coinSymbol: "btc",
      price: 102,
      quantity: 1,
      createdAt: laterTime,
    });

    expect(txA.status).toBe(201);
    expect(txB.status).toBe(201);
    expect(txC.status).toBe(201);

    const listResponse = await agent.get(
      `/api/wallets/${walletId}/transactions`,
    );
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body).toHaveLength(3);

    const [first, second, third] = listResponse.body;
    expect(first.id).toBe(txC.body.id);

    const expectedSecondAndThird = [txA.body.id, txB.body.id].sort(
      (a: string, b: string) => b.localeCompare(a),
    );
    expect([second.id, third.id]).toEqual(expectedSecondAndThird);
  });

  it("rejects update that breaks chronological balance", async () => {
    const { agent, walletId } = await registerAndCreateWallet();

    const buyTx = await createTransaction(agent, walletId, {
      buyOrSell: "buy",
      coinSymbol: "eth",
      price: 100,
      quantity: 1,
      createdAt: "2026-01-01T09:00:00.000Z",
    });
    const sellTx = await createTransaction(agent, walletId, {
      buyOrSell: "sell",
      coinSymbol: "eth",
      price: 120,
      quantity: 1,
      createdAt: "2026-01-01T10:00:00.000Z",
    });

    expect(buyTx.status).toBe(201);
    expect(sellTx.status).toBe(201);

    const invalidUpdate = await agent
      .patch(`/api/wallets/${walletId}/transactions/${buyTx.body.id}`)
      .send({
        quantity: 0.4,
      });

    expect(invalidUpdate.status).toBe(400);
    expect((invalidUpdate.body.error || "").toLowerCase()).toContain(
      "chronological",
    );
  });

  it("does not allow access to another user wallet", async () => {
    const owner = await registerAndCreateWallet();
    const stranger = await registerAndCreateWallet();

    const listResponse = await stranger.agent.get(
      `/api/wallets/${owner.walletId}/transactions`,
    );
    expect(listResponse.status).toBe(404);

    const createResponse = await stranger.agent
      .post(`/api/wallets/${owner.walletId}/transactions`)
      .send({
        buyOrSell: "buy",
        coinSymbol: "btc",
        price: 100,
        quantity: 1,
        createdAt: "2026-01-01T10:00:00.000Z",
      });
    expect(createResponse.status).toBe(404);
  });
});
