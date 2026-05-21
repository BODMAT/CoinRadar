-- Drop unused metadata column (merge-confirm flow was removed).
ALTER TABLE "EmailToken" DROP COLUMN IF EXISTS "metadata";
