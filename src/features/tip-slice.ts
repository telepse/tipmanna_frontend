// redux/slices/tipSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TipState {
  selectedTips: string[];
  paymentCompleted: boolean;
}

const initialState: TipState = {
  selectedTips: [],
  paymentCompleted: false,
};

const tipSlice = createSlice({
  name: "tip",
  initialState,
  reducers: {
    setSelectedTips(state, action: PayloadAction<string[]>) {
      state.selectedTips = action.payload;
    },
    markPaymentCompleted(state, action: PayloadAction<boolean>) {
      state.paymentCompleted = action.payload;
    },
    resetTipState(state) {
      state.selectedTips = [];
      state.paymentCompleted = false;
    },
  },
});

export const { setSelectedTips, markPaymentCompleted, resetTipState } =
  tipSlice.actions;

export default tipSlice.reducer;
