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
const { CoinInfoSchema } = require('../models/CoinInfoSchema');

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
            orderBy: { createdAt: 'desc' }
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

        const { coinSymbol, buyOrSell, price, quantity, createdAt } = validationResult.data;

        if (buyOrSell === 'sell') {
            const balanceAtTime = await getCoinBalance(walletId, coinSymbol, createdAt);

            if (balanceAtTime < quantity) {
                return res.status(400).json({
                    error: `Insufficient funds. Available balance was ${balanceAtTime} ${coinSymbol.toUpperCase()} before transaction time (${createdAt.toLocaleString()}), but tried to sell ${quantity}.`
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
                createdAt
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
                orderBy: { createdAt: 'desc' },
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

        const validatedResponse = TransactionResponseSchema.parse(formatted);

        return res.status(200).json(validatedResponse);

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

        const qtyToDelete = Number(transactionToDelete.quantity);
        const symbol = transactionToDelete.coinSymbol;

        if (transactionToDelete.buyOrSell === 'buy') {
            // Get a net effect (balance) from all transactions that occurred STRICTLY AFTER the deleted purchase
            const subsequentTransactions = await prisma.transactions.findMany({
                where: {
                    walletId,
                    coinSymbol: symbol,
                    createdAt: { gt: transactionToDelete.createdAt }, // strictly after
                },
                select: { buyOrSell: true, quantity: true }
            });

            let subsequentBalance = 0;
            for (const tx of subsequentTransactions) {
                const qty = Number(tx.quantity);
                if (tx.buyOrSell === 'buy') {
                    subsequentBalance += qty;
                } else {
                    subsequentBalance -= qty;
                }
            }

            // Get the balance BEFORE the date of the deleted transaction (everything that was BEFORE)
            const balanceBeforeTx = await getCoinBalance(walletId, symbol, transactionToDelete.createdAt);

            // Calculation of the total modelled balance (Balance before Tx + Net effect after Tx)
            // If we remove Tx, then the final balance = (Balance UP) + (Effect AFTER)
            const finalBalance = balanceBeforeTx + subsequentBalance;

            if (finalBalance < 0) {
                return res.status(400).json({
                    error: `Cannot delete purchase. This would result in a negative balance of ${symbol.toUpperCase()} because subsequent sales depend on this purchase. Balance would be ${finalBalance.toFixed(8)}.`
                });
            }
        }

        // Removal (if it was a sale, no verification is necessary, since removing the sale cannot create a negative balance)
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

        const { price, quantity, buyOrSell, createdAt } = validationResult.data;

        const newQuantity = quantity !== undefined ? quantity : Number(oldTransaction.quantity);
        const newType = buyOrSell !== undefined ? buyOrSell : oldTransaction.buyOrSell;
        const newCreatedAt = createdAt !== undefined ? createdAt : oldTransaction.createdAt;
        const symbol = oldTransaction.coinSymbol;

        //! COMPLEX BALANCE VALIDATION LOGIC (CHRONOLOGICAL RECALCULATION)

        // Receive all transactions except the one we edit
        const transactionsWithoutCurrent = await prisma.transactions.findMany({
            where: {
                walletId,
                coinSymbol: symbol,
                id: { not: transactionId } // Exclude old transaction
            },
            // Sorting by date VERY IMPORTANT for correct recalculation
            orderBy: { createdAt: 'asc' }
        });

        const simulatedTransactions = [...transactionsWithoutCurrent];
        const newSimulatedTx = {
            id: transactionId,
            buyOrSell: newType,
            quantity: newQuantity,
            createdAt: newCreatedAt,
        };

        let insertionIndex = simulatedTransactions.length;
        for (let i = 0; i < simulatedTransactions.length; i++) {
            if (newCreatedAt < simulatedTransactions[i].createdAt) {
                insertionIndex = i;
                break;
            }
        }
        simulatedTransactions.splice(insertionIndex, 0, newSimulatedTx as any);

        // We count the balance CONSISTENTLY for each transaction
        let runningBalance = 0;
        let negativeBalanceOccurred = false;

        for (const tx of simulatedTransactions) {
            const qty = Number(tx.quantity);
            if (tx.buyOrSell === 'buy') {
                runningBalance += qty;
            } else {
                runningBalance -= qty;
            }

            // Check: balance must not become negative at any point in history
            if (runningBalance < 0) {
                negativeBalanceOccurred = true;
                break; // There is no point in continuing if the balance is broken
            }
        }

        if (negativeBalanceOccurred) {
            return res.status(400).json({
                error: `Cannot update transaction. This change violates the chronological balance resulting in a negative balance for ${symbol.toUpperCase()}.`
            });
        }

        const updated = await prisma.transactions.update({
            where: { id: transactionId },
            data: {
                price,
                quantity,
                buyOrSell,
                createdAt: newCreatedAt
            },
        });

        const formatted = formatTransaction(updated as TransactionPayload);
        const validatedResponse = TransactionResponseSchema.parse(formatted);
        return res.status(200).json(validatedResponse);

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
            orderBy: { createdAt: 'asc' }
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
            orderBy: { createdAt: 'desc' }
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

// ======================================================================
exports.getCoinStats = async (req: Request, res: Response) => {
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
            orderBy: { createdAt: 'asc' }
        });

        let currentQuantity = 0;
        let totalBuyCost = 0;
        let totalBuyQty = 0;

        for (const tx of transactions) {
            const price = Number(tx.price);
            const quantity = Number(tx.quantity);
            const total = price * quantity;

            if (tx.buyOrSell === 'buy') {
                totalBuyCost += total;
                totalBuyQty += quantity;
                currentQuantity += quantity;
            } else {
                currentQuantity -= quantity;
            }
        }

        const avgPrice = totalBuyQty > 0
            ? totalBuyCost / totalBuyQty
            : 0;

        const stats = {
            coinSymbol: coinSymbol.toLowerCase(),
            totalQuantity: Number(currentQuantity.toFixed(8)),
            avgBuyingPrice: Number(avgPrice.toFixed(2))
        };

        const validatedStats = CoinInfoSchema.parse(stats);

        return res.status(200).json(validatedStats);

    } catch (error) {
        if (error instanceof z.ZodError) return handleZodError(res, error);
        console.error('Error getting coin stats:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};