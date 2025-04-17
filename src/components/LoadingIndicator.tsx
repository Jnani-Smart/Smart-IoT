import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  fullScreen = false,
  text,
  className = '',
}) => {
  // Determine size classes
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  // If fullScreen, render a full-screen overlay
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
        <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <Loader2 className={`${sizeClasses[size]} text-blue-500 animate-spin mb-4`} />
          {text && <p className="text-gray-700 dark:text-gray-300 text-center">{text}</p>}
        </div>
      </div>
    );
  }

  // Otherwise, render an inline loader
  return (
    <div className={`flex items-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-blue-500 animate-spin ${text ? 'mr-3' : ''}`} />
      {text && <span className="text-gray-700 dark:text-gray-300">{text}</span>}
    </div>
  );
};

export default LoadingIndicator;
