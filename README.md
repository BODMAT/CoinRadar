# CoinRadar

CoinRadar is a crypto portfolio tracking web application with wallet management, transaction history, and swap support.

## Stack

- Frontend: React, TypeScript, Redux Toolkit, RTK Query, Tailwind CSS, Chart.js
- Backend: Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, Zod, JWT

## Key Features

- Session-based authentication with HttpOnly cookies, access/refresh tokens, and refresh token rotation
- Google OAuth sign-in with callback flow and account linking safeguards
- Wallet management with per-user wallet isolation and access control
- Transaction CRUD with strict chronological validation to prevent invalid historical balances
- Atomic swap execution (single database transaction) with concurrency conflict handling and retry logic
- Deterministic transaction ordering for stable history and chart consistency
- Swap settings per wallet (`swapEnabled`, stable coin list) enforced on backend
- Integration test suite for auth, chronology, swap atomicity, and concurrency scenarios
- CI pipeline with lint, build, and backend integration tests before deployment
