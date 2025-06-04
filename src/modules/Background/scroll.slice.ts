import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
interface ScrollState {
    scrollY: number;
}

const initialState: ScrollState = {
    scrollY: 0,
};

const scrollSlice = createSlice({
    name: 'scroll',
    initialState,
    reducers: {
        setScrollY: (state, action: PayloadAction<number>) => {
            state.scrollY = action.payload;
        },
    },
});

export const { setScrollY } = scrollSlice.actions;
export default scrollSlice.reducer;