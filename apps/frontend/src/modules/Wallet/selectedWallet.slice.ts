import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WalletListItem } from './wallet.schema';

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
        }
    },
});

export const { setWalletsList, selectWallet, clearWalletState } = selectedWalletSlice.actions;
export default selectedWalletSlice.reducer;