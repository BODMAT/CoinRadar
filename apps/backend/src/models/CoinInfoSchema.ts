const z = require('zod');

const CoinInfoSchema = z.object({
    coinSymbol: z.string(),
    totalQuantity: z.number().nonnegative(),
    avgBuyingPrice: z.number().nonnegative(),
    //! oth in frontend
    // currentPrice: z.number().optional().nonnegative(),
    // PNL: z.number().optional(),
});

module.exports = { CoinInfoSchema };