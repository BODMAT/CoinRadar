import { useState, useMemo } from "react";
import {
  useGetPaginatedTransactionsQuery,
  useGetTransactionsByCoinQuery,
  useDeleteTransactionMutation,
} from "./transaction.api";
import { closePopup, openPopup } from "../../portals/popup.slice";
import { useAppDispatch, useAppSelector } from "../../store";
import { ChangeTransactionPopup } from "./ChangeTransactionPopup";
import { useGetAllCoinsQuery } from "../AllCrypto/all-crypto.api";
import { extractApiErrorMessage } from "../../utils/functions";
import { TransactionRow, TransactionRowSkeleton } from "./TransactionRow";

export function WatchTransactionsPopup({
  coinSymbol,
}: {
  coinSymbol?: string;
}) {
  const dispatch = useAppDispatch();
  const selectedWalletId = useAppSelector(
    (state) => state.selectedWallet.selectedWalletId,
  );

  const [page, setPage] = useState(1);
  const limit = 4;

  const isSpecificCoin = !!coinSymbol;

  const {
    data: allTransactionsData,
    isLoading: isLoadingAll,
    isFetching: isFetchingAll,
  } = useGetPaginatedTransactionsQuery(
    { walletId: selectedWalletId || "", page, limit },
    { skip: !selectedWalletId || isSpecificCoin },
  );

  const { data: coinTransactionsData, isLoading: isLoadingCoin } =
    useGetTransactionsByCoinQuery(
      { walletId: selectedWalletId || "", coinSymbol: coinSymbol || "" },
      { skip: !selectedWalletId || !isSpecificCoin },
    );

  const { data: allCoins } = useGetAllCoinsQuery();
  const [deleteTransaction, { isLoading: isDeleting }] =
    useDeleteTransactionMutation();

  const rawTransactions = isSpecificCoin
    ? coinTransactionsData
    : allTransactionsData?.data;
  const meta = allTransactionsData?.meta;

  const isPageLoading = isSpecificCoin
    ? isLoadingCoin
    : isLoadingAll || isFetchingAll;

  const transactionsToShow = useMemo(() => {
    if (!rawTransactions) return [];
    return rawTransactions.map((transaction) => {
      const apiCoin = allCoins?.find(
        (c) => c.symbol.toLowerCase() === transaction.coinSymbol.toLowerCase(),
      );
      return {
        ...transaction,
        image: apiCoin?.image || "https://via.placeholder.com/40",
        name: apiCoin?.name || transaction.coinSymbol,
      };
    });
  }, [rawTransactions, allCoins]);

  const skeletons = Array(limit).fill(0);

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!selectedWalletId) return;

    try {
      await deleteTransaction({
        walletId: selectedWalletId,
        transactionId,
      }).unwrap();
      dispatch(closePopup());
      setTimeout(
        () =>
          dispatch(
            openPopup({ title: "Success", children: "Transaction deleted!" }),
          ),
        300,
      );
    } catch (error: unknown) {
      dispatch(closePopup());
      const message = extractApiErrorMessage(error);
      setTimeout(
        () => dispatch(openPopup({ title: "Failure", children: message })),
        300,
      );
    }
  };

  const handleChangeTransaction = (transactionId: string) => {
    dispatch(
      openPopup({
        title: "Edit transaction",
        children: <ChangeTransactionPopup transactionId={transactionId} />,
      }),
    );
  };

  if (!selectedWalletId) return null;

  return (
    <>
      <div className="grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 gap-1 max-md:gap-px p-4 m-1 text-center items-center content-center text-[15px] max-md:text-[12px] max-[460px]:text-[10px]!">
        <div className="font-bold">Coin</div>
        <div className="font-bold max-[460px]:hidden">Action</div>
        <div className="font-bold">Quantity</div>
        <div className="font-bold">Price</div>
        <div className="font-bold max-[560px]:hidden">Date</div>
        <div className="font-bold">Change</div>
        <div className="font-bold">Delete</div>
      </div>

      <div>
        {isPageLoading
          ? skeletons.map((_, index) => <TransactionRowSkeleton key={index} />)
          : transactionsToShow.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onEdit={() => handleChangeTransaction(transaction.id)}
                onDelete={() => handleDeleteTransaction(transaction.id)}
                isDeleting={isDeleting}
              />
            ))}

        {!isPageLoading && transactionsToShow.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            No transactions found
          </div>
        )}
      </div>

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
