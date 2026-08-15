import React, { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when online status changes, so it shows again next time they go offline
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (isOnline || dismissed) return null;

  return (
    <div 
      id="offline-strip"
      className="bg-rose-600/90 backdrop-blur-md text-white px-4 py-2.5 text-center text-xs font-bold leading-5 shadow-lg border-b border-rose-500 flex justify-between items-center gap-2 relative z-50 transition-all duration-300"
    >
      <div className="flex items-center gap-2 justify-center flex-1">
        <WifiOff size={14} className="text-white animate-pulse" />
        <span>أنت غير متصل بالإنترنت. يمكنك تصفح المصحف، الأذكار، والتسبيح بشكل كامل أوفلاين.</span>
      </div>
      <button 
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
        title="إغلاق"
      >
        <X size={14} />
      </button>
    </div>
  );
}
