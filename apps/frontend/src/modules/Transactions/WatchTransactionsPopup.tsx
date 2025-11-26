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

    const isSpecificCoin = !!coinSymbol;

    const { data: allTransactionsData, isLoading: isLoadingAll } = useGetPaginatedTransactionsQuery(
        {
            walletId: selectedWalletId || "",
            page: 1,
            limit: 100 // TODO: make this dynamic
        },
        { skip: !selectedWalletId || isSpecificCoin }
    );

    const { data: coinTransactionsData, isLoading: isLoadingCoin } = useGetTransactionsByCoinQuery(
        {
            walletId: selectedWalletId || "",
            coinSymbol: coinSymbol || ""
        },
        { skip: !selectedWalletId || !isSpecificCoin }
    );

    const { data: allCoins } = useGetAllCoinsQuery();
    const [deleteTransaction, { isLoading: isDeleting }] = useDeleteTransactionMutation();

    if (!selectedWalletId) return null;

    const transactions = isSpecificCoin ? coinTransactionsData : allTransactionsData?.data;
    const isLoading = isSpecificCoin ? isLoadingCoin : isLoadingAll;

    if (isLoading) return <div>Loading...</div>;
    if (!transactions || transactions.length === 0) return <div>No transactions</div>;
    if (!allCoins) return <div>Loading coins...</div>;

    const transactionsToShow = transactions.map((transaction) => {
        const apiCoin = allCoins.find((coin) => coin.symbol.toLowerCase() === transaction.coinSymbol.toLowerCase());
        return {
            ...transaction,
            image: apiCoin?.image || "https://via.placeholder.com/40",
            name: apiCoin?.name || transaction.coinSymbol
        }
    });


    const handleDeleteTransaction = async (transactionId: string) => {
        try {
            await deleteTransaction({
                walletId: selectedWalletId,
                transactionId: transactionId
            }).unwrap();

            dispatch(closePopup());
            setTimeout(() => {
                dispatch(openPopup({ title: "Success", children: "Transaction deleted!" }));
            }, 300);

        } catch (error: any) {
            dispatch(closePopup());
            setTimeout(() => {
                dispatch(openPopup({ title: "Failure", children: error.data?.error || "Failed to delete" }));
            }, 300);
        }
    };

    const handleChangeTransaction = (transactionId: string) => {
        dispatch(openPopup({ title: "Edit transaction", children: <ChangeTransactionPopup transactionId={transactionId} /> }));
    }

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

            {transactionsToShow.map(transaction => (
                <div key={transaction.id} className={`text-[15px] text-center max-md:text-[12px] grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 items-center content-center gap-1 max-md:gap-px p-4 m-1 border-b border-gray-300 rounded-xl ${transaction.buyOrSell === "buy" ? "bg-green-400" : "bg-red-400"}`}>
                    <div className="flex gap-2 items-center mx-auto">
                        <img src={transaction.image} alt={transaction.name} className="w-8 h-8 max-[385px]:hidden" />
                        <span className="uppercase font-bold">{transaction.coinSymbol}</span>
                    </div>
                    <div className="max-[460px]:hidden uppercase font-bold">{transaction.buyOrSell}</div>
                    <div>{formatQuantity(transaction.quantity)}</div>
                    <div>{formatPrice(transaction.price)}</div>

                    <div className="max-[560px]:hidden">{new Date(transaction.date).toDateString()}</div>

                    <button onClick={() => handleChangeTransaction(transaction.id)} className="flex justify-center items-center transitioned hover:scale-105 cursor-pointer">
                        <img className="w-8 h-8 max-[460px]:w-6 max-[460px]:h-6" src={EditSVG} alt="edit" />
                    </button>
                    <button onClick={() => handleDeleteTransaction(transaction.id)} disabled={isDeleting} className="flex justify-center w-7 h-7 max-[460px]:w-6 max-[460px]:h-6 mx-auto items-center transitioned hover:scale-105 cursor-pointer rounded-[50%] bg-black disabled:opacity-50">
                        <img className="w-5 h-5 mx-auto max-[460px]:w-4 max-[460px]:h-4" src={DeleteSVG} alt="delete" />
                    </button>
                </div>
            ))}
        </>
    );
}