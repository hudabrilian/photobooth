import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppStateContext';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { preloadFrames } from './utils/canvas';
import './styles/globals.css';

preloadFrames();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AppProvider>
  </StrictMode>
);
