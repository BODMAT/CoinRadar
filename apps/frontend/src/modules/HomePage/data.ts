export interface TextBlock {
    text: string;
}

export const DATA: TextBlock[] = [
    { text: "Welcome to CoinRadar" },
    { text: "On the site, you can track the market live, create your own wallets, and dive into full coin statistics. It’s not just a price tracker — you can explore transactions, monitor your wallets, and get insights that help you make informed decisions." },
    { text: "Beyond simple tracking, CoinRadar empowers you with detailed portfolio performance visuals, showing how your assets change in value over time. Analyze historical trends, review your chronological balance, and maintain complete control over every 'buy' and 'sell' decision you make, ensuring your portfolio always reflects true market value and transaction history." },
];

export const BTNDATA: { short: string, title: string, children: React.ReactNode | null } = {
    short: "More info",
    title: "Chart info",
    children: "The front-end is built using React and TypeScript, leveraging Redux Toolkit and RTK Query for efficient state management and optimized data fetching, with styling handled by Tailwind CSS. The robust production backend is powered by Node.js (Express), utilizing PostgreSQL as the primary database, Prisma ORM for reliable data interactions, and Zod ensuring strict, end-to-end schema validation for maximum data integrity and security. The application is hosted on Render.",
}
