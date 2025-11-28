import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
interface ScrollState {
    scrollY: number;
    currentSectionId: string | null;
    isSnapping: boolean;
    lastScrolledTime: number | null;
}

const initialState: ScrollState = {
    scrollY: 0,
    currentSectionId: null,
    isSnapping: false,
    lastScrolledTime: null,
};

const scrollSlice = createSlice({
    name: 'scroll',
    initialState,
    reducers: {
        setScrollY: (state, action: PayloadAction<number>) => {
            state.scrollY = action.payload;
        },
        setCurrentSectionId: (state, action: PayloadAction<string | null>) => {
            state.currentSectionId = action.payload;
        },
        setIsSnapping: (state, action: PayloadAction<boolean>) => {
            state.isSnapping = action.payload;
        },
        setLastScrolledTime: (state, action: PayloadAction<number>) => {
            state.lastScrolledTime = action.payload;
        },
    },
});

export const { setScrollY, setCurrentSectionId, setIsSnapping, setLastScrolledTime } = scrollSlice.actions;
export default scrollSlice.reducer;