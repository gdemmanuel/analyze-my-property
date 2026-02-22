
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import LandingPage from './src/pages/LandingPage';
import SampleAnalysis from './src/pages/SampleAnalysis';
import './src/index.css';
import { ReactQueryProvider } from './src/lib/queryClient';
import ErrorBoundary, { AppCrashFallback } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/ToastContext';
import { ToastContainer } from './components/ui/Toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary fallback={<AppCrashFallback />}>
      <ToastProvider>
        <ReactQueryProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/app" element={<App />} />
              <Route path="/sample" element={<SampleAnalysis />} />
            </Routes>
          </BrowserRouter>
        </ReactQueryProvider>
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
