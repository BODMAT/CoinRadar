import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface PopupActive {
    isOpen: boolean;
}
interface PopuInfo {
    title: string;
    children: React.ReactNode | null;
}

interface PopupState extends PopupActive, PopuInfo { };

const initialState: PopupState = { isOpen: false, title: '', children: null };

const popupSlice = createSlice({
    name: 'popup',
    initialState: initialState,
    reducers: {
        openPopup(state, action: PayloadAction<PopuInfo>) {
            state.isOpen = true;
            state.title = action.payload.title;
            state.children = action.payload.children;
        },
        closePopup(state) {
            state.isOpen = false;
            state.title = '';
            state.children = null;
        },
    }
})

export const { openPopup, closePopup } = popupSlice.actions;
export default popupSlice.reducer;