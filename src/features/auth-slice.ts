import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type HostUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "HOST";
  eventCode?: string;
  eventSlug?: string;
};

type TipperUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "TIPPER";
  anonymous?: boolean;
};

type VisitorUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "VISITOR";
};

export interface AuthState {
  user: HostUser | TipperUser | VisitorUser | null;
  token: string | null;
  isAuthenticated: boolean;
  requiresVerification: boolean;
  tag: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  requiresVerification: false,
  tag: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: HostUser | TipperUser | VisitorUser;
        token: string;
        requiresVerification?: boolean;
        tag?: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.requiresVerification = action.payload.requiresVerification ?? false;
      state.isAuthenticated = !state.requiresVerification;
      state.tag = action.payload.tag ?? null;
    },
    clearCredentials: state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.requiresVerification = false;
      state.tag = null;
    },
    updateTipper: (
      state,
      action: PayloadAction<Partial<HostUser | TipperUser | VisitorUser>>
    ) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { setCredentials, clearCredentials, updateTipper } =
  authSlice.actions;
export default authSlice.reducer;
