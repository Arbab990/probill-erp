import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1E293B',
            color: '#F1F5F9',
            border: '1px solid #334155',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#1E293B' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#1E293B' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);