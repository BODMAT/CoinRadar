-- Cascade Wallet (and its dependents) when the owning User is deleted, so
-- account deletion works without manual wallet cleanup.
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
