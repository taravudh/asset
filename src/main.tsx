import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { initializeDatabase } from './lib/database';

// Initialize the database before rendering the app
initializeDatabase().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}).catch(error => {
  console.error('Failed to initialize database:', error);
  // Render error state
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Database Error</h1>
        <p className="text-gray-700 mb-4">
          There was a problem initializing the application database. This might be due to:
        </p>
        <ul className="list-disc pl-5 mb-4 text-gray-700">
          <li>Browser storage restrictions</li>
          <li>Private browsing mode</li>
          <li>Storage quota exceeded</li>
        </ul>
        <p className="text-gray-700 mb-4">
          Please try refreshing the page or using a different browser.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
});