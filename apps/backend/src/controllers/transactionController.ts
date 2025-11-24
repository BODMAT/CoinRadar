import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

const prisma = require('../prisma');
const z = require('zod');
const {
    TransactionResponseSchema,
    CreateTransactionDto,
    PaginatedTransactionsSchema
} = require('../models/TransactionSchema');
const { handleZodError } = require('../utils/helpers');

const TransactionsArraySchema = z.array(TransactionResponseSchema);

type TransactionPayload = Prisma.TransactionsGetPayload<{}>;

const formatTransaction = (tx: TransactionPayload) => {
    // decimal -> number + total
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

        const { coinSymbol, buyOrSell, price, quantity } = validationResult.data;

        const newTransaction = await prisma.transactions.create({
            data: {
                walletId,
                coinSymbol,
                buyOrSell,
                price,
                quantity
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
        return res.status(500).json({ error: 'Internal Server Error' });
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
        const { transactionId } = req.params;
        const deleted = await prisma.transactions.delete({
            where: { id: transactionId }
        });
        return res.status(200).json({ message: 'Transaction deleted', id: deleted.id });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        return res.status(500).json({ error: 'Server error' });
    }
};

// ======================================================================

exports.updateTransaction = async (req: Request, res: Response) => {
    try {
        const { transactionId } = req.params;
        const validationResult = CreateTransactionDto.omit({ walletId: true, coinSymbol: true }).partial().safeParse(req.body);

        if (!validationResult.success) {
            return handleZodError(res, validationResult.error);
        }

        const { price, quantity, buyOrSell } = validationResult.data;

        const updated = await prisma.transactions.update({
            where: { id: transactionId },
            data: { price, quantity, buyOrSell },
        });

        const formatted = formatTransaction(updated as TransactionPayload);
        return res.status(200).json(formatted);

    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        return res.status(500).json({ error: 'Server error' });
    }
};