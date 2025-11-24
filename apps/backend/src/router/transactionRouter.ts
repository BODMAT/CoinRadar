const express = require('express');
const transactionRouter = express.Router({ mergeParams: true });

const { getTransactions, createTransaction, getTransaction, updateTransaction, deleteTransaction, getPaginatedTransactions } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

transactionRouter.use(protect);

transactionRouter.get('/', getTransactions);
transactionRouter.get('/paginated', getPaginatedTransactions);
transactionRouter.post('/', createTransaction);

transactionRouter.get('/:transactionId', getTransaction);
transactionRouter.patch('/:transactionId', updateTransaction);
transactionRouter.delete('/:transactionId', deleteTransaction);

module.exports = transactionRouter;