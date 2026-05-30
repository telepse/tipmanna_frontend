import {
  configureStore,
  combineReducers,
  createListenerMiddleware,
} from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web

// Local imports
import authReducer, { clearCredentials } from "@/features/auth-slice";
import tipReducer from "@/features/tip-slice";
// import { PersistPartial } from "redux-persist/lib/persistReducer";

const authLogoutListener = createListenerMiddleware();
authLogoutListener.startListening({
  actionCreator: clearCredentials,
  effect: async (_action, listenerApi) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          "tipmanna_exit_sidechick_after_logout",
          "1"
        );
      } catch {
        /* ignore */
      }
    }
    const prev = listenerApi.getOriginalState() as {
      auth: {
        token: string | null;
        user: { role?: string } | null;
      };
    };
    const t = prev.auth.token?.trim();
    const role = prev.auth.user?.role?.toUpperCase();
    if (!t || (role !== "TIPPER" && role !== "HOST")) return;
    const api = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
    if (!api) return;
    try {
      await fetch(`${api}/me/side-chick/exit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
    } catch {
      /* ignore */
    }
  },
});

// Combine reducers if you have multiple slices
const rootReducer = combineReducers({
  auth: authReducer,
  tip: tipReducer,
});

// Redux Persist configuration
const persistConfig = {
  key: "root", // storage key name
  storage, // storage engine (localStorage)
  whitelist: ["auth", "tip"], // state slices to persist
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false, // important! redux-persist stores non-serializable values
    }).prepend(authLogoutListener.middleware),
});

export const persistor = persistStore(store);

// Type exports
// export type RootState = ReturnType<typeof store.getState> & PersistPartial;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
