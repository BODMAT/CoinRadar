import { createTransaction, enableSwap, registerAndCreateWallet, resetDatabase } from '../helpers/testUtils';

const prisma = require('../../src/prisma');

describe('Swap atomic/concurrency behavior', () => {
    beforeEach(async () => {
        await resetDatabase();
    });

    it('creates two linked transactions on successful swap', async () => {
        const { agent, walletId } = await registerAndCreateWallet();
        await enableSwap(agent, walletId);

        const seedBuy = await createTransaction(agent, walletId, {
            buyOrSell: 'buy',
            coinSymbol: 'btc',
            price: 100,
            quantity: 2,
            createdAt: '2026-01-01T08:00:00.000Z',
        });
        expect(seedBuy.status).toBe(201);

        const swapResponse = await agent.post(`/api/wallets/${walletId}/swap`).send({
            fromCoin: 'btc',
            fromQuantity: 1,
            fromPrice: 120,
            toCoin: 'eth',
            toQuantity: 10,
            toPrice: 12,
            createdAt: '2026-01-01T09:00:00.000Z',
        });

        expect(swapResponse.status).toBe(201);
        expect(swapResponse.body.swapGroupId).toBeTruthy();
        expect(swapResponse.body.sell.swapGroupId).toBe(swapResponse.body.swapGroupId);
        expect(swapResponse.body.buy.swapGroupId).toBe(swapResponse.body.swapGroupId);
    });

    it('rejects swap with insufficient funds and does not create swap transactions', async () => {
        const { agent, walletId } = await registerAndCreateWallet();
        await enableSwap(agent, walletId);

        const beforeCount = await prisma.transactions.count({ where: { walletId } });

        const swapResponse = await agent.post(`/api/wallets/${walletId}/swap`).send({
            fromCoin: 'btc',
            fromQuantity: 1,
            fromPrice: 120,
            toCoin: 'eth',
            toQuantity: 10,
            toPrice: 12,
            createdAt: '2026-01-01T09:00:00.000Z',
        });

        expect(swapResponse.status).toBe(400);

        const afterCount = await prisma.transactions.count({ where: { walletId } });
        expect(afterCount).toBe(beforeCount);
    });

    it('returns 403 when swap is disabled', async () => {
        const { agent, walletId } = await registerAndCreateWallet();

        const seedBuy = await createTransaction(agent, walletId, {
            buyOrSell: 'buy',
            coinSymbol: 'btc',
            price: 100,
            quantity: 2,
            createdAt: '2026-01-01T08:00:00.000Z',
        });
        expect(seedBuy.status).toBe(201);

        const swapResponse = await agent.post(`/api/wallets/${walletId}/swap`).send({
            fromCoin: 'btc',
            fromQuantity: 1,
            fromPrice: 120,
            toCoin: 'eth',
            toQuantity: 10,
            toPrice: 12,
            createdAt: '2026-01-01T09:00:00.000Z',
        });

        expect(swapResponse.status).toBe(403);
        expect((swapResponse.body.error || '').toLowerCase()).toContain('disabled');
    });

    it('keeps consistent balance under concurrent swaps', async () => {
        const { agent, walletId } = await registerAndCreateWallet();
        await enableSwap(agent, walletId);

        const seedBuy = await createTransaction(agent, walletId, {
            buyOrSell: 'buy',
            coinSymbol: 'btc',
            price: 100,
            quantity: 10,
            createdAt: '2026-01-01T08:00:00.000Z',
        });
        expect(seedBuy.status).toBe(201);

        const payload = {
            fromCoin: 'btc',
            fromQuantity: 7,
            fromPrice: 120,
            toCoin: 'eth',
            toQuantity: 70,
            toPrice: 12,
            createdAt: '2026-01-01T09:00:00.000Z',
        };

        const [r1, r2] = await Promise.all([
            agent.post(`/api/wallets/${walletId}/swap`).send(payload),
            agent.post(`/api/wallets/${walletId}/swap`).send(payload),
        ]);

        const statuses = [r1.status, r2.status];
        expect(statuses.some((status) => status === 201)).toBe(true);
        expect(statuses.some((status) => status === 400 || status === 409)).toBe(true);

        const btcTransactions = await prisma.transactions.findMany({
            where: { walletId, coinSymbol: 'btc' },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        const soldAmount = btcTransactions
            .filter((tx: { buyOrSell: string }) => tx.buyOrSell === 'sell')
            .reduce((sum: number, tx: { quantity: number }) => sum + Number(tx.quantity), 0);

        expect(soldAmount).toBeLessThanOrEqual(10);
    });
});
