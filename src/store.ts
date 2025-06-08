import { configureStore } from '@reduxjs/toolkit';
import scrollReducer from './modules/Background/scroll.slice';
import themeReducer from './modules/FixedFooter/theme.slice';
import authReducer from "./modules/Auth/auth.slice";
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';

//! low coupling high cohesion (slicess + component)
export const store = configureStore({
    reducer: {
        scroll: scrollReducer,
        theme: themeReducer,
        auth: authReducer,
    },
});

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
