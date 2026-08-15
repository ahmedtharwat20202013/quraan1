import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, Trash2, Bookmark as BookmarkIcon, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { Bookmark } from '../types';
import surahsData from '../data/surahs.json';
import EmptyState from './ui/EmptyState';
import { QuranSearchService, SearchResult } from '../services/quranSearchService';

interface QuranSectionProps {
  onSurahClick: (surahId: number, pageInSurah: number, targetAyah?: number, targetWordIndex?: number) => void;
  bookmarks: Bookmark[];
  onRemoveBookmark: (surahId: number, pageInSurah: number) => void;
  downloadProgress: number | null;
  isDownloaded: boolean;
}

export default function QuranSection({ 
  onSurahClick, 
  bookmarks = [], 
  onRemoveBookmark,
  downloadProgress,
  isDownloaded
}: QuranSectionProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'index' | 'bookmarks'>('index');

  // Global search results
  const [surahResults, setSurahResults] = useState<any[]>(surahsData);
  const [ayahResults, setAyahResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Initialize search index ONCE
  useEffect(() => {
    QuranSearchService.initIndex().catch(err => console.warn('Index init error:', err));
  }, []);

  // Realtime Debounced Search (150ms)
  useEffect(() => {
    if (!search.trim()) {
      setSurahResults(surahsData);
      setAyahResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const { surahMatches, ayahMatches } = await QuranSearchService.searchGlobal(search);
      
      const matchedSurahs = surahsData.filter(s => 
        surahMatches.some(m => m.id === s.id)
      );

      setSurahResults(matchedSurahs);
      setAyahResults(ayahMatches);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [search]);

  // Scroll to top on tab/search change
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

  return (
    <div className="space-y-6 pb-20">
      <header className="space-y-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2">القرآن الكريم</h2>
          <p className="text-white/40 text-xs font-bold">تصفح المصحف الشريف بالصفحات مطابق لمصحف المدينة المنورة</p>
        </div>

        {downloadProgress !== null && !isDownloaded && (
          <div className="p-4 rounded-[1.5rem] bg-gold-accent/10 border border-gold-accent/15 flex flex-col gap-2 no-toggle">
            <div className="flex justify-between items-center text-xs font-black">
              <span className="text-gold-accent">جاري تحميل صفحات المصحف الشريف للأوفلاين...</span>
              <span className="text-gold-accent">{downloadProgress}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gold-accent transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
          <button
            onClick={() => setActiveTab('index')}
            role="tab"
            aria-selected={activeTab === 'index'}
            aria-label="فهرس السور"
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
            role="tab"
            aria-selected={activeTab === 'bookmarks'}
            aria-label={`العلامات المرجعية - ${(bookmarks || []).length} علامات`}
            className={cn(
              "flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 relative cursor-pointer",
              activeTab === 'bookmarks' 
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shadow-md font-bold" 
                : "text-white/40 hover:text-white"
            )}
          >
            <BookmarkIcon size={12} aria-hidden="true" />
            العلامات المرجعية ({(bookmarks || []).length})
          </button>
        </div>
        
        {activeTab === 'index' && (
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={20} aria-hidden="true" />
            <input 
              type="text" 
              placeholder="🔍 ابحث باسم سورة أو كلمة من آية..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="ابحث باسم سورة أو كلمة من آية"
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
            role="list"
          >
            {isSearching ? (
              <div className="p-8 text-center text-xs font-bold text-gold-accent flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-gold-accent border-t-transparent rounded-full animate-spin" />
                <span>جاري البحث في المصحف...</span>
              </div>
            ) : surahResults.length === 0 && ayahResults.length === 0 ? (
              <EmptyState 
                title="لم نعثر على نتائج" 
                description={`لم نجد أي سورة أو آية تطابق البحث عن "${search}". يرجى تجربة كلمات أخرى.`} 
              />
            ) : (
              <>
                {/* 1. Surah Name Matches Section */}
                {surahResults.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {search.trim() && (
                      <h4 className="col-span-full text-xs font-black text-gold-accent/80 px-1">السور المطابقة ({surahResults.length})</h4>
                    )}
                    {surahResults.map((surah) => (
                      <motion.div
                        key={surah.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ x: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSurahClick(surah.id, surah.startPage)}
                        role="listitem"
                        aria-label={`سورة ${surah.name}، صفحة ${surah.startPage}`}
                        className="glass-card hover:bg-white/10 transition-all p-5 flex items-center justify-between cursor-pointer group shadow-md shadow-black/5"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center relative group-hover:bg-gold-accent/10 transition-colors">
                            <span className="text-xs font-bold opacity-30 group-hover:opacity-100 group-hover:text-gold-accent transition-all">{surah.id}</span>
                          </div>
                          <div className="text-right">
                            <h3 className="font-bold text-lg tracking-tight group-hover:text-gold-accent transition-colors">{surah.name}</h3>
                            <p className="text-[11px] font-bold text-white/40">صفحة {surah.startPage}</p>
                          </div>
                        </div>
                        
                        <ChevronLeft size={18} className="text-white/10 group-hover:text-gold-accent transition-colors rotate-180" aria-hidden="true" />
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* 2. Quranic Ayahs Matches Section */}
                {ayahResults.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black text-gold-accent/80 px-1">الآيات المطابقة ({ayahResults.length})</h4>
                    {ayahResults.map((result, idx) => (
                      <motion.div
                        key={`ayah_${result.surahId}_${result.ayaIndex}_${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ x: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSurahClick(result.surahId, undefined, result.ayaIndex, result.wordIndexInAyah)}
                        className="glass-card hover:bg-white/10 transition-all p-4 rounded-2xl cursor-pointer group shadow-md space-y-2 border border-white/5 hover:border-gold-accent/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} className="text-gold-accent" />
                            <span className="text-xs font-black text-gold-accent">سورة {result.surahName}</span>
                          </div>
                          <span className="text-[10px] bg-gold-accent/15 text-gold-accent font-bold px-2 py-0.5 rounded-full">
                            الآية {result.ayaIndex}
                          </span>
                        </div>
                        <p 
                          className="text-xs font-bold leading-relaxed text-white/80 line-clamp-2 text-right"
                          style={{ fontFamily: '"Tehaf", "Amiri", serif' }}
                        >
                          {result.hasMoreBefore ? '... ' : ''}
                          {result.beforeText ? `${result.beforeText} ` : ''}
                          <mark className="bg-gold-accent/35 text-gold-accent font-black rounded px-1">
                            {result.matchedText}
                          </mark>
                          {result.afterText ? ` ${result.afterText}` : ''}
                          {result.hasMoreAfter ? ' ...' : ''}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="bookmarks-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
            role="list"
          >
            {bookmarks.length === 0 ? (
              <EmptyState 
                icon={<BookmarkIcon size={32} />}
                title="لا توجد علامات مرجعية" 
                description="اضغط على زر العلامة أعلى شاشة قراءة المصحف لحفظ صفحتك الحالية والعودة إليها لاحقاً." 
              />
            ) : (
              bookmarks.map((bookmark) => (
                <motion.div
                  key={`${bookmark.surahId}-${bookmark.pageInSurah}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ x: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSurahClick(bookmark.surahId, bookmark.pageInSurah)}
                  role="listitem"
                  aria-label={`الانتقال إلى علامة سورة ${bookmark.surahName}، صفحة ${bookmark.pageInSurah}`}
                  className="glass-card hover:bg-white/10 transition-all p-5 flex items-center justify-between cursor-pointer group shadow-md shadow-black/5"
                >
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 relative">
                        <BookmarkIcon size={18} aria-hidden="true" />
                     </div>
                     <div className="text-right">
                        <h3 className="font-bold text-lg tracking-tight group-hover:text-gold-accent transition-colors">{bookmark.surahName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gold-accent font-bold">صفحة {bookmark.pageInSurah}</span>
                          <span className="text-xs text-white/20 font-bold">•</span>
                          <span className="text-xs text-white/40 font-bold">
                            {new Date(bookmark.timestamp).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                     </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(bookmark.surahId, bookmark.pageInSurah);
                    }}
                    role="button"
                    aria-label={`حذف العلامة المرجعية لسورة ${bookmark.surahName}`}
                    className="p-3 rounded-full hover:bg-rose-500/10 text-white/25 hover:text-rose-400 transition-all active:scale-90 cursor-pointer"
                    title="حذف العلامة"
                  >
                    <Trash2 size={16} aria-hidden="true" />
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
