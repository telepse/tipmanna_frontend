import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web

// Local imports
import authReducer from "@/features/auth-slice";
import tipReducer from "@/features/tip-slice";
// import { PersistPartial } from "redux-persist/lib/persistReducer";

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
    }),
});

export const persistor = persistStore(store);

// Type exports
// export type RootState = ReturnType<typeof store.getState> & PersistPartial;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
