import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark as BookmarkIcon,
  AlertTriangle,
  RefreshCw,
  Sun,
  Moon,
  Search,
  X
} from 'lucide-react';
import { Bookmark as BookmarkType } from '../types';
import { cn } from '../lib/utils';
import { QuranDataLoader, ProcessedPageData } from '../services/quranDataLoader';
import { toArabicDigits } from '../services/mushafPaginationEngine';
import { QuranSearchService, SearchResult } from '../services/quranSearchService';

interface SurahReaderProps {
  initialPageNumber?: number;
  initialTargetAyah?: number;
  initialTargetWordIndex?: number;
  onBack: () => void;
  fontSize?: number;
  bookmarks?: BookmarkType[];
  onToggleBookmark?: (surahId: number, pageNumber: number) => void;
  onPageChange?: (surahId: number, pageNumber: number) => void;
}

// Fixed Single Source of Truth Constants for Quran Reading Mode
export const MUSHAF_TEXT_SIZE_PX = 24;
export const MUSHAF_TEXT_LINE_HEIGHT = 1.9;

export default function SurahReader({
  initialPageNumber = 1,
  initialTargetAyah,
  initialTargetWordIndex,
  onBack,
  bookmarks = [],
  onToggleBookmark,
  onPageChange
}: SurahReaderProps) {
  // Page number in official Mushaf (1..604)
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(() => {
    return Math.max(1, Math.min(604, initialPageNumber));
  });

  const [pageData, setPageData] = useState<ProcessedPageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fontLoaded, setFontLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<number>(1);

  // Auto-hiding controls state
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimer = useRef<any>(null);

  // Theme state ('paper' | 'dark')
  const [theme, setTheme] = useState<'paper' | 'dark'>(() => {
    try {
      return (localStorage.getItem('mushaf_theme') as 'paper' | 'dark') || 'paper';
    } catch {
      return 'paper';
    }
  });

  // In-Surah Search States
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Word-Specific Highlight State
  const [highlightedWord, setHighlightedWord] = useState<{ verseIndex: number; wordIndex: number; isFading?: boolean } | null>(
    initialTargetAyah !== undefined && initialTargetWordIndex !== undefined
      ? { verseIndex: initialTargetAyah, wordIndex: initialTargetWordIndex, isFading: false }
      : null
  );
  const highlightTimerRef = useRef<any>(null);
  const fadeTimerRef = useRef<any>(null);

  // Touch gesture tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  // READING MODE LAYOUT ENGINE
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);

  useEffect(() => {
    if (!textContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) {
          setContainerWidth(w);
        }
      }
    });
    observer.observe(textContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset container scroll position to top whenever page changes
  useEffect(() => {
    if (textContainerRef.current) {
      textContainerRef.current.scrollTop = 0;
    }
  }, [currentPageNumber]);

  // Ensure font is loaded
  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => setFontLoaded(true)).catch(() => setFontLoaded(true));
    } else {
      setFontLoaded(true);
    }
  }, []);

  const prevInitialRef = useRef(initialPageNumber);

  // Sync initialPageNumber ONLY when parent explicitly changes it (e.g. from Home or Search)
  useEffect(() => {
    if (initialPageNumber !== undefined && initialPageNumber !== prevInitialRef.current) {
      prevInitialRef.current = initialPageNumber;
      setCurrentPageNumber(Math.max(1, Math.min(604, initialPageNumber)));
    }
  }, [initialPageNumber]);

  // Load 1..604 page data from quran_pages_v3.json
  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await QuranDataLoader.getMushafPage(pageNum);
      if (!data) {
        throw new Error(`تعذر تحميل صفحة ${pageNum} من المصحف الشريف`);
      }
      setPageData(data);
    } catch (err: any) {
      console.error('Failed to load page:', err);
      setError(err?.message || 'تعذر تحميل صفحة المصحف. يرجى التحقق من الملفات والاتصال.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(currentPageNumber);
  }, [currentPageNumber, loadPage]);

  // Notify parent & save state
  useEffect(() => {
    if (pageData) {
      if (onPageChange) {
        onPageChange(pageData.primarySurahId, currentPageNumber);
      }
      try {
        localStorage.setItem(
          'quran_light_state',
          JSON.stringify({
            lastRead: {
              surahId: pageData.primarySurahId,
              pageNumber: currentPageNumber,
              timestamp: Date.now()
            }
          })
        );
      } catch (e) {
        console.warn('Failed to save last read state:', e);
      }
    }
  }, [currentPageNumber, pageData, onPageChange]);

  // Word highlight trigger
  const triggerWordHighlight = useCallback((verseIndex: number, wordIndex: number) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    setHighlightedWord({ verseIndex, wordIndex, isFading: false });

    highlightTimerRef.current = setTimeout(() => {
      setHighlightedWord({ verseIndex, wordIndex, isFading: true });
      fadeTimerRef.current = setTimeout(() => {
        setHighlightedWord(null);
      }, 1200);
    }, 3500);
  }, []);

  useEffect(() => {
    if (initialTargetAyah !== undefined && initialTargetWordIndex !== undefined) {
      triggerWordHighlight(initialTargetAyah, initialTargetWordIndex);
    }
  }, [initialTargetAyah, initialTargetWordIndex, triggerWordHighlight]);

  // Auto-hide controls bar after inactivity
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    setShowControls(true);
    if (!isSearchOpen) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [resetHideTimer]);

  const toggleControls = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    if (isSearchOpen) {
      setIsSearchOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    }

    if (showControls) {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      setShowControls(false);
    } else {
      resetHideTimer();
    }
  };

  // Surah boundary bounds for strict Surah Session Isolation
  const [surahBounds, setSurahBounds] = useState<{ minPage: number; maxPage: number }>({ minPage: 1, maxPage: 604 });

  useEffect(() => {
    if (pageData?.primarySurahId) {
      QuranDataLoader.getSurahBounds(pageData.primarySurahId).then(bounds => {
        setSurahBounds({ minPage: bounds.startPage, maxPage: bounds.endPage });
      });
    }
  }, [pageData?.primarySurahId]);

  // Single Controlled Page Navigation Entry Point
  const performPageTurn = useCallback((dir: 1 | -1) => {
    if (dir === 1) {
      if (currentPageNumber < surahBounds.maxPage) {
        setDirection(1);
        setCurrentPageNumber(prev => prev + 1);
        resetHideTimer();
      }
    } else {
      if (currentPageNumber > surahBounds.minPage) {
        setDirection(-1);
        setCurrentPageNumber(prev => prev - 1);
        resetHideTimer();
      }
    }
  }, [currentPageNumber, surahBounds.maxPage, surahBounds.minPage, resetHideTimer]);

  const goToNextPage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    performPageTurn(1);
  }, [performPageTurn]);

  const goToPrevPage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    performPageTurn(-1);
  }, [performPageTurn]);

  // Touch Gesture Handling State Machine
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = (touchStartY.current !== null && touchEndY.current !== null) 
      ? touchStartY.current - touchEndY.current 
      : 0;
    const duration = Date.now() - touchStartTime.current;

    // VALIDATION: Page turn occurs ONLY on an intentional horizontal swipe (> 60px) within 1200ms
    if (
      Math.abs(deltaX) >= 60 && 
      Math.abs(deltaX) > Math.abs(deltaY) * 1.4 &&
      duration > 50 &&
      duration < 1200
    ) {
      if (deltaX < 0) {
        // Swiped Left to Right -> Next Page in RTL Mushaf
        performPageTurn(1);
      } else {
        // Swiped Right to Left -> Previous Page in RTL Mushaf
        performPageTurn(-1);
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        performPageTurn(1);
      } else if (e.key === 'ArrowRight') {
        performPageTurn(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performPageTurn]);

  // Search inside current page / surah
  useEffect(() => {
    if (!searchQuery.trim() || !pageData) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await QuranSearchService.searchInSurah(pageData.primarySurahId, searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, pageData]);

  const handleSelectSearchResult = async (result: SearchResult) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);

    const targetPage = await QuranDataLoader.getPageForAyah(result.surahId, result.ayaIndex);
    setDirection(targetPage >= currentPageNumber ? 1 : -1);
    setCurrentPageNumber(targetPage);
    triggerWordHighlight(result.ayaIndex, result.wordIndexInAyah);
    resetHideTimer();
  };

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTheme = theme === 'paper' ? 'dark' : 'paper';
    setTheme(newTheme);
    resetHideTimer();
    try {
      localStorage.setItem('mushaf_theme', newTheme);
    } catch {}
  };

  const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];
  const isBookmarked = pageData ? safeBookmarks.some(b => b.surahId === pageData.primarySurahId && (b.pageNumber === currentPageNumber || b.pageInSurah === currentPageNumber)) : false;

  return (
    <div 
      className={cn(
        "relative w-full h-full flex flex-col justify-between overflow-hidden select-none transition-colors duration-300",
        theme === 'paper' ? "bg-[#fdfbf7] text-[#0b2419]" : "bg-[#082117] text-[#f0faf5]"
      )}
      onClick={toggleControls}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar (Floating Overlay) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute top-0 inset-x-0 z-40 px-4 py-3 bg-emerald-950/95 backdrop-blur-md border-b border-gold-accent/20 flex items-center justify-between shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Right Group: Back Button & Surah Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1 text-xs font-bold"
                title="العودة"
              >
                <ChevronRight size={20} />
                <span>العودة</span>
              </button>

              <div className="h-4 w-[1px] bg-white/20" />

              <div className="text-right">
                <h2 className="text-sm md:text-base font-black text-gold-accent">
                  {pageData ? `سورة ${pageData.primarySurahName}` : 'المصحف الشريف'}
                </h2>
                <p className="text-[10px] text-white/60 font-bold">
                  صفحة {toArabicDigits(currentPageNumber)} من ٦٠٤
                  {pageData && pageData.sections.length > 0 && (
                    <span className="text-gold-accent/80 font-bold mr-1">
                      • آية {toArabicDigits(pageData.sections[0].fromAyah)} - {toArabicDigits(pageData.sections[pageData.sections.length - 1].toAyah)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Left Group: Font Scale Switcher, Search, Bookmark, Debug & Theme Toggle */}
            <div className="flex items-center gap-1.5">
              {/* User Font Scale Control (Small / Medium / Large) */}
              <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/15">
                <button
                  onClick={() => handleFontScaleChange('small')}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                    fontScale === 'small'
                      ? "bg-gold-accent text-emerald-950 shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                  title="خط صغير"
                >
                  صغير
                </button>
                <button
                  onClick={() => handleFontScaleChange('medium')}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                    fontScale === 'medium'
                      ? "bg-gold-accent text-emerald-950 shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                  title="خط مريح (افتراضي)"
                >
                  مريح
                </button>
                <button
                  onClick={() => handleFontScaleChange('large')}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                    fontScale === 'large'
                      ? "bg-gold-accent text-emerald-950 shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                  title="خط كبير"
                >
                  كبير
                </button>
              </div>

              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                title="بحث داخل السورة"
              >
                <Search size={18} />
              </button>

              {onToggleBookmark && pageData && (
                <button
                  onClick={() => onToggleBookmark(pageData.primarySurahId, currentPageNumber)}
                  className={cn(
                    "p-2 rounded-xl active:scale-95 transition-all",
                    isBookmarked
                      ? "text-gold-accent bg-gold-accent/20"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                  title={isBookmarked ? "إزالة الحفظ" : "حفظ الصفحة"}
                >
                  <BookmarkIcon size={18} className={isBookmarked ? "fill-gold-accent" : ""} />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setShowDebugPanel(prev => !prev); }}
                className="p-2 rounded-xl text-gold-accent hover:bg-gold-accent/10 active:scale-95 transition-all text-xs font-mono font-bold"
                title="لوحة المراقبة البرمجية"
              >
                ⚙️
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                title={theme === 'paper' ? "الوضع الليلي" : "الوضع الورقي"}
              >
                {theme === 'paper' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Development Reading Mode Debug Panel */}
      {showDebugPanel && (
        <div className="fixed top-16 left-4 z-50 p-4 rounded-2xl bg-black/95 text-amber-300 font-mono text-[11px] border border-gold-accent/40 shadow-2xl space-y-1 dir-ltr max-w-sm pointer-events-auto">
          <div className="font-bold text-white border-b border-white/20 pb-1 mb-1">📐 Quran Reading Mode Debug Info</div>
          <div>Mode: <span className="text-emerald-400 font-bold">Reading Mode (وضع القراءة)</span></div>
          <div>Container Width: <span className="text-white font-bold">{containerWidth}px</span></div>
          <div>Viewport: <span className="text-white font-bold">{typeof window !== 'undefined' ? `${window.innerWidth} × ${window.innerHeight}` : 'N/A'}</span></div>
          <div>CSS Reading Font-Size: <span className="text-emerald-400 font-bold">{activeFontSize}px</span></div>
          <div>Font Scale Choice: <span className="text-emerald-400 font-bold">{fontScale}</span></div>
          <div>Applied Line-Height: <span className="text-white font-bold">{READING_LINE_HEIGHT} ({Math.round(activeFontSize * READING_LINE_HEIGHT)}px)</span></div>
          <div>Font Family: <span className="text-white font-bold">Tehaf, AmiriQuran, Amiri, serif</span></div>
          <div>Font Loaded: <span className="text-emerald-400 font-bold">{fontLoaded ? 'YES' : 'NO'}</span></div>
          <div>Calibration Engine: <span className="text-emerald-400 font-bold">Disabled (Pure Width Breakpoint)</span></div>
          <div>Page: <span className="text-white font-bold">{currentPageNumber} / 604</span></div>
        </div>
      )}

      {/* Main Full-Screen Mushaf Page Display Container (Starts AT VERY TOP top:0) */}
      <div className="flex-1 w-full h-full flex flex-col justify-start items-center relative overflow-hidden pt-0 pb-0 px-0 sm:px-2">
        {/* Loading State */}
        {(loading || !fontLoaded) && (
          <div className="flex flex-col items-center justify-center space-y-4 my-auto">
            <div className="w-12 h-12 border-4 border-gold-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-black text-gold-accent">جاري تحميل صفحة المصحف الشريف...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="max-w-md p-8 text-center space-y-6 bg-rose-500/10 rounded-[2rem] border border-rose-500/20 shadow-xl my-auto">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <p className="text-sm font-bold leading-relaxed text-rose-300">{error}</p>
            <button
              onClick={() => loadPage(currentPageNumber)}
              className="px-6 py-3 bg-gold-accent text-emerald-950 font-black text-xs rounded-xl flex items-center gap-2 mx-auto shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <RefreshCw size={14} />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Full Screen Edge-to-Edge 604 Mushaf Page View */}
        {!loading && fontLoaded && !error && pageData && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`mushaf_page_${currentPageNumber}_${theme}`}
              initial={{ opacity: 0, x: direction * 25, scale: 0.99 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -direction * 25, scale: 0.99 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="w-full h-full flex flex-col justify-start relative overflow-hidden"
              style={{
                backgroundColor: theme === 'paper' ? '#fdfbf7' : '#082117',
              }}
            >
              {/* Page Surah Sections Body: CONSERVATIVE READING MODE LAYOUT ENGINE */}
              <div 
                ref={textContainerRef}
                className="flex-1 w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col justify-start overflow-y-auto px-3.5 sm:px-6 md:px-8 pt-4 pb-20 z-10 space-y-3"
                style={{
                  fontSize: `${activeFontSize}px`,
                  fontFamily: '"Tehaf", "AmiriQuran", "Amiri", serif',
                  direction: 'rtl',
                  unicodeBidi: 'embed',
                  whiteSpace: 'normal',
                  letterSpacing: 'normal',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textRendering: 'optimizeLegibility'
                }}
              >
                {pageData.sections.map((section, secIdx) => {
                  const showHeader = section.startsHere;
                  const showBismillah = section.startsHere && section.id !== 9 && section.id !== 1;

                  return (
                    <div key={`section_${section.id}_${secIdx}`} className="w-full flex flex-col justify-start space-y-1">
                      {/* Royal Islamic Surah Header Frame ALWAYS AT ABSOLUTE TOP when startsHere === true */}
                      {showHeader && (
                        <div className="w-full mt-0 mb-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-gold-accent/15 via-gold-accent/35 to-gold-accent/15 border border-gold-accent/60 text-center shadow-md relative overflow-hidden flex items-center justify-between shrink-0">
                          <div className="text-gold-accent/90 text-xs font-bold select-none flex items-center gap-1">
                            <span>❖</span>
                            <span className="hidden sm:inline">━━</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-gold-accent tracking-wide px-2" style={{ fontFamily: '"Tehaf", "AmiriQuran", serif' }}>
                            سورة {section.name}
                          </h3>
                          <div className="text-gold-accent/90 text-xs font-bold select-none flex items-center gap-1">
                            <span className="hidden sm:inline">━━</span>
                            <span>❖</span>
                          </div>
                        </div>
                      )}

                      {/* Bismillah if startsHere === true */}
                      {showBismillah && (
                        <div 
                          className="text-center font-normal my-1 select-none text-gold-accent text-sm sm:text-base opacity-95 shrink-0"
                          style={{ fontFamily: '"Tehaf", "AmiriQuran", serif' }}
                        >
                          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>
                      )}

                      {/* Ayahs Continuous Text Flow with Line-Height 1.85 & Natural Diacritic Spacing */}
                      <div 
                        className={cn(
                          "w-full text-center select-text font-normal",
                          theme === 'paper' ? "text-[#0b2419]" : "text-[#f0faf5]"
                        )}
                        style={{ 
                          lineHeight: READING_LINE_HEIGHT,
                          letterSpacing: 'normal', 
                          wordSpacing: 'normal' 
                        }}
                      >
                        {section.ayas.map(aya => {
                          const words = aya.text.split(/\s+/).filter(w => w.length > 0);
                          const isHighlighted = highlightedWord?.verseIndex === aya.index;

                          return (
                            <React.Fragment key={`aya_${section.id}_${aya.index}`}>
                              {words.map((word, wIdx) => {
                                const isTargetWord = isHighlighted && highlightedWord.wordIndex === wIdx;

                                return (
                                  <span
                                    key={`word_${aya.index}_${wIdx}`}
                                    className={cn(
                                      "inline transition-colors duration-300",
                                      isTargetWord && !highlightedWord.isFading && "bg-gold-accent/40 text-gold-accent font-bold rounded px-0.5"
                                    )}
                                  >
                                    {word}{' '}
                                  </span>
                                );
                              })}
                              {/* Gold Verse End Marker Number (Without Brackets) */}
                              <span className="text-gold-accent font-black text-[0.85em] px-1 inline-block select-none">
                                {toArabicDigits(aya.index)}
                              </span>{' '}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Horizontal Separator if multiple surahs on page */}
                      {secIdx < pageData.sections.length - 1 && (
                        <div className="my-3 flex items-center justify-center gap-3 w-4/5 mx-auto shrink-0">
                          <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-accent/50 to-transparent flex-1" />
                          <div className="w-1.5 h-1.5 rounded-full bg-gold-accent/60" />
                          <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-accent/50 to-transparent flex-1" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Natural bottom breathing space */}
                <div className="w-full h-16 shrink-0 pointer-events-none" />
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Controls Floating Navigation Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute bottom-0 inset-x-0 z-40 px-6 py-3 bg-emerald-950/90 backdrop-blur-md border-t border-gold-accent/20 flex items-center justify-between shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Previous Page (RTL Next in Mushaf) */}
            <button
              onClick={goToPrevPage}
              disabled={currentPageNumber <= surahBounds.minPage}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95",
                currentPageNumber <= surahBounds.minPage
                  ? "bg-white/5 text-white/30 cursor-not-allowed"
                  : "bg-gold-accent text-emerald-950 hover:bg-gold-accent/90"
              )}
            >
              <ChevronRight size={16} />
              <span>الصفحة السابقة</span>
            </button>

            <span className="text-xs font-black text-gold-accent">
              {toArabicDigits(currentPageNumber)} / ٦٠٤
            </span>

            {/* Next Page (RTL Prev in Mushaf) */}
            <button
              onClick={goToNextPage}
              disabled={currentPageNumber >= surahBounds.maxPage}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95",
                currentPageNumber >= surahBounds.maxPage
                  ? "bg-white/5 text-white/30 cursor-not-allowed"
                  : "bg-gold-accent text-emerald-950 hover:bg-gold-accent/90"
              )}
            >
              <span>الصفحة التالية</span>
              <ChevronLeft size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-Surah Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-start pt-16"
            onClick={e => {
              e.stopPropagation();
              setIsSearchOpen(false);
            }}
          >
            <div 
              className="w-full max-w-lg mx-auto bg-emerald-950 border border-gold-accent/30 rounded-2xl p-4 space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-gold-accent flex items-center gap-2">
                  <Search size={16} />
                  <span>بحث في سورة {pageData?.primarySurahName}</span>
                </h3>
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="p-1 rounded-lg text-white/60 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="اكتب كلمة أو آية للبحث..."
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm font-bold text-white placeholder-white/40 focus:outline-none focus:border-gold-accent"
                autoFocus
              />

              {isSearching && (
                <p className="text-center text-xs font-bold text-gold-accent py-4">جاري البحث...</p>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && (
                <p className="text-center text-xs font-bold text-white/60 py-4">لم يتم العثور على نتائج</p>
              )}

              {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {searchResults.map((res, i) => (
                    <div
                      key={`sr_${i}`}
                      onClick={() => handleSelectSearchResult(res)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer space-y-1 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gold-accent">الآية {toArabicDigits(res.ayaIndex)}</span>
                      </div>
                      <p className="text-xs font-bold text-white/90 leading-relaxed">
                        {res.beforeText} <mark className="bg-gold-accent/40 text-gold-accent font-black px-1 rounded">{res.matchedText}</mark> {res.afterText}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
