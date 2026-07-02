import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, ChevronLeft } from 'lucide-react';
import { SURAHS } from '../constants';
import { Surah } from '../types';
import { cn } from '../lib/utils';

interface QuranSectionProps {
  onSurahClick: (surah: Surah) => void;
}

export default function QuranSection({ onSurahClick }: QuranSectionProps) {
  const [search, setSearch] = useState("");

  // Scroll to top on list/view transition
  useEffect(() => {
    const doScroll = () => {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTo({ top: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, behavior: 'instant' });
    };

    doScroll();
    const timer = setTimeout(doScroll, 80);
    return () => clearTimeout(timer);
  }, [search]);
  
  const filteredSurahs = SURAHS.filter(s => 
    s.name.includes(search) || 
    s.englishName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <header className="space-y-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2">فهرس السور</h2>
          <p className="text-white/40 text-xs font-bold">اختر سورة لتبدأ القراءة بتمعن وسكينة مع التمرير السهل</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="ابحث عن سورة..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-6 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right"
          />
        </div>
      </header>

      <div className="space-y-4">
        {filteredSurahs.map((surah) => (
          <motion.div
            key={surah.number}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSurahClick(surah)}
            className="glass-card hover:bg-white/10 transition-all p-5 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-5">
               <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center relative group-hover:bg-gold-accent/10 transition-colors">
                  <span className="text-xs font-bold opacity-30 group-hover:opacity-100 group-hover:text-gold-accent transition-all">{surah.number}</span>
                  <div className="absolute inset-0 border border-white/5 group-hover:border-gold-accent/20 rounded-2xl" />
               </div>
               <div className="text-right">
                  <h3 className="font-bold text-lg tracking-tight group-hover:text-gold-accent transition-colors">{surah.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                       "text-[10px] px-2 py-0.5 rounded-full font-bold",
                       surah.revelationType === 'مكية' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {surah.revelationType}
                    </span>
                    <span className="text-[10px] text-white/20 font-bold">•</span>
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{surah.numberOfAyahs} آية</span>
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                  <p className="arabic-text text-lg text-white/80 leading-none">{surah.englishNameTranslation}</p>
               </div>
               <ChevronLeft size={18} className="text-white/10 group-hover:text-gold-accent transition-colors rotate-180" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
