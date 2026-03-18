-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "swapGroupId" TEXT;

-- CreateTable
CREATE TABLE "SwapSettings" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "swapEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stableCoins" TEXT[] DEFAULT ARRAY['usdt', 'usdc']::TEXT[],

    CONSTRAINT "SwapSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SwapSettings_walletId_key" ON "SwapSettings"("walletId");

-- AddForeignKey
ALTER TABLE "SwapSettings" ADD CONSTRAINT "SwapSettings_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
