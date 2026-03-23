import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Wallet, WalletListItem } from './wallet.schema';

interface SelectedWalletState {
    walletsList: WalletListItem[];
    selectedWalletId: string | null;
}

const initialState: SelectedWalletState = {
    walletsList: [],
    selectedWalletId: null,
};

const selectedWalletSlice = createSlice({
    name: 'selectedWallet',
    initialState,
    reducers: {
        setWalletsList(state, action: PayloadAction<WalletListItem[]>) {
            state.walletsList = action.payload;
            const currentStillExists = action.payload.find(w => w.id === state.selectedWalletId);

            if (!state.selectedWalletId || !currentStillExists) {
                state.selectedWalletId = action.payload.length > 0 ? action.payload[0].id : null;
            }
        },
        selectWallet(state, action: PayloadAction<string>) {
            state.selectedWalletId = action.payload;
        },

        clearWalletState(state) {
            state.walletsList = [];
            state.selectedWalletId = null;
        },
        addWallet(state, action: PayloadAction<Wallet>) {
            state.walletsList.push(action.payload);
            state.selectedWalletId = action.payload.id;
        },
        removeWallet(state, action: PayloadAction<string>) {
            state.walletsList = state.walletsList.filter(w => w.id !== action.payload);
            if (state.selectedWalletId === action.payload) {
                state.selectedWalletId = state.walletsList[0]?.id ?? null;
            }
        },
        updateWalletInList(state, action: PayloadAction<Wallet>) {
            const idx = state.walletsList.findIndex(w => w.id === action.payload.id);
            if (idx !== -1) state.walletsList[idx] = action.payload;
        },
    },
});

export const { setWalletsList, selectWallet, clearWalletState, addWallet, removeWallet, updateWalletInList } = selectedWalletSlice.actions;
export default selectedWalletSlice.reducer;