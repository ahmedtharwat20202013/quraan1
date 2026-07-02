import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Sparkles, BookOpen } from 'lucide-react';

interface DidYouKnowModalProps {
  isOpen: boolean;
  factText: string;
  onClose: () => void;
}

export default function DidYouKnowModal({ isOpen, factText, onClose }: DidYouKnowModalProps) {
  const [timeLeft, setTimeLeft] = useState<number>(60);

  // Reset timer whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(60);
    }
  }, [isOpen, factText]);

  // Handle the 60 seconds countdown
  useEffect(() => {
    if (!isOpen) return;

    if (timeLeft <= 0) {
      onClose();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, timeLeft, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md max-w-md mx-auto"
          />

          {/* Premium Islamic Glass Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className="relative w-full max-w-sm bg-[#121212]/90 border border-white/10 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 text-center"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Close Icon Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Glowing Icon Header */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <BookOpen size={28} />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-1 -right-1 text-emerald-400"
                >
                  <Sparkles size={16} />
                </motion.div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-amber-400 font-black text-xs uppercase tracking-[0.3em] mb-3">
              إضاءة معرفية • هل تعلم؟
            </h3>

            {/* Fact Content */}
            <div className="min-h-[120px] flex items-center justify-center px-2 py-4">
              <p className="text-white text-lg font-bold leading-relaxed text-center">
                {factText}
              </p>
            </div>

            {/* Countdown Progress Ring/Bar */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center text-[10px] text-white/40 font-black tracking-wider px-1">
                <span>تغلق تلقائياً خلال {timeLeft} ث</span>
                <span>{Math.round((timeLeft / 60) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 60) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full"
                />
              </div>
            </div>

            {/* Manual Close Button */}
            <button
              onClick={onClose}
              className="w-full py-4 mt-8 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-sm tracking-widest shadow-[0_10px_25px_rgba(245,158,11,0.3)] transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <span>إغلاق الرسالة</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
