import React from 'react';
import { WifiOff, ShieldAlert } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      id="offline-strip"
      className="bg-rose-600/90 backdrop-blur-md text-white px-4 py-2 text-center text-xs font-bold leading-5 shadow-lg border-b border-rose-500 flex justify-center items-center gap-2 relative z-50 animate-bounce"
    >
      <WifiOff size={14} className="text-white animate-pulse" />
      <span>أنت غير متصل بالإنترنت حالياً. التلاوات الصوتية بحاجة لاتصال، ولكن يمكنك تصفح المصحف، الأذكار، القصص، والتسبيح بشكل كامل أوفلاين.</span>
    </div>
  );
}
