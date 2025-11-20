import { useDeleteWalletCoinTransactionMutation, useGetWalletQuery, type TransactionWithCoinId } from "./transaction.api";
import EditSVG from "../../assets/edit.svg"
import DeleteSVG from "../../assets/cross.svg"
import { closePopup, openPopup } from "../../portals/popup.slice";
import { useAppDispatch, useAppSelector } from "../../store";
import { ChangeTransactionPopup } from "./ChangeTransactionPopup";

export function WatchTransactionsPopup({ coinId }: { coinId?: string }) {
    const dispach = useAppDispatch();
    const user = useAppSelector(state => state.auth.user);
    const { data: wallet } = useGetWalletQuery(user?.uid || "", { skip: !user });
    const [deleteTransaction] = useDeleteWalletCoinTransactionMutation();
    if (!wallet) return null;

    const allTransactions: TransactionWithCoinId[] | undefined =
        coinId ?
            wallet.coins
                .find(coin => coin.id === coinId)
                ?.transactions.map(tx => ({ ...tx, coinId }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            :
            wallet.coins
                .flatMap(coin =>
                    coin.transactions.map(tx => ({ ...tx, coinId: coin.id }))
                )
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleDeleteTransaction = async (transaction: TransactionWithCoinId) => {
        await deleteTransaction({
            transactionId: transaction.id,
            walletId: wallet.id,
            coinId: transaction.coinId,
        })
        dispach(closePopup());
        await new Promise((resolve) => setTimeout(resolve, 300));
        dispach(openPopup({ title: "Success", children: "Transaction deleted!" }));
    };

    const handleChangeTransaction = (transaction: TransactionWithCoinId) => {
        dispach(openPopup({ title: "Edit transaction", children: <ChangeTransactionPopup transaction={transaction} /> }));
    }

    return (
        <>
            <div className="grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 gap-1 max-md:gap-[1px] p-4 m-1 text-center items-center content-center text-[15px] max-md:text-[12px]">
                <div className="font-bold">Coin</div>
                <div className="font-bold max-[460px]:hidden">Action</div>
                <div className="font-bold">Quantity</div>
                <div className="font-bold">Price</div>
                <div className="font-bold max-[560px]:hidden">Date</div>
                <div className="font-bold">Change</div>
                <div className="font-bold">Delete</div>
            </div>

            {allTransactions && allTransactions.map(transaction => (
                <div key={transaction.id} className={`text-[15px] text-center max-md:text-[12px] grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 items-center content-center gap-1 max-md:gap-[1px] p-4 m-1 border-b border-gray-300 rounded-xl ${transaction.buyOrSell === "buy" ? "bg-green-200" : "bg-red-200"}`}>
                    <div className="flex gap-2 items-center mx-auto">
                        <img src={transaction.coinInfo.image} alt={transaction.coinInfo.name} className="w-8 h-8 max-[385px]:hidden" />
                        <span>{transaction.coinInfo.symbol}</span>
                    </div>
                    <div className="max-[460px]:hidden">{transaction.buyOrSell}</div>
                    <div>{transaction.quantity}</div>
                    <div>{transaction.price}</div>
                    <div className="max-[560px]:hidden">{transaction.date}</div>
                    <button onClick={() => handleChangeTransaction(transaction)} className="flex justify-center items-center transitioned hover:scale-105 cursor-pointer">
                        <img className="w-8 h-8" src={EditSVG} alt="edit" />
                    </button>
                    <button onClick={() => handleDeleteTransaction(transaction)} className="flex justify-center w-7 h-7 mx-auto items-center transitioned hover:scale-105 cursor-pointer rounded-[50%] bg-black ">
                        <img className="w-5 h-5 mx-auto" src={DeleteSVG} alt="delete" />
                    </button>
                </div>
            ))}
        </>
    );
}