/*
  Warnings:

  - You are about to drop the column `coinInfoId` on the `Transactions` table. All the data in the column will be lost.
  - You are about to drop the `CoinInfo` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `coinSymbol` to the `Transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Transactions" DROP CONSTRAINT "Transactions_coinInfoId_fkey";

-- DropForeignKey
ALTER TABLE "Transactions" DROP CONSTRAINT "Transactions_walletId_fkey";

-- AlterTable
ALTER TABLE "Transactions" DROP COLUMN "coinInfoId",
ADD COLUMN     "coinSymbol" TEXT NOT NULL;

-- DropTable
DROP TABLE "CoinInfo";

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
