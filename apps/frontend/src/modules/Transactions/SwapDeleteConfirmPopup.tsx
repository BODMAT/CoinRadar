import { useAppDispatch } from "../../store";
import { closePopup, openPopup } from "../../portals/popup.slice";
import { useDeleteTransactionMutation } from "./transaction.api";
import { extractApiErrorMessage } from "../../utils/functions";

export function SwapDeleteConfirmPopup({
  walletId,
  transactionId,
}: {
  walletId: string;
  transactionId: string;
}) {
  const dispatch = useAppDispatch();
  const [deleteTransaction, { isLoading }] = useDeleteTransactionMutation();

  const handleConfirm = async () => {
    try {
      await deleteTransaction({ walletId, transactionId }).unwrap();
      dispatch(closePopup());
      setTimeout(() => {
        dispatch(
          openPopup({ title: "Success", children: "Transaction deleted!" }),
        );
      }, 300);
    } catch (error: unknown) {
      dispatch(closePopup());
      const message = extractApiErrorMessage(error);
      setTimeout(() => {
        dispatch(openPopup({ title: "Failure", children: message }));
      }, 300);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      <p className="text-sm text-center leading-relaxed">
        This transaction is part of a swap. Deleting it will also remove the
        linked transaction.{" "}
        <span className="font-bold">Both will be permanently deleted.</span>
      </p>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => dispatch(closePopup())}
          disabled={isLoading}
          className="px-5 py-2 rounded border border-gray-400 text-sm disabled:opacity-50 cursor-pointer hover:bg-gray-500/20 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="px-5 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50 cursor-pointer hover:bg-red-700 transition-colors"
        >
          {isLoading ? "Deleting..." : "Confirm"}
        </button>
      </div>
    </div>
  );
}
