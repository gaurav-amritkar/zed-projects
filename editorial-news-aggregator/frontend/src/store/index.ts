import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import reducers
import articlesReducer from './slices/articlesSlice';
import sourcesReducer from './slices/sourcesSlice';
import languagesReducer from './slices/languagesSlice';
import uiReducer from './slices/uiSlice';
import userReducer from './slices/userSlice';
import searchReducer from './slices/searchSlice';
import bookmarksReducer from './slices/bookmarksSlice';

// Root reducer
const rootReducer = combineReducers({
  articles: articlesReducer,
  sources: sourcesReducer,
  languages: languagesReducer,
  ui: uiReducer,
  user: userReducer,
  search: searchReducer,
  bookmarks: bookmarksReducer,
});

// Persist configuration
const persistConfig = {
  key: 'editorial-news-aggregator',
  version: 1,
  storage,
  whitelist: ['user', 'languages', 'bookmarks', 'ui'], // Only persist these reducers
  blacklist: ['articles', 'sources', 'search'], // Don't persist these (they should be fresh)
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat([
      // Add custom middleware here if needed
    ]),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Infer types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for use throughout the app
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Action creators for common operations
export const clearPersistedState = () => {
  persistor.purge();
};

export const rehydrateState = () => {
  persistor.persist();
};

export default store;
