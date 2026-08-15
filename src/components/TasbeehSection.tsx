import { useState, useCallback, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { RotateCcw, Plus, CircleDot, ChevronDown, Vibrate, VibrateOff, CheckCircle2 } from 'lucide-react';
import { cn, normalizeArabicText } from '../lib/utils';

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

const CYCLE_OPTIONS = [33, 55, 100];

export default function TasbeehSection() {
  // Counters with persistent localStorage initialization
  const [currentCycleCount, setCurrentCycleCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tasbeeh_current_cycle_count');
      if (saved !== null) return parseInt(saved, 10);
    } catch {}
    return 0;
  });

  const [totalCount, setTotalCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tasbeeh_total_count');
      if (saved !== null) return parseInt(saved, 10);
    } catch {}
    return 0;
  });

  const [completedCycles, setCompletedCycles] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tasbeeh_completed_cycles');
      if (saved !== null) return parseInt(saved, 10);
    } catch {}
    return 0;
  });

  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tasbeeh_selected_index');
      if (saved !== null) return parseInt(saved, 10);
    } catch {}
    return 1; // Default to "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ"
  });

  // Config states
  const [cycleLimit, setCycleLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tasbeeh_cycle_limit');
      if (saved) return parseInt(saved, 10);
    } catch {}
    return 33; // Default to 33
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [justCompletedCycle, setJustCompletedCycle] = useState(false);
  
  // Vibration Enabled preference state
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tasbeeh_vibration_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const controls = useAnimation();

  // Save all tasbeeh counts and selected index to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('tasbeeh_current_cycle_count', String(currentCycleCount));
      localStorage.setItem('tasbeeh_total_count', String(totalCount));
      localStorage.setItem('tasbeeh_completed_cycles', String(completedCycles));
      localStorage.setItem('tasbeeh_selected_index', String(selectedIndex));
    } catch (e) {
      console.warn('Failed to save tasbeeh state to localStorage:', e);
    }
  }, [currentCycleCount, totalCount, completedCycles, selectedIndex]);

  // Toggle Vibration State
  const toggleVibration = () => {
    const nextState = !vibrationEnabled;
    setVibrationEnabled(nextState);
    try {
      localStorage.setItem('tasbeeh_vibration_enabled', String(nextState));
    } catch {}

    if (nextState && typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
  };

  // Change Cycle Limit (33, 55, 100)
  const handleSelectCycleLimit = (limit: number) => {
    setCycleLimit(limit);
    setCurrentCycleCount(0); // Reset center cycle counter when limit changes
    try {
      localStorage.setItem('tasbeeh_cycle_limit', String(limit));
    } catch {}
  };

  // Increment Tasbeeh
  const handleIncrement = useCallback(async () => {
    const nextTotal = totalCount + 1;
    const nextCycle = currentCycleCount + 1;

    setJustCompletedCycle(false);

    if (nextCycle >= cycleLimit) {
      // Completed 1 full cycle! Reset center counter to 0
      setCurrentCycleCount(0);
      setCompletedCycles(prev => prev + 1);
      setJustCompletedCycle(true);

      // Cycle completion vibration pulse
      if (vibrationEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([120, 60, 120]);
      }
    } else {
      setCurrentCycleCount(nextCycle);

      // Regular click vibration
      if (vibrationEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(35);
      }
    }

    setTotalCount(nextTotal);
    setShowConfirm(false);

    // Visual Haptic Micro-Shake & Scale Pulse Animation
    await controls.start({
      scale: [1, 1.08, 1],
      x: vibrationEnabled ? [0, -3, 3, -2, 2, 0] : [0],
      transition: { duration: 0.14, ease: "easeOut" }
    });
  }, [totalCount, currentCycleCount, cycleLimit, vibrationEnabled, controls]);

  const handleReset = () => {
    setCurrentCycleCount(0);
    setTotalCount(0);
    setCompletedCycles(0);
    setShowConfirm(false);
    setJustCompletedCycle(false);

    try {
      localStorage.removeItem('tasbeeh_current_cycle_count');
      localStorage.removeItem('tasbeeh_total_count');
      localStorage.removeItem('tasbeeh_completed_cycles');
    } catch {}

    if (vibrationEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(70);
    }
  };

  return (
    <div className="flex flex-col h-full py-6 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">المُسبّحة</h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider">اذكر الله يذكرك</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Vibration Toggle Button */}
          <button
            onClick={toggleVibration}
            role="button"
            aria-label={vibrationEnabled ? "إيقاف اهتزاز المسبحة" : "تفعيل اهتزاز المسبحة"}
            title={vibrationEnabled ? "الاهتزاز مفعل - انقر للإيقاف" : "الاهتزاز متوقف - انقر للتفعيل"}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border cursor-pointer",
              vibrationEnabled
                ? "bg-gold-accent/15 border-gold-accent/30 text-gold-accent shadow-md shadow-gold-accent/10"
                : "bg-white/5 border-white/5 text-white/30 hover:text-white/60"
            )}
          >
            {vibrationEnabled ? <Vibrate size={20} /> : <VibrateOff size={20} />}
          </button>

          {/* Reset Confirmation Button */}
          <AnimatePresence>
            {showConfirm && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleReset}
                role="button"
                aria-label="تأكيد تصفير عداد المسبحة"
                className="bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer active:scale-95"
              >
                تأكيد التصفير؟
              </motion.button>
            )}
          </AnimatePresence>

          {/* Reset Counter Button */}
          <button 
            onClick={() => setShowConfirm(!showConfirm)} 
            role="button"
            aria-label="البدء في تصفير عداد المسبحة"
            title="تصفير العداد"
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border cursor-pointer",
              showConfirm ? "bg-rose-500/20 border-rose-500/20 text-rose-500" : "bg-white/5 border-white/5 text-white/20 hover:text-white"
            )}
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* Cycle Limit Selector (33, 55, 100) */}
      <div className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/10 rounded-2xl">
        <span className="text-xs font-black text-white/70">نوع الدورة:</span>
        <div className="flex items-center gap-1.5">
          {CYCLE_OPTIONS.map((limit) => (
            <button
              key={limit}
              onClick={() => handleSelectCycleLimit(limit)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                cycleLimit === limit
                  ? "bg-gold-accent text-emerald-950 shadow-md scale-105"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
              )}
            >
              {limit} تسبيحة
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        {/* Dhikr Selector Dropdown */}
        <div className="relative w-full z-40">
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
              <span className="text-gold-accent quran-font text-lg font-bold">{normalizeArabicText(TASBIH_LIST[selectedIndex].arabic)}</span>
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
                  className="absolute top-full left-0 right-0 mt-2 bg-[#121212]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-40 max-h-64 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10"
                  dir="rtl"
                >
                  {TASBIH_LIST.map((tasbih, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (idx !== selectedIndex) {
                          setCurrentCycleCount(0);
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
                          "quran-font text-base font-bold transition-colors leading-relaxed",
                          idx === selectedIndex ? "text-gold-accent" : "text-white/80"
                        )}>
                          {normalizeArabicText(tasbih.arabic)}
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

        {/* Selected Dhikr Display Banner */}
        <div className="text-center space-y-2">
          <motion.p 
            key={selectedIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gold-accent quran-font text-2xl md:text-3xl leading-relaxed min-h-[3.5rem] flex items-center justify-center text-center font-bold"
            style={{ lineHeight: 1.8 }}
          >
            {normalizeArabicText(TASBIH_LIST[selectedIndex].arabic)}
          </motion.p>
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black max-w-xs mx-auto">
            {TASBIH_LIST[selectedIndex].transliteration}
          </p>
        </div>

        {/* Main Counter Card Box with Centered Large Count & Auto-Reset on Cycle Completion */}
        <div className="relative group w-full max-w-xs">
          {/* Outer Glowing Rings */}
          <div className="absolute inset-0 rounded-[3rem] border border-gold-accent/10 scale-105 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
          <div className="absolute inset-0 rounded-[3.5rem] border border-gold-accent/5 scale-115 opacity-40 pointer-events-none" />
          
          <motion.button
            animate={controls}
            onClick={handleIncrement}
            role="button"
            aria-label={`اضغط للتسبيح، عدد الدورة الحالية هو ${currentCycleCount} من ${cycleLimit}`}
            className="w-full h-64 rounded-[2.5rem] bg-gradient-to-br from-white/10 via-white/5 to-gold-accent/5 border border-white/15 flex flex-col items-center justify-center shadow-2xl relative z-10 active:scale-95 transition-all duration-100 cursor-pointer overflow-hidden group-hover:border-gold-accent/40"
          >
            <CircleDot className="absolute top-5 text-gold-accent/30 group-hover:text-gold-accent/50 transition-colors" size={24} />
            
            {/* Centered Large Count Display */}
            <div className="flex flex-col items-center justify-center text-center my-auto z-10 space-y-1">
              <span className="text-white/40 text-[11px] font-black tracking-widest uppercase">
                الدَّوْرَة الحَالِيَّة ({currentCycleCount} / {cycleLimit})
              </span>
              
              <AnimatePresence mode="wait">
                <motion.span 
                  key={currentCycleCount}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  className="text-7xl md:text-8xl font-black font-mono tracking-tighter text-gold-accent drop-shadow-[0_4px_12px_rgba(212,175,55,0.2)] select-none"
                >
                  {currentCycleCount}
                </motion.span>
              </AnimatePresence>

              {justCompletedCycle ? (
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> اكتملت الدورة!
                </span>
              ) : (
                <span className="text-xs uppercase font-black tracking-[0.4em] text-gold-accent/70 group-hover:text-gold-accent transition-colors">مَرّة</span>
              )}
            </div>
            
            <div className="absolute bottom-5 right-5 w-10 h-10 rounded-2xl bg-gold-accent flex items-center justify-center text-emerald-950 shadow-lg shadow-gold-accent/20 group-hover:scale-110 transition-transform">
              <Plus size={20} strokeWidth={3} />
            </div>
          </motion.button>
        </div>

        {/* Centered Bottom Summary Cards (Total Accumulator & Completed Cycles) */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
           <div className="glass-card p-5 flex flex-col items-center justify-center text-center gap-1 border-white/10 bg-white/[0.03] rounded-2xl">
              <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">الدَّوْرَات المُكْتَمِلَة ({cycleLimit})</span>
              <span className="text-2xl font-black text-white">{completedCycles}</span>
           </div>
           <div className="glass-card p-5 flex flex-col items-center justify-center text-center gap-1 border-gold-accent/20 bg-gold-accent/[0.04] rounded-2xl">
              <span className="text-gold-accent/70 text-[9px] font-black uppercase tracking-widest">المَجْمُوع الإِجْمَالِي</span>
              <span className="text-2xl font-black text-gold-accent">{totalCount}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
