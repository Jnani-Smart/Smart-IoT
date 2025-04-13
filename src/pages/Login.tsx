import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home as SmartHome, AlertCircle, LogIn } from 'lucide-react';

const Login = () => {
  const { user, signInWithGoogle } = useAuth();
  const [showPopupWarning, setShowPopupWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        setShowPopupWarning(true);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <SmartHome className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Smart Home Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Control all your smart devices in one place
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap px-2">Sign in to continue</span>
            <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
          </div>

          {showPopupWarning && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 animate-fadeIn">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <p className="ml-3 text-sm text-yellow-700 dark:text-yellow-200">
                  Please enable popups for this site to sign in. 
                  <a 
                    href="https://support.google.com/chrome/answer/95472"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline hover:text-yellow-800 dark:hover:text-yellow-100"
                  >
                    Learn how to enable popups
                  </a>
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className={`w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Sign in with Google
              </>
            )}
          </button>
        </div>
        
        <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {new Date().getFullYear()} Smart Home Dashboard. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;