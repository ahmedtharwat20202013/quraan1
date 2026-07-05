import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, Bookmark as BookmarkIcon, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Bookmark } from '../types';
import surahsData from '../data/surahs.json';

interface QuranSectionProps {
  onPageClick: (pageNumber: number) => void;
  bookmarks: Bookmark[];
  onRemoveBookmark: (pageNumber: number) => void;
}

export default function QuranSection({ onPageClick, bookmarks, onRemoveBookmark }: QuranSectionProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'index' | 'bookmarks'>('index');

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
  }, [search, activeTab]);

  const filteredSurahs = surahsData.filter(s => 
    s.name.includes(search)
  );

  return (
    <div className="space-y-6 pb-20">
      <header className="space-y-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2">القرآن الكريم</h2>
          <p className="text-white/40 text-xs font-bold">تصفح المصحف الشريف بالصفحات مطابق لمصحف المدينة المنورة</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
          <button
            onClick={() => setActiveTab('index')}
            className={cn(
              "flex-1 py-3 text-xs font-black rounded-xl transition-all relative cursor-pointer",
              activeTab === 'index' 
                ? "bg-gold-accent text-neutral-950 shadow-md font-bold" 
                : "text-white/40 hover:text-white"
            )}
          >
            فهرس السور
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={cn(
              "flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 relative cursor-pointer",
              activeTab === 'bookmarks' 
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shadow-md font-bold" 
                : "text-white/40 hover:text-white"
            )}
          >
            <BookmarkIcon size={12} />
            العلامات المرجعية ({bookmarks.length})
          </button>
        </div>
        
        {activeTab === 'index' && (
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="ابحث عن سورة..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-6 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right font-bold text-sm"
            />
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'index' ? (
          <motion.div
            key="index-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {filteredSurahs.map((surah) => (
              <motion.div
                key={surah.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPageClick(surah.startPage)}
                className="glass-card hover:bg-white/10 transition-all p-5 flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center relative group-hover:bg-gold-accent/10 transition-colors">
                      <span className="text-xs font-bold opacity-30 group-hover:opacity-100 group-hover:text-gold-accent transition-all">{surah.id}</span>
                      <div className="absolute inset-0 border border-white/5 group-hover:border-gold-accent/20 rounded-2xl" />
                   </div>
                   <div className="text-right">
                      <h3 className="font-bold text-lg tracking-tight group-hover:text-gold-accent transition-colors">{surah.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/40 font-bold">الصفحة: {surah.startPage}</span>
                        <span className="text-[10px] text-white/20 font-bold">•</span>
                        <span className="text-[10px] text-white/40 font-bold">{surah.endPage - surah.startPage + 1} صفحات</span>
                      </div>
                   </div>
                </div>
                
                <ChevronLeft size={18} className="text-white/10 group-hover:text-gold-accent transition-colors rotate-180" />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="bookmarks-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {bookmarks.length === 0 ? (
              <div className="text-center p-12 glass-card space-y-4">
                <BookmarkIcon className="mx-auto text-white/10" size={48} />
                <p className="text-xs text-white/40 leading-relaxed font-bold">لا توجد علامات مرجعية حالياً.<br />اضغط على زر العلامة أعلى شاشة القراءة لحفظ صفحاتك.</p>
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <motion.div
                  key={bookmark.pageNumber}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ x: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onPageClick(bookmark.pageNumber)}
                  className="glass-card hover:bg-white/10 transition-all p-5 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 relative">
                        <BookmarkIcon size={18} />
                     </div>
                     <div className="text-right">
                        <h3 className="font-bold text-lg tracking-tight group-hover:text-gold-accent transition-colors">{bookmark.surahName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gold-accent font-bold">صفحة {bookmark.pageNumber}</span>
                          <span className="text-[10px] text-white/20 font-bold">•</span>
                          <span className="text-[10px] text-white/40 font-bold">
                            {new Date(bookmark.timestamp).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                     </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(bookmark.pageNumber);
                    }}
                    className="p-3 rounded-full hover:bg-rose-500/10 text-white/25 hover:text-rose-400 transition-all active:scale-90"
                    title="حذف العلامة"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
