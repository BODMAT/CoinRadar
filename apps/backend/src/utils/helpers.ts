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

// обробка випадків де баланс може стати менше нуля 
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