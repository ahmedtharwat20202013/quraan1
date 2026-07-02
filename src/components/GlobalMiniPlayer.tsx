import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, Disc } from 'lucide-react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { cn } from '../lib/utils';

export default function GlobalMiniPlayer() {
  const audioPlayer = useAudioPlayer();
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsListening(!!(window as any).isListeningTab);
    };
    check();
    const interval = setInterval(check, 300);
    return () => clearInterval(interval);
  }, []);

  if (!audioPlayer.audioUrl || isListening) return null;

  // Format second counts to MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Convert to percentage
  const progressPercent = audioPlayer.duration > 0 
    ? (audioPlayer.currentTime / audioPlayer.duration) * 100 
    : 0;

  return (
    <div className="fixed bottom-[114px] left-8 right-8 max-w-sm mx-auto z-40">
      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="bg-emerald-950/90 backdrop-blur-3xl border border-white/10 rounded-[1.8rem] p-3.5 shadow-[0_20px_45px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col gap-2.5"
      >
        <div className="absolute inset-0 bg-gold-accent/5 pointer-events-none" />
        
        {/* Micro progress line at the top */}
        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden absolute top-0 left-0 right-0">
          <div 
            className="h-full bg-gradient-to-r from-gold-bright to-gold-accent transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Content row */}
        <div className="flex items-center gap-3 mt-1">
          {/* Spinning disc icon */}
          <motion.div 
            animate={audioPlayer.isPlaying ? { rotate: 360 } : {}}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            className={cn(
              "w-9 h-9 rounded-full bg-gradient-to-br from-gold-bright to-gold-accent flex items-center justify-center text-emerald-950 shadow-md shrink-0 border border-emerald-900/50",
              audioPlayer.isBuffering ? "animate-pulse" : ""
            )}
          >
            <Disc size={16} />
          </motion.div>

          {/* Details */}
          <div className="text-right flex-1 min-w-0">
            <h5 className="text-white font-black text-xs truncate leading-none mb-1">
              سورة {audioPlayer.currentSurah?.name || `رقم ${audioPlayer.currentSurahNumber}`}
            </h5>
            <p className="text-[9px] text-white/50 truncate font-bold leading-none">
              {audioPlayer.currentReciterName || "القارئ"} • {audioPlayer.currentMoshafName?.replace("المصحف المرتل - ", "") || "رواية حفص"}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Play/Pause */}
            <button
              onClick={() => audioPlayer.togglePlay()}
              className="w-8 h-8 bg-white hover:bg-gold-accent text-emerald-950 transition-all rounded-full flex items-center justify-center shadow-md active:scale-95"
            >
              {audioPlayer.isPlaying ? (
                <Pause size={14} fill="currentColor" strokeWidth={0} />
              ) : (
                <Play size={14} fill="currentColor" strokeWidth={0} className="translate-x-[0.5px]" />
              )}
            </button>

            {/* Stop / Close */}
            <button 
              onClick={() => audioPlayer.stop()}
              className="w-8 h-8 bg-white/5 hover:bg-white/10 text-white/40 hover:text-rose-400 rounded-full flex items-center justify-center transition-all"
              title="إغلاق وقفل الصوت"
            >
              <Square size={10} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Error alert bar */}
        {audioPlayer.error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[9px] font-bold p-2 rounded-xl text-center leading-relaxed">
            {audioPlayer.error}
          </div>
        )}
      </motion.div>
    </div>
  );
}
