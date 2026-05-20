-- Stores a URL or a data: URL (base64-encoded image) for the user avatar.
-- Populated from Google profile on first Google sign-in; user can override
-- via account settings.
ALTER TABLE "User" ADD COLUMN "photoUrl" TEXT;
