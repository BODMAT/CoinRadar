import type { Transaction } from "../modules/Wallet/wallet.api";

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

export const calcSumOfAllTransactions = (transactions: Transaction[]) => {
    return transactions.reduce((acc, transaction) => acc + (transaction.quantity * transaction.buying_price), 0);
};