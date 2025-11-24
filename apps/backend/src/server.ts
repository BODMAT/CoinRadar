require('dotenv').config();
const express = require('express');
import type { Express, Request, Response } from 'express';
const cors = require('cors');
const prisma = require('./prisma');

const authRouter = require('./router/authRouter');
const walletRouter = require('./router/walletRouter');
const transactionRouter = require('./router/transactionRouter');

const app: Express = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));

// Routers
app.use('/api/auth', authRouter);
app.use('/api/wallets', walletRouter);
app.use('/api/transactions', transactionRouter);

app.get('/api/status', async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ message: 'API Server is running and DB is connected!', status: 'OK' });
    } catch (error) {
        res.status(500).json({ message: 'API Server is running, but DB connection failed.', status: 'ERROR' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at PORT: ${PORT}`);
});