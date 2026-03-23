process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173';
process.env.COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'lax';
process.env.NODE_ENV = 'test';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in test environment.');
}

jest.setTimeout(120000);

afterAll(async () => {
    const prisma = require('../../src/prisma');
    await prisma.$disconnect();
});
