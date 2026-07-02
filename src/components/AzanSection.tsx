import React, { useEffect, useRef } from 'react';
import { Volume2, XCircle } from 'lucide-react';

interface AzanSectionProps {
  prayerName: string; // e.g. "أذان الفجر", "أذان الظهر"
  onClose: () => void;
}

// Module-level variables to persist audio state across mounts/unmounts
let globalAzanAudio: HTMLAudioElement | null = null;
let currentPlayingUrl: string | null = null;

// Export stop function so external navigation handlers (like the native back button) can cleanly stop playback
export const stopAzanAudio = () => {
  if (globalAzanAudio) {
    globalAzanAudio.pause();
    globalAzanAudio.src = '';
    globalAzanAudio = null;
    currentPlayingUrl = null;
  }
};

export default function AzanSection({ prayerName, onClose }: AzanSectionProps) {
  useEffect(() => {
    // Determine which file to play
    // Fajr uses /audio/fajr_azan.mp3, others use /audio/other_azan.mp3
    const isFajr = prayerName.includes('الفجر');
    const audioUrl = isFajr ? '/audio/fajr_azan.mp3' : '/audio/other_azan.mp3';

    // If the audio is already loaded/playing this exact track, resume or keep it playing!
    if (globalAzanAudio && currentPlayingUrl === audioUrl) {
      if (globalAzanAudio.paused) {
        console.log('Azan audio is paused, resuming from current time:', globalAzanAudio.currentTime);
        globalAzanAudio.play().catch(err => {
          console.error('Failed to resume Azan audio on mount/re-render:', err);
        });
      } else {
        console.log('Azan audio is already playing the correct track, ignoring restart.');
      }
      return;
    }

    // Otherwise, stop any previous audio
    if (globalAzanAudio) {
      globalAzanAudio.pause();
      globalAzanAudio.src = '';
    }

    // Start playing the new audio track from the beginning
    const audio = new Audio(audioUrl);
    audio.loop = false;
    audio.play().catch(err => {
      console.error('Failed to play Azan audio automatically inside WebView:', err);
    });

    globalAzanAudio = audio;
    currentPlayingUrl = audioUrl;

    return () => {
      // No automatic pause on unmount to prevent cuts during quick animation/re-render cycles.
      // Navigation changes (close button or back button) will explicitly trigger stopAzanAudio().
    };
  }, [prayerName]);

  const handleClose = () => {
    stopAzanAudio();
    onClose();
  };

  return (
    <div 
      dir="rtl"
      onClick={() => {
        if (globalAzanAudio && globalAzanAudio.paused) {
          console.log('User clicked the screen, resuming Azan audio...');
          globalAzanAudio.play().catch(err => {
            console.warn('Playback resume failed on click:', err);
          });
        }
      }}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between items-center p-8 select-none text-white cursor-pointer"
    >
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 w-96 h-96 bg-emerald-500/10 blur-[150px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-gold-accent/5 blur-[150px] rounded-full -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Top Section - Prayer Name */}
      <div className="w-full text-center mt-16 z-10 space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gold-accent/15 text-gold-accent rounded-full text-xs font-black uppercase tracking-widest border border-gold-accent/10">
          نداء الصلاة
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-wide">
          {prayerName}
        </h1>
        <p className="text-white/50 text-sm">حان الآن موعد الصلاة، يرجى الاستعداد لأداء الفريضة.</p>
      </div>

      {/* Middle Section - Visual Indicator */}
      <div className="flex flex-col items-center justify-center z-10 my-8">
        <div className="relative w-48 h-48 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center">
          {/* Animated soundwaves or rings */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-75" />
          <div className="absolute inset-4 rounded-full border border-gold-accent/20 animate-pulse" />
          
          {/* Central Icon */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold-accent/20 to-emerald-900/30 flex items-center justify-center text-gold-accent shadow-2xl">
            <Volume2 size={48} className="animate-bounce" />
          </div>
        </div>
      </div>

      {/* Bottom Section - Close Button */}
      <div className="w-full max-w-xs mb-12 z-10">
        <button
          onClick={handleClose}
          className="w-full py-4.5 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-lg shadow-xl shadow-rose-950/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <XCircle size={22} />
          إغلاق
        </button>
      </div>
    </div>
  );
}
