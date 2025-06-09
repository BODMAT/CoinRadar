import { configureStore } from '@reduxjs/toolkit';
import scrollReducer from './modules/ScrollableBackground/scroll.slice';
import themeReducer from './modules/FixedFooter/theme.slice';
import authReducer from "./modules/Auth/auth.slice";
import { useDispatch, useSelector, useStore } from 'react-redux';
import popupSlice from './portals/popup.slice';

//! low coupling high cohesion (slicess + component)
export const store = configureStore({
    reducer: {
        scroll: scrollReducer,
        theme: themeReducer,
        auth: authReducer,
        popup: popupSlice,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppStore = useStore.withTypes<typeof store>();