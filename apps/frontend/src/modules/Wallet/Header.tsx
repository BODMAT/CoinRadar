import { openPopup } from "../../portals/popup.slice";
import { useAppDispatch, useAppSelector } from "../../store";
import { AddWalletPopup } from "./AddWalletPopup";
import { WalletSelector } from "./WalletSelector";

import { useGetWalletsQuery } from "../Wallet/wallet.api";
import { UpdateWalletPopup } from "./UpdateWalletPopup";
import { DeleteWalletPopup } from "./DeleteWalletPopup";

export function Header() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.auth.user);
    const selectedWallet = useAppSelector(state => state.selectedWallet);

    const { isFetching } = useGetWalletsQuery(undefined, {
        skip: !user,
    });

    const handleAddWallet = () => {
        if (!user) {
            dispatch(openPopup({ title: "Failure", children: "You need to be logged in to add a wallet" }));
            return
        } else {
            dispatch(openPopup({ title: "Add wallet", children: <AddWalletPopup /> }));
            return
        }
    }
    const handleDeleteCurrentWallet = () => {
        if (!user) {
            dispatch(openPopup({ title: "Failure", children: "You need to be logged in to delete a wallet" }));
            return
        } else {
            if (!selectedWallet) {
                dispatch(openPopup({ title: "Delete wallet", children: "You need to select a wallet to delete" }));
            } else {
                dispatch(openPopup({ title: "Delete wallet", children: <DeleteWalletPopup /> }));
            }
        }
    }

    const handleUpdateCurrentWallet = () => {
        if (!user) {
            dispatch(openPopup({ title: "Failure", children: "You need to be logged in to update a wallet" }));
            return
        } else {
            if (!selectedWallet) {
                dispatch(openPopup({ title: "Update wallet", children: "You need to select a wallet to update" }));
            } else {
                dispatch(openPopup({ title: "Update wallet", children: <UpdateWalletPopup /> }));
            }
        }
    }
    return (
        <div className="flex justify-between max-md:flex-col items-center gap-7 bg-(image:--color-background) rounded-2xl p-3">
            <div className="fontTitle text-2xl">
                {!user && <h1 className="fontTitle text-2xl">Please log in to see your wallets</h1>}

                {user && (
                    isFetching ?
                        <h1 className="fontTitle text-2xl">Loading wallets...</h1> :
                        <WalletSelector />
                )}
            </div>
            <div className="flex gap-5 max-[420px]:flex-col">
                <button disabled={!user} onClick={handleAddWallet} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-(--color-card) cursor-pointer rounded transitioned hover:scale-105 text-[--color-text] border-[--color-text] border-2 disabled:cursor-not-allowed">Add new wallet</button>
                <button disabled={!user} onClick={handleUpdateCurrentWallet} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-(--color-card) cursor-pointer rounded transitioned hover:scale-105 text-[--color-text] border-[--color-text] border-2 disabled:cursor-not-allowed">Rename current wallet</button>
                <button disabled={!user} onClick={handleDeleteCurrentWallet} className="max-[500px]:w-full flex justify-center items-center text-center px-9 py-2 bg-(--color-card) cursor-pointer rounded transitioned hover:scale-105 text-[--color-text] border-[--color-text] border-2 disabled:cursor-not-allowed">Delete current wallet</button>
            </div>
        </div>
    )
}