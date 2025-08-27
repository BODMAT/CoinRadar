import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import scrollReducer from './modules/ScrollableBackground/scroll.slice';
import themeReducer from './modules/FixedFooter/theme.slice';
import authReducer from "./modules/Auth/auth.slice";
import { useDispatch, useSelector, useStore } from 'react-redux';
import popupSlice from './portals/popup.slice';
import allCryptoSlice from './modules/AllCrypto/all-crypto.slice';

//! low coupling high cohesion (slicess + component)
export const store = configureStore({
    reducer: {
        // practice with redux + toolkit
        scroll: scrollReducer,
        theme: themeReducer,
        popup: popupSlice,

        // practice trunks and async thunks
        auth: authReducer,
        allCrypto: allCryptoSlice,

        // practice RTK Query

    },
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