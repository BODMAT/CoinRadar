export interface TextBlock {
    text: string;
}

export const DATA: TextBlock[] = [
    { text: "Welcome to CoinRadar" },
    { text: "This site was built primarily to explore Redux, Redux Toolkit, and RTK Query, including features like cache invalidation and query optimization. Alongside learning, it provides real-time crypto prices, detailed charts, and market analytics for top cryptocurrencies, all within a clean and intuitive interface." },
    { text: "On the site, you can track the market live, create your own wallets, and dive into full coin statistics. It’s not just a price tracker — you can explore transactions, monitor your wallet, and get insights that help you make informed decisions." },

];

export const BTNDATA: { short: string, title: string, children: React.ReactNode | null } = {
    short: "More info",
    title: "Chart info",
    children: "Note: The chart may not be fully accurate. The data is provided by CoinGecko API has limits for free users.",
}
