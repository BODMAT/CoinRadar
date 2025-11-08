import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import scrollReducer from './modules/ScrollableBackground/scroll.slice';
import themeReducer from './modules/FixedFooter/theme.slice';
import { useDispatch, useSelector, useStore } from 'react-redux';
import popupSlice from './portals/popup.slice';
import allCryptoSlice from './modules/AllCrypto/all-crypto.slice';
import { authApi } from './modules/Auth/auth.api';
import { allCryptoApi } from './modules/AllCrypto/all-crypto.api';
import { walletApi } from './modules/Wallet/wallet.api';
//! low coupling high cohesion (slicess + component)
export const store = configureStore({
    reducer: {
        // practice with redux + toolkit
        scroll: scrollReducer,
        theme: themeReducer,
        popup: popupSlice,

        // practice trunks and async thunks
        allCrypto: allCryptoSlice,

        // practice RTK Query
        [authApi.reducerPath]: authApi.reducer,
        [allCryptoApi.reducerPath]: allCryptoApi.reducer,
        [walletApi.reducerPath]: walletApi.reducer
    },
    middleware: (getDefault) =>
        getDefault({
            serializableCheck: false,
        }).concat(authApi.middleware, allCryptoApi.middleware, walletApi.middleware),

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