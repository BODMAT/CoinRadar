-- Replace stableCoins TEXT[] with a single scalar stableCoin TEXT to satisfy 1NF.
-- Existing rows keep the first element of the array (fallback to 'usdt' if NULL/empty).

ALTER TABLE "SwapSettings" ADD COLUMN "stableCoin" TEXT NOT NULL DEFAULT 'usdt';

UPDATE "SwapSettings"
SET "stableCoin" = COALESCE("stableCoins"[1], 'usdt');

ALTER TABLE "SwapSettings" DROP COLUMN "stableCoins";
