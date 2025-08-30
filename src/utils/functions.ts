import type { Wallet } from "../modules/Wallet/wallet.api";

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

export const calcSumOfAllTransactions = (wallet: Wallet) => {
    return wallet.coins.reduce((acc, coin) => acc + coin.transactions.reduce((acc, transaction) => acc + transaction.quantity * transaction.buying_price, 0), 0);
};

export const generateUID = (title: string) => {
    const random = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now().toString(36);
    const correctedTitle = title.replace(/[^a-zA-Z0-9]/g, '');

    return `${correctedTitle}_${timestamp}_${random}`;
};