import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from "../../store";
import { useDeleteWalletMutation } from "./wallet.api";
import { closePopup } from '../../portals/popup.slice';

export function DeleteWalletPopup() {
    const dispatch = useAppDispatch();
    const { selectedWalletId } = useAppSelector(state => state.selectedWallet);
    const selectedWallet = useAppSelector(state =>
        state.selectedWallet.walletsList.find(wallet => wallet.id === selectedWalletId)
    );

    const [
        deleteWallet,
        { isLoading, isError, error, isSuccess }
    ] = useDeleteWalletMutation();

    const handleDelete = async () => {
        if (!selectedWalletId || isLoading) return;

        try {
            await deleteWallet(selectedWalletId).unwrap();

        } catch (err) {
            console.error('API Error during deletion:', err);
        }
    };

    useEffect(() => {
        if (isSuccess) {
            dispatch(closePopup());
        }
    }, [isSuccess, dispatch]);


    if (!selectedWalletId || !selectedWallet) {
        return (
            <div className="p-4 text-center">
                <p className="text-xl text-red-500">Wallet not found</p>
            </div>
        );
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleDelete(); }} className="p-4 space-y-6">
            <p className="text-lg text-[--color-text] text-center">
                Are you absolutely sure that you want to remove the wallet {selectedWallet.name}?
                This action cannot be canceled.
            </p>

            {isLoading && <p className="text-blue-500 text-center">Deleting...</p>}

            {isError && (
                <p className="text-red-500">
                    Error: {(error as any)?.data?.error || 'Unknown error'}
                </p>
            )}

            <div className="flex justify-evenly space-x-3">
                <button
                    type="button"
                    onClick={() => dispatch(closePopup())}
                    disabled={isLoading}
                    className="cursor-pointer py-2 px-4 rounded-md text-sm font-medium border border-gray-400 text-[--color-text] hover:bg-gray-200 transitioned disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="cursor-pointer py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transitioned disabled:bg-gray-400"
                >
                    {isLoading ? 'Deleting...' : 'Submit Delete'}
                </button>
            </div>
        </form>
    );
}