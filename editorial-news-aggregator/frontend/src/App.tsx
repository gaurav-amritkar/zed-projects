import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';

import { store } from './store';
import { theme } from './theme';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorFallback } from './components/ErrorFallback';
import { PWAPrompt } from './components/PWAPrompt';
import { LoadingProvider } from './context/LoadingContext';
import { LanguageProvider } from './context/LanguageContext';

import './App.css';
import './i18n/i18n';

const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Application error:', error, errorInfo);
        // Send error to monitoring service
        if (process.env.NODE_ENV === 'production') {
          // You can integrate Sentry or other error tracking here
        }
      }}
    >
      <HelmetProvider>
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <LoadingProvider>
              <LanguageProvider>
                <Router>
                  <div className="App">
                    <AppRoutes />
                    <PWAPrompt />
                    <Toaster
                      position="bottom-right"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: '#333',
                          color: '#fff',
                          borderRadius: '8px',
                        },
                        success: {
                          duration: 3000,
                          iconTheme: {
                            primary: '#4caf50',
                            secondary: '#fff',
                          },
                        },
                        error: {
                          duration: 5000,
                          iconTheme: {
                            primary: '#f44336',
                            secondary: '#fff',
                          },
                        },
                      }}
                    />
                  </div>
                </Router>
              </LanguageProvider>
            </LoadingProvider>
          </ThemeProvider>
        </Provider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
