const z = require('zod');
const prisma = require('../prisma');
import type { Response } from 'express';
exports.handleZodError = (res: Response, error: any) => {
    if (error instanceof z.ZodError) {
        const fieldErrors = error.flatten().fieldErrors;
        const errorMessages = Object.values(fieldErrors);
        const allErrors = errorMessages.flat();
        const firstError = allErrors.length > 0
            ? allErrors[0]
            : 'Validation failed.';

        return res.status(400).json({
            error: firstError
        });
    }
};

exports.getCoinBalance = async (walletId: string, coinSymbol: string): Promise<number> => {
    const transactions = await prisma.transactions.findMany({
        where: { walletId, coinSymbol },
        select: { buyOrSell: true, quantity: true }
    });

    let balance = 0;
    for (const tx of transactions) {
        const qty = Number(tx.quantity);
        if (tx.buyOrSell === 'buy') {
            balance += qty;
        } else {
            balance -= qty;
        }
    }
    return balance;
};

exports.calculateWalletStats = (transactions: any[]): { invested: number, realized: number } => {
    let totalInvested = 0;
    let totalRealizedPnL = 0;

    const coinMap: Record<string, {
        totalBuyCost: number;
        totalBuyQty: number;
        totalSellRevenue: number;
        totalSellQty: number;
    }> = {};

    for (const tx of transactions) {
        const symbol = tx.coinSymbol;
        const qty = Number(tx.quantity);
        const price = Number(tx.price);
        const total = qty * price;

        if (!coinMap[symbol]) {
            coinMap[symbol] = {
                totalBuyCost: 0,
                totalBuyQty: 0,
                totalSellRevenue: 0,
                totalSellQty: 0
            };
        }

        if (tx.buyOrSell === 'buy') {
            coinMap[symbol].totalBuyCost += total;
            coinMap[symbol].totalBuyQty += qty;
        } else {
            coinMap[symbol].totalSellRevenue += total;
            coinMap[symbol].totalSellQty += qty;
        }
    }

    Object.values(coinMap).forEach(coin => {
        if (coin.totalBuyQty > 0) {

            const globalAvgPrice = coin.totalBuyCost / coin.totalBuyQty;
            const currentQty = coin.totalBuyQty - coin.totalSellQty;

            if (currentQty > 0) {
                totalInvested += (currentQty * globalAvgPrice);
            }
            const costOfSoldTokens = coin.totalSellQty * globalAvgPrice;
            const realized = coin.totalSellRevenue - costOfSoldTokens;

            totalRealizedPnL += realized;
        }
    });

    return {
        invested: Number(totalInvested.toFixed(2)),
        realized: Number(totalRealizedPnL.toFixed(2))
    };
};