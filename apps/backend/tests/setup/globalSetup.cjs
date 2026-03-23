const path = require('path');
const { execSync } = require('child_process');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');

module.exports = async () => {
  let container = null;
  let databaseUrl = '';

  try {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('coinradar_test')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();
    databaseUrl = container.getConnectionUri();
  } catch (error) {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error(
        [
          'Could not start testcontainers Postgres (Docker runtime unavailable).',
          'Set TEST_DATABASE_URL to a dedicated test database or start Docker.',
        ].join(' ')
      );
    }
    databaseUrl = process.env.TEST_DATABASE_URL;
    // eslint-disable-next-line no-console
    console.warn('testcontainers unavailable, using TEST_DATABASE_URL fallback.');
  }

  const backendRoot = path.resolve(__dirname, '../..');

  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  process.env.CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173';
  process.env.COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'lax';
  process.env.NODE_ENV = 'test';

  execSync('npx prisma db push --schema=./prisma/schema.prisma', {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  });

  globalThis.__TESTCONTAINER_POSTGRES__ = container;
};
