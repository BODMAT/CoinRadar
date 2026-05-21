process.env.JWT_SECRET = process.env.JWT_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
process.env.CORS_ALLOWED_ORIGINS =
  process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173";
process.env.COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || "lax";
process.env.NODE_ENV = "test";
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";
process.env.GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:4000/api/auth/google/callback";
process.env.API_PUBLIC_URL =
  process.env.API_PUBLIC_URL || "http://localhost:4000";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in test environment.");
}

jest.setTimeout(120000);

beforeEach(() => {
  const { __resetCapturedEmails } = require("../../src/services/emailService");
  __resetCapturedEmails();
});

afterAll(async () => {
  const prisma = require("../../src/prisma").default;
  await prisma.$disconnect();
});
