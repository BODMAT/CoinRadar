import type { Request, Response } from 'express';
const prisma = require('../prisma');
const z = require('zod');
const { WalletSchema, WalletCreateSchema, WalletPatchSchema } = require('../models/WalletSchema');
const { handleZodError, calculateWalletStats } = require('../utils/helpers');

const WalletsArraySchema = z.array(WalletSchema);

exports.getWallets = async (req: Request, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const wallets = await prisma.wallet.findMany({
            where: {
                userId: userId,
            },
            include: {
                transactions: {
                    select: {
                        price: true,
                        quantity: true,
                        buyOrSell: true,
                        coinSymbol: true
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });
        const walletsWithStats = wallets.map((wallet: any) => {
            const { invested, realized } = calculateWalletStats(wallet.transactions);
            const { transactions, ...walletData } = wallet;

            return {
                ...walletData,
                totalInvested: invested,
                totalRealizedPnL: realized
            };
        });
        const validatedWallets = WalletsArraySchema.parse(walletsWithStats);
        return res.status(200).json(validatedWallets);

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return handleZodError(res, error);
        }

        console.error('Error fetching wallets:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

//====================================================================

exports.createWallet = async (req: Request, res: Response) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const validatedData = WalletCreateSchema.parse(req.body);
        const name = validatedData.name;

        const newWallet = await prisma.wallet.create({
            data: {
                name: name,
                userId: userId,
            },
        });

        const validatedWalletResponse = WalletSchema.parse(newWallet);
        return res.status(201).json(validatedWalletResponse);

    } catch (error: any) {
        if (error.code === 'P2002') {
            const targetFields = error.meta?.target ?? [];

            const targetArray = Array.isArray(targetFields) ? targetFields : [];

            const field = targetArray.includes('name')
                ? 'name'
                : (targetArray.length > 0 ? targetArray[0] : 'wallet');

            return res.status(409).json({
                error: `A wallet with the same ${field} already exists for this user.`,
            });
        }

        if (error instanceof z.ZodError) {
            return handleZodError(res, error);
        }

        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

//====================================================================

exports.getWallet = async (req: Request, res: Response) => {
    const userId = req.userId;;
    const walletId = req.params.walletId;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const wallet = await prisma.wallet.findUnique({
            where: {
                id: walletId,
                userId: userId,
            },
            include: {
                transactions: {
                    select: {
                        price: true,
                        quantity: true,
                        buyOrSell: true,
                        coinSymbol: true
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const { invested, realized } = calculateWalletStats(wallet.transactions);
        const { transactions, ...walletData } = wallet;

        const responseData = {
            ...walletData,
            totalInvested: invested,
            totalRealizedPnL: realized
        };

        const validatedWallet = WalletSchema.parse(responseData);
        return res.status(200).json(validatedWallet);

    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Wallet not found or access denied.' });
        }
        if (error instanceof z.ZodError) {
            return handleZodError(res, error);
        }

        console.error('Error fetching wallet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

//====================================================================

exports.updateWallet = async (req: Request, res: Response) => {
    const userId = req.userId;
    const walletId = req.params.walletId;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const validatedData = WalletPatchSchema.parse(req.body); //!patch

        if (Object.keys(validatedData).length === 0) {
            return res.status(400).json({ error: 'No fields provided for update.' });
        }

        const updatedWallet = await prisma.wallet.update({
            where: {
                id: walletId,
                userId: userId,
            },
            data: validatedData,
        });

        const validatedResponse = WalletSchema.parse(updatedWallet);
        return res.status(200).json(validatedResponse);
    } catch (error: any) {
        if (error.code === 'P2002') {
            const targetFields = error.meta?.target ?? [];
            const targetArray = Array.isArray(targetFields) ? targetFields : [];
            const field = targetArray.includes('name') ? 'name' : (targetArray.length > 0 ? targetArray[0] : 'wallet');

            return res.status(409).json({
                error: `A wallet with the same ${field} already exists for this user.`,
            });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Wallet not found or access denied.' });
        }

        if (error instanceof z.ZodError) {
            return handleZodError(res, error);
        }

        console.error('Error updating wallet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

//====================================================================

exports.deleteWallet = async (req: Request, res: Response) => {
    const userId = req.userId;
    const walletId = req.params.walletId;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        const deletedWallet = await prisma.wallet.delete({
            where: {
                id: walletId,
                userId: userId,
            },
        });

        return res.status(200).json({ message: `Wallet "${deletedWallet.name}" successfully deleted.` });

    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Wallet not found or access denied.' });
        }

        console.error('Error deleting wallet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

