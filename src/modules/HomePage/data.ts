export interface TextBlock {
    text: string;
}

export const DATA: TextBlock[] = [
    { text: "Welcome to CoinRadar" },
    { text: "Welcome to the world of crypto at your fingertips.Our platform brings you real- time prices, detailed charts, and market analytics for the top cryptocurrencies.With a clean interface and intuitive navigation, you’ll get the information you need without the noise — whether you're a beginner or a seasoned trader." },
    { text: "Track the market live, build your own favorites list, and dive into full coin statistics — all instantly accessible the moment you land on the site.This isn’t just a price tracker; it’s a tool to help you understand the crypto world and make smarter decisions." },
];

export const BTNDATA: { short: string, title: string, children: React.ReactNode | null } = {
    short: "More info",
    title: "Welcome to CoinRadar",
    children: "This website is designed for tracking token prices and building your own demo portfolio. Users can explore real-time prices (simulated for demo), mark favorite tokens, and manage a virtual portfolio without any actual transactions. It’s a safe environment to learn how crypto investments work and experiment with strategies."
}
