import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
const { getCoinBalance } = require('../utils/helpers');
const prisma = require('../prisma');
const z = require('zod');
const {
    TransactionResponseSchema,
    CreateTransactionDto,
    PaginatedTransactionsSchema
} = require('../models/TransactionSchema');
const { handleZodError } = require('../utils/helpers');

const TransactionsArraySchema = z.array(TransactionResponseSchema);
const { CoinInfoSchema } = require('../models/CoinInfo');

type TransactionPayload = Prisma.TransactionsGetPayload<{}>;

const formatTransaction = (tx: TransactionPayload) => {
    return {
        ...tx,
        price: Number(tx.price),
        quantity: Number(tx.quantity),
        total: Number(tx.price) * Number(tx.quantity),
    };
};

// ======================================================================

exports.getTransactions = async (req: Request, res: Response) => {
    try {
        const { walletId } = req.params;

        const transactions = await prisma.transactions.findMany({
            where: { walletId },
            orderBy: { date: 'desc' }
        });

        const formatted = transactions.map((tx: TransactionPayload) => formatTransaction(tx));

        const validatedTransactions = TransactionsArraySchema.parse(formatted);
        return res.status(200).json(validatedTransactions);

    } catch (error: any) {
        if (error instanceof z.ZodError) return handleZodError(res, error);
        console.error('Error fetching transactions:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ======================================================================

exports.createTransaction = async (req: Request, res: Response) => {
    try {
        const { walletId } = req.params;
        const validationResult = CreateTransactionDto.safeParse({ ...req.body, walletId });

        if (!validationResult.success) {
            return handleZodError(res, validationResult.error);
        }

        const { coinSymbol, buyOrSell, price, quantity, date } = validationResult.data;

        if (buyOrSell === 'sell') {
            const currentBalance = await getCoinBalance(walletId, coinSymbol);

            if (currentBalance < quantity) {
                return res.status(400).json({
                    error: `Insufficient funds. You have ${currentBalance} ${coinSymbol.toUpperCase()}, but tried to sell ${quantity}.`
                });
            }
        }

        const newTransaction = await prisma.transactions.create({
            data: {
                walletId,
                coinSymbol,
                buyOrSell,
                price,
                quantity,
                date: date
            }
        });

        const formatted = formatTransaction(newTransaction as TransactionPayload);
        const response = TransactionResponseSchema.parse(formatted);

        return res.status(201).json(response);

    } catch (error: any) {
        if (error.code === 'P2003') {
            return res.status(404).json({ error: 'Wallet not found.' });
        }
        if (error instanceof z.ZodError) return handleZodError(res, error);

        console.error('Error creating transaction:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
        });
    }
}

// ======================================================================
exports.getPaginatedTransactions = async (req: Request, res: Response) => {
    try {
        const { walletId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const [totalCount, transactions] = await prisma.$transaction([
            prisma.transactions.count({ where: { walletId } }),
            prisma.transactions.findMany({
                where: { walletId },
                orderBy: { date: 'desc' },
                take: limit,
                skip: skip
            })
        ]);

        const formatted = transactions.map((tx: TransactionPayload) => formatTransaction(tx));

        const responsePayload = {
            data: formatted,
            meta: {
                total: totalCount,
                page: page,
                last_page: Math.ceil(totalCount / limit),
                per_page: limit
            }
        };

        const validatedResponse = PaginatedTransactionsSchema.parse(responsePayload);

        return res.status(200).json(validatedResponse);
    } catch (error: any) {
        if (error instanceof z.ZodError) return handleZodError(res, error);
        console.error('Error fetching paginated transactions:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ======================================================================

exports.getTransaction = async (req: Request, res: Response) => {
    try {
        const { walletId, transactionId } = req.params;

        const transaction = await prisma.transactions.findFirst({
            where: { id: transactionId, walletId },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const formatted = formatTransaction(transaction as TransactionPayload);
        return res.status(200).json(formatted);

    } catch (error) {
        if (error instanceof z.ZodError) return handleZodError(res, error);
        return res.status(500).json({ error: 'Server error' });
    }
}

// ======================================================================

exports.deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { transactionId, walletId } = req.params;

        const transactionToDelete = await prisma.transactions.findFirst({
            where: { id: transactionId, walletId }
        });

        if (!transactionToDelete) return res.status(404).json({ error: 'Transaction not found' });

        if (transactionToDelete.buyOrSell === 'buy') {
            const currentBalance = await getCoinBalance(walletId, transactionToDelete.coinSymbol);
            const qtyToDelete = Number(transactionToDelete.quantity);

            if (currentBalance < qtyToDelete) {
                return res.status(400).json({
                    error: `Cannot delete purchase. This would result in a negative balance of ${transactionToDelete.coinSymbol.toUpperCase()} because you have subsequent sells.`
                });
            }
        }

        const deleted = await prisma.transactions.delete({
            where: { id: transactionId }
        });
        return res.status(200).json({ message: 'Transaction deleted', id: deleted.id });
    } catch (error: any) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Transaction not found' });
        return res.status(500).json({ error: 'Server error' });
    }
};

// ======================================================================

exports.updateTransaction = async (req: Request, res: Response) => {
    try {
        const { transactionId, walletId } = req.params;

        const oldTransaction = await prisma.transactions.findFirst({
            where: { id: transactionId, walletId }
        });

        if (!oldTransaction) return res.status(404).json({ error: 'Transaction not found' });

        const validationResult = CreateTransactionDto.omit({ walletId: true, coinSymbol: true }).partial().safeParse(req.body);
        if (!validationResult.success) return handleZodError(res, validationResult.error);

        const { price, quantity, buyOrSell, date } = validationResult.data;

        // ! ЛОГІКА ВАЛІДАЦІЇ БАЛАНСУ (СКЛАДНА)
        // треба змоделювати баланс "що буде, якщо ми змінимо це".
        const currentBalance = await getCoinBalance(walletId, oldTransaction.coinSymbol);

        // "Відкат" вплив старої транзакції
        let balanceWithoutTx = currentBalance;
        if (oldTransaction.buyOrSell === 'buy') {
            balanceWithoutTx -= Number(oldTransaction.quantity);
        } else {
            balanceWithoutTx += Number(oldTransaction.quantity);
        }

        // Застосовую нові дані (або старі, якщо поле не змінювалось)
        const newQuantity = quantity !== undefined ? quantity : Number(oldTransaction.quantity);
        const newType = buyOrSell !== undefined ? buyOrSell : oldTransaction.buyOrSell;

        let finalBalance = balanceWithoutTx;
        if (newType === 'buy') {
            finalBalance += newQuantity;
        } else {
            finalBalance -= newQuantity;
        }

        // Перевірка
        if (finalBalance < 0) {
            return res.status(400).json({
                error: `Cannot update transaction. This change results in a negative balance (${finalBalance} ${oldTransaction.coinSymbol.toUpperCase()}).`
            });
        }

        const updated = await prisma.transactions.update({
            where: { id: transactionId },
            data: { price, quantity, buyOrSell, date },
        });

        const formatted = formatTransaction(updated as TransactionPayload);
        return res.status(200).json(formatted);

    } catch (error: any) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Transaction not found' });
        if (error instanceof z.ZodError) return handleZodError(res, error);
        return res.status(500).json({ error: 'Server error' });
    }
};

// ======================================================================

exports.getAllTransactionsGroupByCoinSymbol = async (req: Request, res: Response) => {
    try {
        const { walletId } = req.params;

        const transactions = await prisma.transactions.findMany({
            where: { walletId },
            orderBy: { date: 'asc' }
        });

        const portfolioDict: Record<string, {
            coinSymbol: string;
            currentQuantity: number;
            totalBuyCost: number;
            totalBuyQty: number;
        }> = {};

        for (const tx of transactions) {
            const symbol = tx.coinSymbol;
            const price = Number(tx.price);
            const quantity = Number(tx.quantity);
            const total = price * quantity;

            if (!portfolioDict[symbol]) {
                portfolioDict[symbol] = {
                    coinSymbol: symbol,
                    currentQuantity: 0,
                    totalBuyCost: 0,
                    totalBuyQty: 0
                };
            }

            const stats = portfolioDict[symbol];

            if (tx.buyOrSell === 'buy') {
                stats.totalBuyCost += total;
                stats.totalBuyQty += quantity;
                stats.currentQuantity += quantity;
            } else {
                stats.currentQuantity -= quantity;
            }
        }

        const portfolio = Object.values(portfolioDict).map(item => {
            const avgPrice = item.totalBuyQty > 0
                ? item.totalBuyCost / item.totalBuyQty
                : 0;

            return {
                coinSymbol: item.coinSymbol,
                totalQuantity: Number(item.currentQuantity.toFixed(8)),
                avgBuyingPrice: Number(avgPrice.toFixed(2))
            };
        });

        const validatedPortfolio = z.array(CoinInfoSchema).parse(portfolio);

        return res.status(200).json(validatedPortfolio);

    } catch (error) {
        if (error instanceof z.ZodError) return handleZodError(res, error);

        console.error('Error calculating portfolio:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ======================================================================

exports.getTransactionsByCoin = async (req: Request, res: Response) => {
    try {
        const { walletId, coinSymbol } = req.params;

        if (!coinSymbol) {
            return res.status(400).json({ error: "Coin symbol is required" });
        }

        const transactions = await prisma.transactions.findMany({
            where: {
                walletId,
                coinSymbol: coinSymbol.toLowerCase()
            },
            orderBy: { date: 'desc' }
        });

        const formatted = transactions.map((tx: TransactionPayload) => formatTransaction(tx));

        const validatedTransactions = TransactionsArraySchema.parse(formatted);

        return res.status(200).json(validatedTransactions);

    } catch (error: any) {
        if (error instanceof z.ZodError) return handleZodError(res, error);
        console.error('Error fetching transactions by coin:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};