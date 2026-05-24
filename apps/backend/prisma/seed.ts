import { PrismaClient, BuyOrSell } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const NOW = new Date("2026-05-20T12:00:00.000Z");
const PIVOT_DATE = new Date("2026-03-01T00:00:00.000Z");

type TxInput = {
  coinSymbol: "btc" | "eth" | "sol" | "bnb";
  buyOrSell: BuyOrSell;
  price: string;
  quantity: string;
  daysAgo: number;
  swapGroupId?: string;
};

function dateDaysAgo(daysAgo: number): Date {
  return new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

function dateDaysAhead(daysAhead: number): Date {
  return new Date(NOW.getTime() + daysAhead * 24 * 60 * 60 * 1000);
}

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.swapSettings.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.emailToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.authIdentity.deleteMany();
  await prisma.user.deleteMany();

  const seedPassword = "Test12345";
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const users = [
    {
      id: randomUUID(),
      login: "bohdan",
      password: passwordHash,
      email: "bohdan@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "natalia",
      password: passwordHash,
      email: "natalia@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "taras",
      password: passwordHash,
      email: "taras@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "olena",
      password: passwordHash,
      email: "olena@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "mykola",
      password: passwordHash,
      email: "mykola@coinradar.local",
      emailVerified: false,
    },
    {
      id: randomUUID(),
      login: "anna",
      password: passwordHash,
      email: "anna@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "dmytro",
      password: passwordHash,
      email: "dmytro@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "iryna",
      password: passwordHash,
      email: "iryna@coinradar.local",
      emailVerified: false,
    },
    {
      id: randomUUID(),
      login: "petro",
      password: passwordHash,
      email: "petro@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "svitlana",
      password: passwordHash,
      email: "svitlana@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "andriy",
      password: passwordHash,
      email: "andriy@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "maria",
      password: passwordHash,
      email: "maria@coinradar.local",
      emailVerified: true,
    },
    {
      id: randomUUID(),
      login: "yaroslav",
      password: null,
      email: "yaroslav.google@gmail.com",
      emailVerified: true,
      photoUrl: "https://lh3.googleusercontent.com/a/yaroslav",
    },
    {
      id: randomUUID(),
      login: "oksana",
      password: null,
      email: "oksana.google@gmail.com",
      emailVerified: true,
      photoUrl: "https://lh3.googleusercontent.com/a/oksana",
    },
    {
      id: randomUUID(),
      login: "ivan",
      password: passwordHash,
      email: "ivan@coinradar.local",
      emailVerified: true,
    },
  ];

  await prisma.user.createMany({ data: users });
  await prisma.authIdentity.createMany({
    data: users.map((user, i) => {
      const isGoogle = user.password === null;
      return {
        id: randomUUID(),
        userId: user.id,
        provider: isGoogle ? "google" : "local",
        providerId: isGoogle ? `google-sub-${10000 + i}` : null,
      };
    }),
  });

  const wallets = users.flatMap((user) => [
    {
      id: randomUUID(),
      userId: user.id,
      name: "spot",
    },
    {
      id: randomUUID(),
      userId: user.id,
      name: "swing",
    },
  ]);

  await prisma.wallet.createMany({ data: wallets });

  const swap1 = randomUUID();
  const swap2 = randomUUID();
  const swap3 = randomUUID();
  const swap4 = randomUUID();

  const txTemplates: TxInput[][] = [
    [
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "70400",
        quantity: "0.0180000000",
        daysAgo: 0,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "3650",
        quantity: "0.3500000000",
        daysAgo: 0,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "buy",
        price: "182",
        quantity: "1.3000000000",
        daysAgo: 1,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "sell",
        price: "141",
        quantity: "1.3000000000",
        daysAgo: 1,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "670",
        quantity: "0.4500000000",
        daysAgo: 2,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "sell",
        price: "2710",
        quantity: "0.1200000000",
        daysAgo: 3,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "58100",
        quantity: "0.0200000000",
        daysAgo: 5,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "528",
        quantity: "0.3000000000",
        daysAgo: 6,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "58200",
        quantity: "0.0400000000",
        daysAgo: 91,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "sell",
        price: "62000",
        quantity: "0.0100000000",
        daysAgo: 146,
      },
    ],
    [
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "3540",
        quantity: "0.6000000000",
        daysAgo: 0,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "665",
        quantity: "0.7000000000",
        daysAgo: 1,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "sell",
        price: "538",
        quantity: "0.2000000000",
        daysAgo: 1,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "buy",
        price: "177",
        quantity: "2.2000000000",
        daysAgo: 2,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "buy",
        price: "126",
        quantity: "1.0000000000",
        daysAgo: 4,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "sell",
        price: "2680",
        quantity: "0.2000000000",
        daysAgo: 4,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "59600",
        quantity: "0.0150000000",
        daysAgo: 6,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "sell",
        price: "68800",
        quantity: "0.0050000000",
        daysAgo: 7,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "2680",
        quantity: "0.4500000000",
        daysAgo: 33,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "sell",
        price: "132",
        quantity: "0.6000000000",
        daysAgo: 170,
      },
    ],
    [
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "69800",
        quantity: "0.0100000000",
        daysAgo: 0,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "648",
        quantity: "0.3000000000",
        daysAgo: 0,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "buy",
        price: "172",
        quantity: "1.5000000000",
        daysAgo: 2,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "sell",
        price: "134",
        quantity: "0.6000000000",
        daysAgo: 3,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "3360",
        quantity: "0.5500000000",
        daysAgo: 3,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "sell",
        price: "57950",
        quantity: "0.0040000000",
        daysAgo: 5,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "2570",
        quantity: "0.1500000000",
        daysAgo: 6,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "sell",
        price: "681",
        quantity: "0.1000000000",
        daysAgo: 7,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "2520",
        quantity: "0.9000000000",
        daysAgo: 74,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "sell",
        price: "2860",
        quantity: "0.9000000000",
        daysAgo: 157,
      },
    ],
    [
      {
        coinSymbol: "sol",
        buyOrSell: "sell",
        price: "186",
        quantity: "1.0000000000",
        daysAgo: 0,
        swapGroupId: swap1,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "522",
        quantity: "0.2600000000",
        daysAgo: 0,
        swapGroupId: swap1,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "59300",
        quantity: "0.0120000000",
        daysAgo: 1,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "3420",
        quantity: "0.4200000000",
        daysAgo: 2,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "sell",
        price: "2640",
        quantity: "0.1200000000",
        daysAgo: 2,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "buy",
        price: "129",
        quantity: "0.9000000000",
        daysAgo: 4,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "676",
        quantity: "0.3000000000",
        daysAgo: 6,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "sell",
        price: "68700",
        quantity: "0.0040000000",
        daysAgo: 7,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "buy",
        price: "118",
        quantity: "2.0000000000",
        daysAgo: 120,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "sell",
        price: "141",
        quantity: "2.0000000000",
        daysAgo: 172,
      },
    ],
    [
      {
        coinSymbol: "bnb",
        buyOrSell: "sell",
        price: "682",
        quantity: "0.4000000000",
        daysAgo: 0,
        swapGroupId: swap2,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "2520",
        quantity: "0.0750000000",
        daysAgo: 0,
        swapGroupId: swap2,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "70200",
        quantity: "0.0200000000",
        daysAgo: 1,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "buy",
        price: "133",
        quantity: "2.1000000000",
        daysAgo: 1,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "3470",
        quantity: "0.2400000000",
        daysAgo: 3,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "sell",
        price: "58400",
        quantity: "0.0060000000",
        daysAgo: 5,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "sell",
        price: "175",
        quantity: "0.9000000000",
        daysAgo: 6,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "536",
        quantity: "0.3500000000",
        daysAgo: 7,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "2710",
        quantity: "0.8000000000",
        daysAgo: 52,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "488",
        quantity: "0.6000000000",
        daysAgo: 136,
      },
    ],
    [
      {
        coinSymbol: "btc",
        buyOrSell: "sell",
        price: "70900",
        quantity: "0.0070000000",
        daysAgo: 0,
        swapGroupId: swap3,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "buy",
        price: "121",
        quantity: "2.8400000000",
        daysAgo: 0,
        swapGroupId: swap3,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "sell",
        price: "3510",
        quantity: "0.1800000000",
        daysAgo: 2,
        swapGroupId: swap4,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "58700",
        quantity: "0.0088000000",
        daysAgo: 2,
        swapGroupId: swap4,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "buy",
        price: "542",
        quantity: "0.5000000000",
        daysAgo: 3,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "2660",
        quantity: "0.3300000000",
        daysAgo: 4,
      },
      {
        coinSymbol: "sol",
        buyOrSell: "sell",
        price: "181",
        quantity: "0.9000000000",
        daysAgo: 6,
      },
      {
        coinSymbol: "bnb",
        buyOrSell: "sell",
        price: "674",
        quantity: "0.1200000000",
        daysAgo: 7,
      },
      {
        coinSymbol: "btc",
        buyOrSell: "buy",
        price: "60100",
        quantity: "0.0140000000",
        daysAgo: 85,
      },
      {
        coinSymbol: "eth",
        buyOrSell: "buy",
        price: "2460",
        quantity: "0.7000000000",
        daysAgo: 178,
      },
    ],
  ];

  const coinCycle: ("btc" | "eth" | "sol" | "bnb")[] = [
    "btc",
    "eth",
    "sol",
    "bnb",
  ];
  const basePrices: Record<string, number> = {
    btc: 65000,
    eth: 3100,
    sol: 155,
    bnb: 600,
  };
  const baseQuantities: Record<string, string> = {
    btc: "0.0150000000",
    eth: "0.3000000000",
    sol: "1.4000000000",
    bnb: "0.4000000000",
  };

  const fallbackTemplate = (idx: number): TxInput[] => {
    const c1 = coinCycle[idx % 4];
    const c2 = coinCycle[(idx + 1) % 4];
    const c3 = coinCycle[(idx + 2) % 4];
    return [
      {
        coinSymbol: c1,
        buyOrSell: "buy",
        price: String(basePrices[c1] + idx * 25),
        quantity: baseQuantities[c1],
        daysAgo: (idx % 6) + 1,
      },
      {
        coinSymbol: c2,
        buyOrSell: "buy",
        price: String(basePrices[c2] + idx * 12),
        quantity: baseQuantities[c2],
        daysAgo: (idx % 7) + 2,
      },
      {
        coinSymbol: c3,
        buyOrSell: idx % 3 === 0 ? "sell" : "buy",
        price: String(basePrices[c3] - idx * 8),
        quantity: baseQuantities[c3],
        daysAgo: (idx % 5) + 4,
      },
    ];
  };

  const transactions = wallets.flatMap((wallet, walletIndex) => {
    const template = txTemplates[walletIndex] ?? fallbackTemplate(walletIndex);
    return template.map((tx) => ({
      id: randomUUID(),
      walletId: wallet.id,
      coinSymbol: tx.coinSymbol,
      swapGroupId: tx.swapGroupId ?? null,
      buyOrSell: tx.buyOrSell,
      price: tx.price,
      quantity: tx.quantity,
      createdAt: dateDaysAgo(tx.daysAgo),
    }));
  });

  await prisma.transaction.createMany({ data: transactions });

  // ===== SwapSettings (one per wallet, hand-crafted) =====
  // walletId is @unique on SwapSettings, so one row per chosen wallet.
  const swapSettings = [
    { walletId: wallets[0].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[1].id, swapEnabled: false, stableCoin: "usdt" },
    { walletId: wallets[2].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[3].id, swapEnabled: true, stableCoin: "usdc" },
    { walletId: wallets[4].id, swapEnabled: false, stableCoin: "usdt" },
    { walletId: wallets[5].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[6].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[7].id, swapEnabled: false, stableCoin: "usdc" },
    { walletId: wallets[8].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[9].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[10].id, swapEnabled: false, stableCoin: "usdt" },
    { walletId: wallets[11].id, swapEnabled: true, stableCoin: "usdc" },
    { walletId: wallets[12].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[13].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[14].id, swapEnabled: false, stableCoin: "usdt" },
    { walletId: wallets[15].id, swapEnabled: true, stableCoin: "usdt" },
    { walletId: wallets[16].id, swapEnabled: true, stableCoin: "usdc" },
    { walletId: wallets[17].id, swapEnabled: false, stableCoin: "usdt" },
  ].map((row) => ({ id: randomUUID(), ...row }));

  await prisma.swapSettings.createMany({ data: swapSettings });

  // ===== RefreshTokens (hand-crafted, distributed across users) =====
  // tokenHash is @unique; mix of active, rotated, revoked, expired sessions.
  const refreshTokens = [
    {
      userId: users[0].id,
      tokenHash: "seed-rt-001-bohdan-chrome-win",
      expiresAt: dateDaysAhead(7),
      createdAt: dateDaysAgo(1),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
      ip: "192.168.1.10",
    },
    {
      userId: users[0].id,
      tokenHash: "seed-rt-002-bohdan-ios-safari",
      expiresAt: dateDaysAhead(14),
      createdAt: dateDaysAgo(3),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Safari/605.1.15",
      ip: "10.0.0.42",
    },
    {
      userId: users[1].id,
      tokenHash: "seed-rt-003-natalia-firefox",
      expiresAt: dateDaysAhead(6),
      createdAt: dateDaysAgo(2),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0",
      ip: "185.10.20.30",
    },
    {
      userId: users[1].id,
      tokenHash: "seed-rt-004-natalia-rotated-old",
      expiresAt: dateDaysAhead(2),
      createdAt: dateDaysAgo(5),
      revokedAt: dateDaysAgo(2),
      replacedByTokenHash: "seed-rt-003-natalia-firefox",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0",
      ip: "185.10.20.30",
    },
    {
      userId: users[2].id,
      tokenHash: "seed-rt-005-taras-edge",
      expiresAt: dateDaysAhead(10),
      createdAt: dateDaysAgo(1),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Edge/124.0.0.0",
      ip: "77.88.55.66",
    },
    {
      userId: users[3].id,
      tokenHash: "seed-rt-006-olena-chrome-mac",
      expiresAt: dateDaysAhead(5),
      createdAt: dateDaysAgo(4),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) Chrome/124.0.0.0",
      ip: "82.118.20.5",
    },
    {
      userId: users[3].id,
      tokenHash: "seed-rt-007-olena-expired",
      expiresAt: dateDaysAgo(2),
      createdAt: dateDaysAgo(35),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) Chrome/123.0.0.0",
      ip: "82.118.20.5",
    },
    {
      userId: users[5].id,
      tokenHash: "seed-rt-008-anna-android",
      expiresAt: dateDaysAhead(12),
      createdAt: dateDaysAgo(2),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/124.0.0.0",
      ip: "45.32.18.7",
    },
    {
      userId: users[6].id,
      tokenHash: "seed-rt-009-dmytro-chrome",
      expiresAt: dateDaysAhead(9),
      createdAt: dateDaysAgo(1),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
      ip: "194.44.20.100",
    },
    {
      userId: users[6].id,
      tokenHash: "seed-rt-010-dmytro-revoked-logout",
      expiresAt: dateDaysAhead(1),
      createdAt: dateDaysAgo(6),
      revokedAt: dateDaysAgo(4),
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0",
      ip: "194.44.20.100",
    },
    {
      userId: users[8].id,
      tokenHash: "seed-rt-011-petro-firefox",
      expiresAt: dateDaysAhead(7),
      createdAt: dateDaysAgo(2),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; rv:126.0) Gecko/20100101 Firefox/126.0",
      ip: "176.36.10.55",
    },
    {
      userId: users[9].id,
      tokenHash: "seed-rt-012-svitlana-mac-safari",
      expiresAt: dateDaysAhead(11),
      createdAt: dateDaysAgo(3),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) Safari/605.1.15",
      ip: "212.90.180.22",
    },
    {
      userId: users[10].id,
      tokenHash: "seed-rt-013-andriy-chrome-linux",
      expiresAt: dateDaysAhead(8),
      createdAt: dateDaysAgo(1),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0.0.0",
      ip: "31.42.18.90",
    },
    {
      userId: users[11].id,
      tokenHash: "seed-rt-014-maria-ipad",
      expiresAt: dateDaysAhead(13),
      createdAt: dateDaysAgo(2),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_5) Safari/605.1.15",
      ip: "37.115.220.18",
    },
    {
      userId: users[12].id,
      tokenHash: "seed-rt-015-yaroslav-google",
      expiresAt: dateDaysAhead(14),
      createdAt: dateDaysAgo(1),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
      ip: "91.250.100.40",
    },
    {
      userId: users[13].id,
      tokenHash: "seed-rt-016-oksana-google",
      expiresAt: dateDaysAhead(7),
      createdAt: dateDaysAgo(2),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S908) Chrome/124.0.0.0",
      ip: "188.163.45.12",
    },
    {
      userId: users[14].id,
      tokenHash: "seed-rt-017-ivan-chrome",
      expiresAt: dateDaysAhead(10),
      createdAt: dateDaysAgo(1),
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
      ip: "46.118.77.200",
    },
    {
      userId: users[14].id,
      tokenHash: "seed-rt-018-ivan-old-revoked",
      expiresAt: dateDaysAhead(3),
      createdAt: dateDaysAgo(8),
      revokedAt: dateDaysAgo(1),
      replacedByTokenHash: "seed-rt-017-ivan-chrome",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0",
      ip: "46.118.77.200",
    },
  ].map((row) => ({ id: randomUUID(), ...row }));

  await prisma.refreshToken.createMany({ data: refreshTokens });

  // ===== EmailTokens (verify_email + reset_password) =====
  const emailTokens = [
    {
      userId: users[4].id, // mykola — unverified
      tokenHash: "seed-et-001-verify-mykola",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: null,
      createdAt: dateDaysAgo(0),
    },
    {
      userId: users[7].id, // iryna — unverified
      tokenHash: "seed-et-002-verify-iryna",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: null,
      createdAt: dateDaysAgo(0),
    },
    {
      userId: users[0].id,
      tokenHash: "seed-et-003-verify-bohdan-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(30),
      createdAt: dateDaysAgo(31),
    },
    {
      userId: users[1].id,
      tokenHash: "seed-et-004-verify-natalia-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(28),
      createdAt: dateDaysAgo(29),
    },
    {
      userId: users[2].id,
      tokenHash: "seed-et-005-verify-taras-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(25),
      createdAt: dateDaysAgo(26),
    },
    {
      userId: users[3].id,
      tokenHash: "seed-et-006-verify-olena-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(20),
      createdAt: dateDaysAgo(21),
    },
    {
      userId: users[5].id,
      tokenHash: "seed-et-007-verify-anna-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(18),
      createdAt: dateDaysAgo(19),
    },
    {
      userId: users[0].id,
      tokenHash: "seed-et-008-reset-bohdan-pending",
      purpose: "reset_password",
      expiresAt: dateDaysAhead(1),
      consumedAt: null,
      createdAt: dateDaysAgo(0),
    },
    {
      userId: users[1].id,
      tokenHash: "seed-et-009-reset-natalia-used",
      purpose: "reset_password",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(10),
      createdAt: dateDaysAgo(10),
    },
    {
      userId: users[3].id,
      tokenHash: "seed-et-010-reset-olena-expired",
      purpose: "reset_password",
      expiresAt: dateDaysAgo(5),
      consumedAt: null,
      createdAt: dateDaysAgo(6),
    },
    {
      userId: users[6].id,
      tokenHash: "seed-et-011-verify-dmytro-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(15),
      createdAt: dateDaysAgo(16),
    },
    {
      userId: users[8].id,
      tokenHash: "seed-et-012-verify-petro-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(12),
      createdAt: dateDaysAgo(13),
    },
    {
      userId: users[9].id,
      tokenHash: "seed-et-013-reset-svitlana-used",
      purpose: "reset_password",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(7),
      createdAt: dateDaysAgo(7),
    },
    {
      userId: users[10].id,
      tokenHash: "seed-et-014-verify-andriy-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(9),
      createdAt: dateDaysAgo(10),
    },
    {
      userId: users[11].id,
      tokenHash: "seed-et-015-verify-maria-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(8),
      createdAt: dateDaysAgo(9),
    },
    {
      userId: users[14].id,
      tokenHash: "seed-et-016-reset-ivan-pending",
      purpose: "reset_password",
      expiresAt: dateDaysAhead(1),
      consumedAt: null,
      createdAt: dateDaysAgo(0),
    },
    {
      userId: users[14].id,
      tokenHash: "seed-et-017-verify-ivan-used",
      purpose: "verify_email",
      expiresAt: dateDaysAhead(1),
      consumedAt: dateDaysAgo(22),
      createdAt: dateDaysAgo(23),
    },
  ].map((row) => ({ id: randomUUID(), ...row }));

  await prisma.emailToken.createMany({ data: emailTokens });

  const beforePivot = transactions.filter(
    (tx) => tx.createdAt < PIVOT_DATE,
  ).length;
  const afterPivot = transactions.length - beforePivot;

  console.log(`Seed completed:
- users: ${users.length}
- authIdentities: ${users.length}
- wallets: ${wallets.length}
- transactions: ${transactions.length}
- swapSettings: ${swapSettings.length}
- refreshTokens: ${refreshTokens.length}
- emailTokens: ${emailTokens.length}
- password for all seeded users (except google-only): ${seedPassword}
- before ${PIVOT_DATE.toISOString()}: ${beforePivot}
- on/after ${PIVOT_DATE.toISOString()}: ${afterPivot}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
