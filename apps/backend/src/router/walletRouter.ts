const express = require('express');
const walletRouter = express.Router();

const { getWallets, createWallet, getWallet, updateWallet, deleteWallet } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

walletRouter.use(protect);

walletRouter.get('/', getWallets); // all wallets of user

walletRouter.post('/', createWallet);
walletRouter.get('/:walletId', getWallet);
walletRouter.patch('/:walletId', updateWallet);
walletRouter.delete('/:walletId', deleteWallet);

module.exports = walletRouter;