import type { Coin } from "../modules/AllCrypto/all-crypto.api";
import type { Transaction, Wallet } from "../modules/Wallet/wallet.api";

export const scrollToSectionById = (
    id: string,
    offset: number = 80,
    onlyMobile: boolean = false
) => {
    if (onlyMobile && window.innerWidth >= 768) return;

    const el = document.getElementById(id);
    if (!el) return;

    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
};

export const calcWalletBalanceWithCurrentPrice = (wallet: Wallet, coinsMarketData: Coin[]): number => {
    let totalBalance = 0;

    for (const coin of wallet.coins) {
        let totalQuantity = 0;

        for (const tx of coin.transactions) {
            if (tx.buyOrSell === "buy") {
                totalQuantity += tx.quantity;
            } else if (tx.buyOrSell === "sell") {
                totalQuantity -= tx.quantity;
            }
        }

        const marketCoin = coinsMarketData.find(c => c.id === coin.id);
        if (marketCoin) {
            totalBalance += totalQuantity * marketCoin.current_price;
        }
    }

    return Number(totalBalance.toFixed(2));
};

export const calcWalletProfitLoss = (wallet: Wallet, coinsMarketData: Coin[]): number => {
    let totalSpent = 0;
    let totalCurrentValue = 0;

    for (const coin of wallet.coins) {
        let quantity = 0;
        let spentOnCoin = 0;

        for (const tx of coin.transactions) {
            if (tx.buyOrSell === "buy") {
                quantity += tx.quantity;
                spentOnCoin += tx.quantity * tx.price;
            } else if (tx.buyOrSell === "sell") {
                quantity -= tx.quantity;
                spentOnCoin -= (spentOnCoin / quantity) * tx.quantity;
            }
        }

        const marketCoin = coinsMarketData.find(c => c.id === coin.id);
        if (marketCoin) {
            totalCurrentValue += quantity * marketCoin.current_price;
            totalSpent += spentOnCoin;
        }
    }

    return Number((totalCurrentValue - totalSpent).toFixed(2));
};

export const generateUID = (title: string) => {
    const random = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now().toString(36);
    const correctedTitle = title.replace(/[^a-zA-Z0-9]/g, '');

    return `${correctedTitle}_${timestamp}_${random}`;
};

export function calculateAveragePrice(transactions: Transaction[]): number {
    let totalQuantity = 0;
    let totalCost = 0;

    for (const tx of transactions) {
        if (tx.buyOrSell === "buy") {
            totalCost += tx.price * tx.quantity;
            totalQuantity += tx.quantity;
        } else if (tx.buyOrSell === "sell") {
            totalQuantity -= tx.quantity;
        }
    }
    const result = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return Number(result.toFixed(2));
}

export function calculateAverageBuyingPrice(transactions: Transaction[]): number {
    let totalQuantity = 0;
    let totalCost = 0;

    for (const tx of transactions) {
        if (tx.buyOrSell === "buy") {
            totalCost += tx.price * tx.quantity;
            totalQuantity += tx.quantity;
        }
    }
    const result = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return Number(result.toFixed(2));
}

export const calcTransactionsProfitLoss = (transactions: Transaction[], coinMarketData: Coin): number => {
    let quantity = 0;
    let totalSpent = 0;

    for (const tx of transactions) {
        if (tx.buyOrSell === "buy") {
            totalSpent += tx.price * tx.quantity;
            quantity += tx.quantity;
        } else if (tx.buyOrSell === "sell") {
            if (quantity <= 0) continue; // защита от деления на 0
            const averagePrice = totalSpent / quantity;
            totalSpent -= averagePrice * tx.quantity;
            quantity -= tx.quantity;
        }
    }

    if (quantity <= 0) return 0;

    const marketCoin = coinMarketData;
    if (!marketCoin) return 0;

    const totalCurrentValue = quantity * marketCoin.current_price;
    return Number((totalCurrentValue - totalSpent).toFixed(2));
};

