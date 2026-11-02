import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import preferencesReducer from './preferencesSlice';

// Persist only non-sensitive UI preferences.
// Auth tokens are managed separately in authStorage.

const createNoopStorage = () => ({
  getItem: async (_key: string) => null,
  setItem: async (_key: string, value: string) => value,
  removeItem: async (_key: string) => {},
});

const webStorage =
  typeof window !== 'undefined'
    ? {
        getItem: async (key: string) => window.localStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          window.localStorage.setItem(key, value);
        },
        removeItem: async (key: string) => {
          window.localStorage.removeItem(key);
        },
      }
    : createNoopStorage();

const nativeStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

const storage = Platform.OS === 'web' ? webStorage : nativeStorage;

const rootReducer = combineReducers({
  preferences: preferencesReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'flight-app',
    version: 1,
    storage,
  },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/REGISTER',
          'persist/FLUSH',
          'persist/PAUSE',
          'persist/PURGE',
        ],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;