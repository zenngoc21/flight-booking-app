import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type PreferencesState = { currency: 'VND' | 'USD'; preferredCabin: 'economy' | 'business'; notificationsEnabled: boolean };
const initialState: PreferencesState = { currency: 'VND', preferredCabin: 'economy', notificationsEnabled: true };
const preferencesSlice = createSlice({
  name: 'preferences', initialState,
  reducers: {
    setCurrency(state, action: PayloadAction<'VND' | 'USD'>) { state.currency = action.payload; },
    setPreferredCabin(state, action: PayloadAction<'economy' | 'business'>) { state.preferredCabin = action.payload; },
    setNotificationsEnabled(state, action: PayloadAction<boolean>) { state.notificationsEnabled = action.payload; },
  },
});
export const { setCurrency, setPreferredCabin, setNotificationsEnabled } = preferencesSlice.actions;
export default preferencesSlice.reducer;
