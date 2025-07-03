import React from 'react';
import { Link } from 'react-router-dom';
import { ZapOff as MapOff } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <MapOff className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
        
        <p className="text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
          
          <Link
            to="/login"
            className="block w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-gray-500">
        Asset Survey Mapping Application &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
};

export default NotFoundPage;