import React, { type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from '../store';
export default function AppProviders({ children }: { children: ReactNode }) {
  return <Provider store={store}><PersistGate persistor={persistor} loading={<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>}>{children}</PersistGate></Provider>;
}
