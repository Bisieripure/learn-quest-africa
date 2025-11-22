
import { useState, useEffect } from 'react';
import { syncOfflineUpdates, cleanupFailedOperations } from '../utils/offlineSync';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = async () => {
        setIsOffline(false);
        await cleanupFailedOperations();
        await syncOfflineUpdates();
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-5 right-5 bg-red-500 text-white p-3 rounded-lg shadow-lg">
      You are offline. Some features may not be available.
    </div>
  );
};

export default OfflineIndicator;
