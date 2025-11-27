import { useState, useMemo } from "react";
import { useGetPaginatedTransactionsQuery, useGetTransactionsByCoinQuery, useDeleteTransactionMutation } from "./transaction.api";
import EditSVG from "../../assets/edit.svg"
import DeleteSVG from "../../assets/cross.svg"
import { closePopup, openPopup } from "../../portals/popup.slice";
import { useAppDispatch, useAppSelector } from "../../store";
import { ChangeTransactionPopup } from "./ChangeTransactionPopup";
import { useGetAllCoinsQuery } from "../AllCrypto/all-crypto.api";
import { formatPrice, formatQuantity } from "../../utils/functions";

export function WatchTransactionsPopup({ coinSymbol }: { coinSymbol?: string }) {
    const dispatch = useAppDispatch();
    const selectedWalletId = useAppSelector((state) => state.selectedWallet.selectedWalletId);

    const [page, setPage] = useState(1);
    const limit = 4;

    const isSpecificCoin = !!coinSymbol;

    // 1. Запити
    const {
        data: allTransactionsData,
        isLoading: isLoadingAll,
        isFetching: isFetchingAll
    } = useGetPaginatedTransactionsQuery(
        { walletId: selectedWalletId || "", page, limit },
        { skip: !selectedWalletId || isSpecificCoin }
    );

    const { data: coinTransactionsData, isLoading: isLoadingCoin } = useGetTransactionsByCoinQuery(
        { walletId: selectedWalletId || "", coinSymbol: coinSymbol || "" },
        { skip: !selectedWalletId || !isSpecificCoin }
    );

    const { data: allCoins } = useGetAllCoinsQuery();
    const [deleteTransaction, { isLoading: isDeleting }] = useDeleteTransactionMutation();

    if (!selectedWalletId) return null;

    const rawTransactions = isSpecificCoin ? coinTransactionsData : allTransactionsData?.data;
    const meta = allTransactionsData?.meta;

    // 2. Визначаємо, чи йде завантаження (перше або нової сторінки)
    // isFetchingAll - true, коли ми перемкнули сторінку і чекаємо дані
    const isPageLoading = isSpecificCoin ? isLoadingCoin : (isLoadingAll || isFetchingAll);

    // 3. Маппінг даних (додаємо картинки)
    const transactionsToShow = useMemo(() => {
        if (!rawTransactions) return [];
        return rawTransactions.map((transaction) => {
            const apiCoin = allCoins?.find((c) => c.symbol.toLowerCase() === transaction.coinSymbol.toLowerCase());
            return {
                ...transaction,
                image: apiCoin?.image || "https://via.placeholder.com/40",
                name: apiCoin?.name || transaction.coinSymbol
            };
        });
    }, [rawTransactions, allCoins]);

    // 4. Масив для скелетонів (стільки ж, скільки limit)
    const skeletons = Array(limit).fill(0);

    const handleDeleteTransaction = async (transactionId: string) => {
        try {
            await deleteTransaction({ walletId: selectedWalletId, transactionId }).unwrap();
            dispatch(closePopup());
            setTimeout(() => dispatch(openPopup({ title: "Success", children: "Transaction deleted!" })), 300);
        } catch (error: any) {
            dispatch(closePopup());
            setTimeout(() => dispatch(openPopup({ title: "Failure", children: error.data?.error || "Failed" })), 300);
        }
    };

    const handleChangeTransaction = (transactionId: string) => {
        dispatch(openPopup({ title: "Edit transaction", children: <ChangeTransactionPopup transactionId={transactionId} /> }));
    }

    return (
        <>
            {/* HEADER (Статичний, без кнопок сортування) */}
            <div className="grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 gap-1 max-md:gap-px p-4 m-1 text-center items-center content-center text-[15px] max-md:text-[12px] max-[460px]:text-[10px]!">
                <div className="font-bold">Coin</div>
                <div className="font-bold max-[460px]:hidden">Action</div>
                <div className="font-bold">Quantity</div>
                <div className="font-bold">Price</div>
                <div className="font-bold max-[560px]:hidden">Date</div>
                <div className="font-bold">Change</div>
                <div className="font-bold">Delete</div>
            </div>

            {/* BODY */}
            <div>
                {isPageLoading ? (
                    // --- SKELETONS (Показуємо під час завантаження) ---
                    skeletons.map((_, index) => (
                        <div key={index} className="grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 gap-1 p-4 m-1 border-b border-gray-200 rounded-xl animate-pulse">
                            <div className="flex gap-2 items-center mx-auto">
                                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                                <div className="w-12 h-4 bg-gray-300 rounded"></div>
                            </div>
                            <div className="max-[460px]:hidden w-10 h-4 bg-gray-300 rounded mx-auto"></div>
                            <div className="w-16 h-4 bg-gray-300 rounded mx-auto"></div>
                            <div className="w-16 h-4 bg-gray-300 rounded mx-auto"></div>
                            <div className="max-[560px]:hidden w-24 h-4 bg-gray-300 rounded mx-auto"></div>
                            <div className="w-6 h-6 bg-gray-300 rounded mx-auto"></div>
                            <div className="w-6 h-6 bg-gray-300 rounded-full mx-auto"></div>
                        </div>
                    ))
                ) : (
                    // --- REAL DATA ---
                    transactionsToShow.map(transaction => (
                        <div key={transaction.id} className={`text-[15px] text-center max-md:text-[12px] grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 items-center content-center gap-1 max-md:gap-px p-4 m-1 border-b border-gray-300 rounded-xl ${transaction.buyOrSell === "buy" ? "bg-green-400/20" : "bg-red-400/20"}`}>
                            <div className="flex gap-2 items-center mx-auto">
                                <img src={transaction.image} alt={transaction.name} className="w-8 h-8 max-[385px]:hidden rounded-full" />
                                <span className="uppercase font-bold">{transaction.coinSymbol}</span>
                            </div>
                            <div className="max-[460px]:hidden uppercase font-bold text-xs">{transaction.buyOrSell}</div>
                            <div>{formatQuantity(transaction.quantity)}</div>
                            <div>{formatPrice(transaction.price)}</div>
                            <div className="max-[560px]:hidden text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString()}</div>

                            <button onClick={() => handleChangeTransaction(transaction.id)} className="flex justify-center items-center hover:scale-110 transition-transform cursor-pointer">
                                <img className="w-6 h-6" src={EditSVG} alt="edit" />
                            </button>

                            <button onClick={() => handleDeleteTransaction(transaction.id)} disabled={isDeleting} className="flex justify-center w-7 h-7 mx-auto items-center hover:scale-110 transition-transform cursor-pointer rounded-full bg-black disabled:opacity-50">
                                <img className="w-4 h-4" src={DeleteSVG} alt="delete" />
                            </button>
                        </div>
                    ))
                )}

                {!isPageLoading && transactionsToShow.length === 0 && (
                    <div className="p-10 text-center text-gray-500">No transactions found</div>
                )}
            </div>

            {/* PAGINATION */}
            {!isSpecificCoin && meta && meta.total > 0 && (
                <div className="flex justify-between items-center mt-4 px-2 pt-2 border-t border-gray-200">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isPageLoading}
                        className="px-3 py-1 text-sm hover:bg-gray-500 disabled:hover:bg-transparent rounded disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-default border border-gray-200"
                    >
                        Prev
                    </button>

                    <span className="text-xs text-gray-500 font-mono">
                        Page {meta.page} of {meta.last_page}
                    </span>

                    <button
                        onClick={() => setPage((p) => (p < meta.last_page ? p + 1 : p))}
                        disabled={page === meta.last_page || isPageLoading}
                        className="px-3 py-1 text-sm hover:bg-gray-500 disabled:hover:bg-transparent rounded disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-default border border-gray-200"
                    >
                        Next
                    </button>
                </div>
            )}
        </>
    );
}