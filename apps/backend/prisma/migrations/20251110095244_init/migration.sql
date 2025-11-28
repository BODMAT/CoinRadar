/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `login` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BuyOrSell" AS ENUM ('buy', 'sell');

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "name",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "login" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- CreateTable
CREATE TABLE "CoinInfo" (
    "id" TEXT NOT NULL,
    "current_price" DECIMAL(30,10) NOT NULL,
    "image" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_change_percentage_24h" DECIMAL(10,4) NOT NULL,
    "symbol" TEXT NOT NULL,

    CONSTRAINT "CoinInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transactions" (
    "id" TEXT NOT NULL,
    "buyOrSell" "BuyOrSell" NOT NULL,
    "coinInfoId" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL(30,10) NOT NULL,
    "quantity" DECIMAL(30,10) NOT NULL,
    "walletId" TEXT NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'hot',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoinInfo_name_key" ON "CoinInfo"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CoinInfo_symbol_key" ON "CoinInfo"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_coinInfoId_fkey" FOREIGN KEY ("coinInfoId") REFERENCES "CoinInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
