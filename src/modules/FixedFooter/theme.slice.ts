import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type Theme = 'light' | 'dark';
interface ThemeState {
    theme: Theme;
}
const initialState: ThemeState = {
    theme: (localStorage.getItem('theme-storage-caretrack') as Theme) || 'light',
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme(state) {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme-storage-caretrack', state.theme);
        },
        setTheme(state, action: PayloadAction<Theme>) {
            state.theme = action.payload;
            localStorage.setItem('theme-storage-caretrack', state.theme);
        },
    },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
