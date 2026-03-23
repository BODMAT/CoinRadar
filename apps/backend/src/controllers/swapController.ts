import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
const prisma = require('../prisma');
const z = require('zod');
const crypto = require('crypto');
const { CreateSwapSchema, UpdateSwapSettingsSchema } = require('../models/SwapSchema');
const { handleZodError, getCoinBalance } = require('../utils/helpers');

type TransactionPayload = Prisma.TransactionsGetPayload<{}>;
const MAX_SWAP_TRANSACTION_RETRIES = 3;

const isRetryableSerializationError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;

    const candidate = error as { code?: string; message?: string };
    const message = (candidate.message || '').toLowerCase();

    return candidate.code === 'P2034' || message.includes('serialize') || message.includes('deadlock');
};

const formatTransaction = (tx: TransactionPayload) => {
    return {
        ...tx,
        price: Number(tx.price),
        quantity: Number(tx.quantity),
        total: Number(tx.price) * Number(tx.quantity),
    };
};

exports.createSwap = async (req: Request, res: Response) => {
    try {
        const { walletId } = req.params;
        const validationResult = CreateSwapSchema.safeParse(req.body);

        if (!validationResult.success) {
            return handleZodError(res, validationResult.error);
        }

        const swapSettings = await prisma.swapSettings.findUnique({
            where: { walletId },
            select: { swapEnabled: true },
        });

        if (!swapSettings?.swapEnabled) {
            return res.status(403).json({
                error: 'Swap is disabled for this wallet. Enable it in swap settings.',
            });
        }

        const {
            fromCoin,
            fromQuantity,
            fromPrice,
            toCoin,
            toQuantity,
            toPrice,
            createdAt,
        } = validationResult.data;

        if (fromCoin === toCoin) {
            return res.status(400).json({ error: 'fromCoin and toCoin must be different.' });
        }

        const swapGroupId = crypto.randomUUID();
        const createdAtData = createdAt ? { createdAt } : {};

        let sellTx: TransactionPayload | null = null;
        let buyTx: TransactionPayload | null = null;

        for (let attempt = 1; attempt <= MAX_SWAP_TRANSACTION_RETRIES; attempt += 1) {
            try {
                const transactionResult = await prisma.$transaction(async (tx: any) => {
                    const balanceAtTime = await getCoinBalance(walletId, fromCoin, createdAt, tx);

                    if (balanceAtTime < fromQuantity) {
                        throw new Error(
                            `INSUFFICIENT_BALANCE: Insufficient funds. Available balance was ${balanceAtTime} ${fromCoin.toUpperCase()} up to swap time, but tried to swap ${fromQuantity}.`
                        );
                    }

                    const createdSellTx = await tx.transactions.create({
                        data: {
                            walletId,
                            coinSymbol: fromCoin,
                            buyOrSell: 'sell',
                            price: fromPrice,
                            quantity: fromQuantity,
                            swapGroupId,
                            ...createdAtData,
                        },
                    });

                    const createdBuyTx = await tx.transactions.create({
                        data: {
                            walletId,
                            coinSymbol: toCoin,
                            buyOrSell: 'buy',
                            price: toPrice,
                            quantity: toQuantity,
                            swapGroupId,
                            ...createdAtData,
                        },
                    });

                    return {
                        sell: createdSellTx,
                        buy: createdBuyTx,
                    };
                }, {
                    isolationLevel: 'Serializable',
                });

                sellTx = transactionResult.sell as TransactionPayload;
                buyTx = transactionResult.buy as TransactionPayload;
                break;
            } catch (error: any) {
                if (error instanceof Error && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
                    return res.status(400).json({
                        error: error.message.replace('INSUFFICIENT_BALANCE: ', ''),
                    });
                }

                if (isRetryableSerializationError(error)) {
                    if (attempt < MAX_SWAP_TRANSACTION_RETRIES) {
                        continue;
                    }

                    return res.status(409).json({
                        error: 'Swap conflicted with another operation. Please retry.',
                    });
                }

                throw error;
            }
        }

        if (!sellTx || !buyTx) {
            return res.status(500).json({ error: 'Swap transaction failed unexpectedly.' });
        }

        return res.status(201).json({
            sell: formatTransaction(sellTx),
            buy: formatTransaction(buyTx),
            swapGroupId,
        });
    } catch (error: any) {
        if (error.code === 'P2003') {
            return res.status(404).json({ error: 'Wallet not found.' });
        }
        if (error instanceof z.ZodError) return handleZodError(res, error);

        console.error('Error creating swap:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getSwapSettings = async (req: Request, res: Response) => {
    try {
        const { walletId } = req.params;

        const settings = await prisma.swapSettings.findUnique({
            where: { walletId },
        });

        if (!settings) {
            return res.status(200).json({
                walletId,
                swapEnabled: false,
                stableCoins: ['usdt', 'usdc'],
            });
        }

        return res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching swap settings:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateSwapSettings = async (req: Request, res: Response) => {
    try {
        const { walletId } = req.params;
        const validationResult = UpdateSwapSettingsSchema.safeParse(req.body);

        if (!validationResult.success) {
            return handleZodError(res, validationResult.error);
        }

        const { swapEnabled, stableCoins } = validationResult.data;

        if (swapEnabled === undefined && stableCoins === undefined) {
            return res.status(400).json({ error: 'No fields provided for update.' });
        }

        const settings = await prisma.swapSettings.upsert({
            where: { walletId },
            update: {
                ...(swapEnabled !== undefined ? { swapEnabled } : {}),
                ...(stableCoins !== undefined ? { stableCoins } : {}),
            },
            create: {
                walletId,
                swapEnabled: swapEnabled ?? false,
                stableCoins: stableCoins ?? ['usdt', 'usdc'],
            },
        });

        return res.status(200).json(settings);
    } catch (error: any) {
        if (error.code === 'P2003') {
            return res.status(404).json({ error: 'Wallet not found.' });
        }
        if (error instanceof z.ZodError) return handleZodError(res, error);

        console.error('Error updating swap settings:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
