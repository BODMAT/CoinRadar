-- AlterTable: carry merge-confirmation payload (google sub/email) on the token
ALTER TABLE "EmailToken" ADD COLUMN "metadata" JSONB;
