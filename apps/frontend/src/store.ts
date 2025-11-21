import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import scrollReducer from './modules/ScrollableBackground/scroll.slice';
import themeReducer from './modules/FixedFooter/theme.slice';
import { useDispatch, useSelector, useStore } from 'react-redux';
import popupSlice from './portals/popup.slice';
import allCryptoSlice from './modules/AllCrypto/all-crypto.slice';
import { authApi } from './modules/Auth/auth.api';
import { allCryptoApi } from './modules/AllCrypto/all-crypto.api';
import { walletApi } from './modules/Wallet/wallet.api';
import { transactionApi } from './modules/Transactions/transaction.api';
import authReducer from './modules/Auth/auth.slice';
import selectedWalletReducer from './modules/Wallet/selectedWallet.slice';

//! low coupling high cohesion (slicess + component)
export const store = configureStore({
    reducer: {
        // practice with redux + toolkit
        auth: authReducer,
        scroll: scrollReducer,
        theme: themeReducer,
        popup: popupSlice,
        selectedWallet: selectedWalletReducer,

        // practice trunks and async thunks
        allCrypto: allCryptoSlice,

        // practice RTK Query
        [authApi.reducerPath]: authApi.reducer,
        [allCryptoApi.reducerPath]: allCryptoApi.reducer,
        [walletApi.reducerPath]: walletApi.reducer,
        [transactionApi.reducerPath]: transactionApi.reducer
    },
    middleware: (getDefault) =>
        getDefault({
            serializableCheck: false,
        }).concat(authApi.middleware, allCryptoApi.middleware, walletApi.middleware, transactionApi.middleware),

});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppStore = useStore.withTypes<typeof store>();

export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    UnknownAction
>;