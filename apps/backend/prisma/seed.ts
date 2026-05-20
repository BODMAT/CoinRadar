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

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();

  const seedPassword = "Test12345";
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const users = [
    {
      id: randomUUID(),
      login: "bohdan",
      password: passwordHash,
      email: "bohdan@coinradar.local",
      provider: "local",
    },
    {
      id: randomUUID(),
      login: "natalia",
      password: passwordHash,
      email: "natalia@coinradar.local",
      provider: "local",
    },
    {
      id: randomUUID(),
      login: "taras",
      password: passwordHash,
      email: "taras@coinradar.local",
      provider: "local",
    },
  ];

  await prisma.user.createMany({ data: users });

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

  const transactions = wallets.flatMap((wallet, walletIndex) =>
    txTemplates[walletIndex].map((tx) => ({
      id: randomUUID(),
      walletId: wallet.id,
      coinSymbol: tx.coinSymbol,
      swapGroupId: tx.swapGroupId ?? null,
      buyOrSell: tx.buyOrSell,
      price: tx.price,
      quantity: tx.quantity,
      createdAt: dateDaysAgo(tx.daysAgo),
    })),
  );

  await prisma.transaction.createMany({ data: transactions });

  const beforePivot = transactions.filter(
    (tx) => tx.createdAt < PIVOT_DATE,
  ).length;
  const afterPivot = transactions.length - beforePivot;

  console.log(`Seed completed:
- users: ${users.length}
- wallets: ${wallets.length}
- transactions: ${transactions.length}
- password for all seeded users: ${seedPassword}
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
