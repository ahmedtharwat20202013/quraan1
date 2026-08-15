import { useState, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { RotateCcw, Plus, CircleDot, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const TASBIH_LIST = [
  {
    arabic: "سُبْحَانَ اللَّهِ",
    transliteration: "Subhan Allah"
  },
  {
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    transliteration: "Subhan Allahi wa bihamdih"
  },
  {
    arabic: "سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ",
    transliteration: "Subhan Allahil 'Adheem wa bihamdih"
  },
  {
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
    transliteration: "Subhan Allahi wa bihamdihi, Subhan Allahil 'Adheem"
  },
  {
    arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    transliteration: "La hawla wa la quwwata illa billah"
  },
  {
    arabic: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ",
    transliteration: "Subhan Allahi walhamdu lillahi wa la ilaha illallahu wallahu akbar"
  },
  {
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul mulku wa lahul hamdu wa huwa 'ala kulli shay'in qadir"
  },
  {
    arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullaha wa atubu ilayh"
  },
  {
    arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    transliteration: "Allahumma salli wa sallim 'ala nabiyyina Muhammad"
  },
  {
    arabic: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ",
    transliteration: "Subhan Allahi walhamdu lillah"
  }
];

export default function TasbeehSection() {
  const [count, setCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(1); // Default to "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ"
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const controls = useAnimation();

  const handleIncrement = useCallback(async () => {
    const nextCount = count + 1;
    setCount(nextCount);
    setShowConfirm(false);
    
    if ('vibrate' in navigator) {
      if (nextCount % 33 === 0) {
        navigator.vibrate([100, 50, 100]); // Special double vibration for milestone
      } else {
        navigator.vibrate(40); // Normal click vibration
      }
    }

    await controls.start({
      scale: [1, 1.08, 1],
      transition: { duration: 0.12, ease: "easeOut" }
    });
  }, [count, controls]);

  const handleReset = () => {
    setCount(0);
    setShowConfirm(false);
    if ('vibrate' in navigator) {
      navigator.vibrate(70);
    }
  };

  return (
    <div className="flex flex-col h-full py-6">
      <header className="flex justify-between items-center mb-12">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">المُسبّحة</h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">اذكر الله يذكرك</p>
        </div>
        
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {showConfirm && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleReset}
                role="button"
                aria-label="تأكيد تصفير عداد المسبحة"
                className="bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                تأكيد التصفير؟
              </motion.button>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setShowConfirm(!showConfirm)} 
            role="button"
            aria-label="البدء في تصفير عداد المسبحة"
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border",
              showConfirm ? "bg-rose-500/20 border-rose-500/20 text-rose-500" : "bg-white/5 border-white/5 text-white/20 hover:text-white"
            )}
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        {/* Dropdown Selector */}
        <div className="relative w-full px-4 z-30">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            role="combobox"
            aria-expanded={isDropdownOpen}
            aria-label="اختر الذكر الحالي"
            className="w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-gold-accent/20 transition-all rounded-2xl p-4 flex items-center justify-between text-right cursor-pointer"
            dir="rtl"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-white/30 text-[10px] uppercase font-black tracking-widest text-right">الذِّكْرُ الحَالِي</span>
              <span className="text-gold-accent font-arabic text-base font-bold">{TASBIH_LIST[selectedIndex].arabic}</span>
            </div>
            <ChevronDown className={cn("text-white/40 transition-transform duration-300", isDropdownOpen && "rotate-180")} size={18} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-4 right-4 mt-2 bg-[#121212]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-40 max-h-64 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10"
                  dir="rtl"
                >
                  {TASBIH_LIST.map((tasbih, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (idx !== selectedIndex) {
                          setCount(0);
                          setSelectedIndex(idx);
                        }
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-right p-4 transition-all hover:bg-white/5 flex items-center justify-between gap-4 cursor-pointer",
                        idx === selectedIndex ? "bg-gold-accent/[0.03]" : ""
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "font-arabic text-sm font-bold transition-colors",
                          idx === selectedIndex ? "text-gold-accent" : "text-white/80"
                        )}>
                          {tasbih.arabic}
                        </span>
                        <span className="text-white/30 text-[9px] uppercase font-black tracking-wider">
                          {tasbih.transliteration}
                        </span>
                      </div>
                      {idx === selectedIndex && (
                        <div className="w-2 h-2 rounded-full bg-gold-accent shadow-[0_0_8px_rgba(212,163,89,0.5)] shrink-0" />
                      )}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center space-y-3 px-4">
          <motion.p 
            key={`${selectedIndex}-${count}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gold-accent font-arabic text-3xl leading-relaxed min-h-[4rem] flex items-center justify-center"
          >
            {TASBIH_LIST[selectedIndex].arabic}
          </motion.p>
          <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-black max-w-xs mx-auto">
            {TASBIH_LIST[selectedIndex].transliteration}
          </p>
        </div>

        <div className="relative group">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-[3rem] border border-white/5 scale-110 group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute inset-0 rounded-[4rem] border border-white/5 scale-125 group-hover:scale-150 transition-transform duration-1000 opacity-50" />
          
          <motion.button
            animate={controls}
            onClick={handleIncrement}
            role="button"
            aria-label={`اضغط للتسبيح، العداد الحالي هو ${count}`}
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
