import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    console.log('Removing notification with id:', id); // Debug log
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback((type: NotificationType, message: string, duration = 5000) => {
    const id = Date.now().toString();
    console.log('Adding notification with id:', id); // Debug log
    setNotifications(prev => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md">
      {notifications.map(notification => (
        <NotificationToast 
          key={notification.id} 
          notification={notification} 
          onClose={() => {
            console.log('Toast close button clicked for id:', notification.id); // Debug log
            removeNotification(notification.id);
          }} 
        />
      ))}
    </div>
  );
};

const NotificationToast: React.FC<{ 
  notification: Notification; 
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const { type, message } = notification;

  // Handle automatic closing
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, onClose]);

  // Icon based on notification type
  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle
  }[type];

  // Color scheme based on notification type
  const colorScheme = {
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
  }[type];

  return (
    <div 
      className={`flex items-start p-4 rounded-lg border shadow-lg ${colorScheme} animate-slide-in`}
      style={{ 
        animationDuration: '300ms',
        transform: 'translateX(0)',
        opacity: 1
      }}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mr-3" />
      <div className="flex-1 mr-2">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Close button clicked'); // Debug log
          onClose();
        }} 
        className="flex-shrink-0 ml-auto bg-transparent focus:outline-none hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default NotificationProvider;
