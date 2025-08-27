export interface Coin {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    ath: number;
    price_change_percentage_24h: number;
    sparkline_in_7d: {
        price: number[];
    };
    other: any;
}

export const fetchAllCrypto = async (): Promise<Coin[]> => {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true`;
    try {
        const response = await fetch(url);
        const cryptos: Coin[] = await response.json();

        return cryptos;
    } catch (error) {
        console.error(error);
        return [];
    }
}