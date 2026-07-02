import { useState, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { RotateCcw, Plus, CircleDot } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TasbeehSection() {
  const [count, setCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const controls = useAnimation();

  const handleIncrement = useCallback(async () => {
    setCount(prev => prev + 1);
    setShowConfirm(false);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }

    await controls.start({
      scale: [1, 1.08, 1],
      transition: { duration: 0.12, ease: "easeOut" }
    });
  }, [controls]);

  const handleReset = () => {
    setCount(0);
    setShowConfirm(false);
  };

  return (
    <div className="flex flex-col h-full py-6">
      <header className="flex justify-between items-center mb-12">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">المُسبّحة</h2>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">اذكر الله يذكرك</p>
        </div>
        
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {showConfirm && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleReset}
                className="bg-rose-500 text-white text-[10px] font-bold px-4 py-2 rounded-xl"
              >
                تأكيد التصفير؟
              </motion.button>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setShowConfirm(!showConfirm)} 
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border",
              showConfirm ? "bg-rose-500/20 border-rose-500/20 text-rose-500" : "bg-white/5 border-white/5 text-white/20 hover:text-white"
            )}
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center space-y-16">
        <div className="text-center space-y-3">
          <motion.p 
            key={count}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gold-accent font-arabic text-3xl"
          >
            سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
          </motion.p>
          <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-black">Subhan Allah</p>
        </div>

        <div className="relative group">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-[3rem] border border-white/5 scale-110 group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute inset-0 rounded-[4rem] border border-white/5 scale-125 group-hover:scale-150 transition-transform duration-1000 opacity-50" />
          
          <motion.button
            animate={controls}
            onClick={handleIncrement}
            className="w-64 h-64 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 shadow-2xl relative z-10 active:scale-90 transition-all duration-75"
          >
            <CircleDot className="absolute top-8 text-gold-accent/20" size={32} />
            <AnimatePresence mode="wait">
              <motion.span 
                key={count}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-7xl font-bold tracking-tighter"
              >
                {count}
              </motion.span>
            </AnimatePresence>
            <span className="text-[10px] uppercase font-black tracking-[0.4em] text-gold-accent/60 group-hover:text-gold-accent transition-colors">مَرّة</span>
            
            <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-gold-accent flex items-center justify-center text-islamic-dark shadow-lg">
              <Plus size={18} strokeWidth={3} />
            </div>
          </motion.button>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full px-4">
           <div className="glass-card p-6 flex flex-col items-center gap-1 border-white/5 bg-white/[0.02]">
              <span className="text-white/20 text-[8px] font-black uppercase tracking-widest">الدورَات</span>
              <span className="text-xl font-bold">{Math.floor(count / 33)}</span>
           </div>
           <div className="glass-card p-6 flex flex-col items-center gap-1 border-white/5 bg-white/[0.02]">
              <span className="text-white/20 text-[8px] font-black uppercase tracking-widest">المَجْموع</span>
              <span className="text-xl font-bold text-gold-accent">{count}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
