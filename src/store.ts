import { configureStore } from '@reduxjs/toolkit';
import scrollReducer from './modules/Background/scroll.slice';
import themeReducer from './modules/FixedFooter/theme.slice';

//! low coupling high cohesion (slicess + component)
export const store = configureStore({
    reducer: {
        scroll: scrollReducer,
        theme: themeReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
