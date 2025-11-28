import { useState } from "react";
import { useUpdateWalletMutation } from "./wallet.api";
import { useAppSelector } from "../../store";

export function UpdateWalletPopup() {
    const { selectedWalletId } = useAppSelector(state => state.selectedWallet);
    const selectedWallet = useAppSelector(state => state.selectedWallet.walletsList.find(wallet => wallet.id === selectedWalletId));

    const [walletName, setWalletName] = useState<string>(selectedWallet?.name || '');
    const [formError, setFormError] = useState<string>('');

    const [
        updateWallet,
        { isLoading, isError, error, isSuccess }
    ] = useUpdateWalletMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (walletName.trim().length <= 0 || walletName.trim().length > 20) {
            setFormError('Wallet name must be between 1 and 20 characters');
            return;
        } else {
            setFormError('');
        }

        try {
            await updateWallet({ id: selectedWalletId!, patch: { name: walletName.trim() } }).unwrap();
        } catch (err) {
            console.error('API Error:', err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
                <input
                    id="walletName"
                    type="text"
                    minLength={1}
                    maxLength={20}
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="Enter wallet name"
                    disabled={isLoading}
                    className="fontText w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 text-(--color-text)"
                    required
                />

            </div>

            {isLoading && <p className="text-blue-500">Loading...</p>}

            {formError && <p className="text-red-500">{formError}</p>}

            {isError && (
                <p className="text-red-500">
                    Error: {(error as any)?.data?.error || 'Unknown error'}
                </p>
            )}

            {isSuccess && (
                <p className="text-green-500">
                    Wallet updated successfully
                </p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="px-2 border-2 w-full border-(--color-text) rounded fontTitle p-2 bg-(--color-card) hover:scale-101 text-[--color-text] cursor-pointer transition-all text-lg"
            >
                {isLoading ? 'Loading...' : 'Update wallet'}
            </button>
        </form>
    );
}