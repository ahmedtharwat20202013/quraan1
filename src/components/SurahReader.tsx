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
import { QuranDataLoader, ProcessedPageData, ProcessedSurahSection } from '../services/quranDataLoader';
import { toArabicDigits } from '../services/mushafPaginationEngine';
import { QuranSearchService, SearchResult } from '../services/quranSearchService';
import { 
  BalancedPaginationEngine, 
  BalancedQuranPage, 
  QuranLayoutConfig, 
  LayoutDebugInfo 
} from '../services/balancedPaginationEngine';

export type ReaderPaginationMode = 'official-json' | 'official' | 'balanced' | 'balanced-experimental';
export const FEATURE_PAGINATION_MODE: ReaderPaginationMode = 'official-json';

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

// Reading Padding Constants
export const READING_TOP_PADDING = 12;
export const READING_BOTTOM_PADDING = 18;
export const READING_SIDE_PADDING = 14;

// Typography Policy Constants (Readable Baseline: 26px Floor, 31px Standard, 44px Max)
export const MIN_READABLE_FONT_SIZE = 26;
export const DEFAULT_QURAN_FONT_SIZE = 31;
export const MAX_READABLE_FONT_SIZE = 44;
export const QURAN_READER_LINE_HEIGHT = 1.65;
export const QURAN_LAYOUT_VERSION = 'official-json-render-v1';
export const FEATURE_PAGINATION_MODE: ReaderPaginationMode = 'official-json';

export type RenderBlock =
  | { type: 'surah-header'; surahId: number; surahName: string }
  | { type: 'basmala'; surahId: number; text: string }
  | { type: 'ayah'; surahId: number; ayahNumber: number; text: string };

export type QuranPageRenderModel = {
  pageNumber: number;
  primarySurahId: number;
  primarySurahName: string;
  sections: ProcessedSurahSection[];
  blocks: RenderBlock[];
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type QuranVisualMetrics = {
  fontSize: number;
  lineHeight: number;
  viewportHeight: number;
  availableHeight: number;
  actualContentHeight: number;
  topWhitespace: number;
  bottomWhitespace: number;
  pageOccupancy: number;
};

export function getOfficialPageBlocks(
  pageNumber: number,
  pageData: ProcessedPageData
): QuranPageRenderModel {
  const blocks: RenderBlock[] = [];

  pageData.sections.forEach(section => {
    const isSurahStart = section.startsHere;
    const showBismillah = isSurahStart && section.id !== 9 && section.id !== 1;

    if (isSurahStart) {
      blocks.push({
        type: 'surah-header',
        surahId: section.id,
        surahName: section.name
      });
    }

    if (showBismillah) {
      blocks.push({
        type: 'basmala',
        surahId: section.id,
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'
      });
    }

    section.ayas.forEach(aya => {
      blocks.push({
        type: 'ayah',
        surahId: section.id,
        ayahNumber: aya.index,
        text: aya.text
      });
    });
  });

  return {
    pageNumber: pageData.pageNumber,
    primarySurahId: pageData.primarySurahId,
    primarySurahName: pageData.primarySurahName,
    sections: pageData.sections,
    blocks
  };
}

export function validateOfficialPageModel(model: QuranPageRenderModel): ValidationResult {
  const errors: string[] = [];
  let expectedAyahsCount = 0;

  model.sections.forEach(sec => {
    expectedAyahsCount += (sec.toAyah - sec.fromAyah + 1);
    const ayasInRange = sec.ayas.filter(a => a.index >= sec.fromAyah && a.index <= sec.toAyah);
    if (ayasInRange.length !== (sec.toAyah - sec.fromAyah + 1)) {
      errors.push(`Section surah ${sec.id} expected ${sec.toAyah - sec.fromAyah + 1} ayahs, found ${ayasInRange.length}`);
    }
  });

  const ayahBlocks = model.blocks.filter(b => b.type === 'ayah');
  if (ayahBlocks.length !== expectedAyahsCount) {
    errors.push(`Expected ${expectedAyahsCount} total ayahs, rendered ${ayahBlocks.length}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getSafeQuranFontSize(requestedSize?: number): number {
  let size = requestedSize;
  if (size === undefined && typeof localStorage !== 'undefined') {
    try {
      const saved = Number(localStorage.getItem('quran_font_size_v2'));
      if (Number.isFinite(saved) && saved >= MIN_READABLE_FONT_SIZE && saved <= MAX_READABLE_FONT_SIZE) {
        size = saved;
      }
    } catch {}
  }
  const target = size ?? DEFAULT_QURAN_FONT_SIZE;
  return Math.max(MIN_READABLE_FONT_SIZE, Math.min(target, MAX_READABLE_FONT_SIZE));
}

interface MushafPageContentProps {
  pageData: ProcessedPageData;
  fontSize: number;
  lineHeight: number;
  theme: 'paper' | 'dark';
  highlightedWord?: { verseIndex: number; wordIndex: number; isFading?: boolean } | null;
}

export function SurahContentHeader({ surahName }: { surahName: string }) {
  return (
    <div 
      className="surah-content-header w-full max-w-[360px] mx-auto my-2 py-1 px-4 border border-gold-accent/65 rounded-[9px] bg-gradient-to-b from-[#3f481d] to-[#293714] text-[#dfbb3d] text-center flex items-center justify-between shadow-sm select-none shrink-0" 
      dir="rtl"
    >
      <span className="surah-content-header-decoration text-gold-accent/90 text-xs font-bold select-none" aria-hidden="true">◆</span>
      <span className="surah-content-header-name font-black text-sm sm:text-base tracking-wide px-2" style={{ fontFamily: '"Tehaf", "AmiriQuran", serif' }}>
        سورة {surahName}
      </span>
      <span className="surah-content-header-decoration text-gold-accent/90 text-xs font-bold select-none" aria-hidden="true">◆</span>
    </div>
  );
}

export function BasmalaBlock() {
  return (
    <div
      className="basmala-block text-center font-normal select-none text-gold-accent text-base sm:text-xl opacity-95 shrink-0 my-1 sm:my-2"
      style={{ fontFamily: '"Tehaf", "AmiriQuran", serif', marginBlock: '0.4rem' }}
      dir="rtl"
      aria-label="Basmala"
    >
      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
    </div>
  );
}

interface MushafPageContentProps {
  pageData: ProcessedPageData;
  fontSize: number;
  lineHeight: number;
  theme: 'paper' | 'dark';
  highlightedWord?: { verseIndex: number; wordIndex: number; isFading?: boolean } | null;
}

export function MushafPageContent({
  pageData,
  fontSize,
  lineHeight,
  theme,
  highlightedWord
}: MushafPageContentProps) {
  return (
    <div className="quran-page-content w-full flex flex-col justify-start items-stretch space-y-1 mt-0 mb-0" dir="rtl">
      {pageData.sections.map((section, secIdx) => {
        const isSurahStart = section.startsHere;
        const showBismillah = isSurahStart && section.id !== 9 && section.id !== 1;

        return (
          <div key={`section_${section.id}_${secIdx}`} className="w-full flex flex-col justify-start space-y-1">
            {/* 1. Surah Content Header inside Quran page content */}
            {isSurahStart && <SurahContentHeader surahName={section.name} />}

            {/* 2. Basmala Block directly below surah content header */}
            {showBismillah && <BasmalaBlock />}

            {/* 3. Ayahs Continuous Text Flow */}
            <div 
              className={cn(
                "w-full font-normal select-text text-center",
                theme === 'paper' ? "text-[#0b2419]" : "text-[#f0faf5]"
              )}
              style={{ 
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                fontFamily: '"Tehaf", "AmiriQuran", serif',
                direction: 'rtl',
                unicodeBidi: 'embed',
                textAlign: 'center',
                wordSpacing: 'normal',
                letterSpacing: 'normal',
                whiteSpace: 'normal',
                overflowWrap: 'normal'
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
                    {/* Gold Verse End Marker Number */}
                    <span className="inline-block px-1 text-[0.82em] font-black text-gold-accent select-none">
                      {toArabicDigits(aya.index)}
                    </span>{' '}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Fine Separator between multiple surahs on same page */}
            {secIdx < pageData.sections.length - 1 && (
              <div className="my-1 flex items-center justify-center gap-3 w-4/5 mx-auto shrink-0" style={{ marginBlock: '0.25rem' }}>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-accent/50 to-transparent flex-1" />
                <div className="w-1.5 h-1.5 rounded-full bg-gold-accent/60" />
                <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-accent/50 to-transparent flex-1" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface BalancedPageContentProps {
  page: BalancedQuranPage;
  fontSize: number;
  lineHeight: number;
  theme: 'paper' | 'dark';
  highlightedWord?: { verseIndex: number; wordIndex: number; isFading?: boolean } | null;
}

export function BalancedPageContent({
  page,
  fontSize,
  lineHeight,
  theme,
  highlightedWord
}: BalancedPageContentProps) {
  return (
    <div className="quran-page-content w-full flex flex-col justify-start items-stretch space-y-1 mt-0 mb-0" dir="rtl">
      {page.blocks.map(block => {
        if (block.type === 'surah-header') {
          return <SurahContentHeader key={block.id} surahName={block.surahName} />;
        }

        if (block.type === 'basmala') {
          return <BasmalaBlock key={block.id} />;
        }

        // Ayah Block
        const words = block.text.split(/\s+/).filter(w => w.length > 0);
        const isHighlighted = highlightedWord?.verseIndex === block.ayahNumber;

        return (
          <div 
            key={block.id}
            className={cn(
              "w-full font-normal select-text text-center",
              theme === 'paper' ? "text-[#0b2419]" : "text-[#f0faf5]"
            )}
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              fontFamily: '"Tehaf", "AmiriQuran", serif',
              direction: 'rtl',
              unicodeBidi: 'embed',
              textAlign: 'center',
              wordSpacing: 'normal',
              letterSpacing: 'normal',
              whiteSpace: 'normal',
              overflowWrap: 'normal'
            }}
          >
            {words.map((word, wIdx) => {
              const isTargetWord = isHighlighted && highlightedWord.wordIndex === wIdx;

              return (
                <span
                  key={`word_${block.ayahNumber}_${wIdx}`}
                  className={cn(
                    "inline transition-colors duration-300",
                    isTargetWord && !highlightedWord.isFading && "bg-gold-accent/40 text-gold-accent font-bold rounded px-0.5"
                  )}
                >
                  {word}{' '}
                </span>
              );
            })}
            <span className="inline-block px-1 text-[0.82em] font-black text-gold-accent select-none">
              {toArabicDigits(block.ayahNumber)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface SurahTopBarProps {
  currentSurahName: string;
  currentPageNumber: number;
  totalPages: number;
  isBalancedMode: boolean;
  onBack: () => void;
  onTogglePaginationMode: (e: React.MouseEvent) => void;
  onOpenSearch: () => void;
  onToggleBookmark?: () => void;
  isBookmarked?: boolean;
  onToggleTheme: (e: React.MouseEvent) => void;
  theme: 'paper' | 'dark';
}

export function SurahTopBar({
  currentSurahName,
  currentPageNumber,
  totalPages,
  isBalancedMode,
  onBack,
  onTogglePaginationMode,
  onOpenSearch,
  onToggleBookmark,
  isBookmarked,
  onToggleTheme,
  theme
}: SurahTopBarProps) {
  return (
    <header 
      className="reader-top-bar absolute top-0 inset-x-0 z-40 px-3 py-2 bg-emerald-950/95 backdrop-blur-md border-b border-gold-accent/30 shadow-lg"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        columnGap: '8px'
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Left Area: Back Button & Mode Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1 text-xs font-bold"
          title="العودة"
        >
          <ChevronRight size={18} />
          <span>العودة</span>
        </button>

        <button
          onClick={onTogglePaginationMode}
          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-gold-accent/20 text-gold-accent hover:bg-gold-accent/30 border border-gold-accent/40 active:scale-95 transition-all"
          title="تبديل نمط الترقيم بين المصحف ٦٠٤ والصفحات المتزنة"
        >
          {isBalancedMode ? 'صفحات متزنة' : 'المصحف (٦٠٤)'}
        </button>
      </div>

      {/* Center Area: Application Title & Page Info */}
      <div className="flex flex-col items-center justify-center min-w-0 px-2" aria-live="polite">
        <h1 
          className="text-gold-accent font-black text-sm sm:text-base tracking-wide truncate"
          style={{ fontFamily: '"Tehaf", "AmiriQuran", serif' }}
        >
          المصحف الشريف
        </h1>
        <span className="text-[10px] text-white/70 font-bold mt-0.5">
          صفحة {toArabicDigits(currentPageNumber)} من {toArabicDigits(totalPages)}
        </span>
      </div>

      {/* Right Area: Search, Bookmark, Theme Toggle */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          title="بحث داخل السورة"
        >
          <Search size={16} />
        </button>

        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            className={cn(
              "p-1.5 rounded-xl active:scale-95 transition-all",
              isBookmarked
                ? "text-gold-accent bg-gold-accent/20"
                : "text-white/80 hover:text-white hover:bg-white/10"
            )}
            title={isBookmarked ? "إزالة الحفظ" : "حفظ الصفحة"}
          >
            <BookmarkIcon size={16} className={isBookmarked ? "fill-gold-accent" : ""} />
          </button>
        )}

        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          title={theme === 'paper' ? "الوضع الليلي" : "الوضع الورقي"}
        >
          {theme === 'paper' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}

export type ReaderMode = 'json-official' | 'balanced-experimental';

export type JsonPageRenderMetrics = {
  jsonPageNumber: number;
  expectedAyahCount: number;
  renderedAyahCount: number;
  missingAyahs: number[];
  duplicatedAyahs: number[];
  actualContentHeight: number;
  availableContentHeight: number;
  overflow: number;
  occupancy: number;
  fontSize: number;
};

export function validateRenderedPage(
  pageData: ProcessedPageData | null,
  targetPageNum: number
): JsonPageRenderMetrics | null {
  if (!pageData) return null;

  let expectedCount = 0;
  const renderedAyahs: number[] = [];
  const missingAyahs: number[] = [];
  const duplicatedAyahs: number[] = [];

  pageData.sections.forEach(sec => {
    expectedCount += (sec.toAyah - sec.fromAyah + 1);
    sec.ayas.forEach(aya => {
      if (renderedAyahs.includes(aya.index)) {
        duplicatedAyahs.push(aya.index);
      } else {
        renderedAyahs.push(aya.index);
      }
    });

    for (let a = sec.fromAyah; a <= sec.toAyah; a++) {
      if (!sec.ayas.some(aya => aya.index === a)) {
        missingAyahs.push(a);
      }
    }
  });

  const metrics: JsonPageRenderMetrics = {
    jsonPageNumber: targetPageNum,
    expectedAyahCount: expectedCount,
    renderedAyahCount: renderedAyahs.length,
    missingAyahs,
    duplicatedAyahs,
    actualContentHeight: 0,
    availableContentHeight: 0,
    overflow: 0,
    occupancy: 1.0,
    fontSize: DEFAULT_QURAN_FONT_SIZE
  };

  if (missingAyahs.length > 0 || duplicatedAyahs.length > 0) {
    console.error(`[Data Integrity Violation] JSON Page ${targetPageNum}:`, metrics);
  }

  return metrics;
}

export function verifyPageDataInvariant(pageData: ProcessedPageData | null, targetPageNum: number): boolean {
  if (!pageData) return false;
  if (pageData.pageNumber !== targetPageNum) return false;
  validateRenderedPage(pageData, targetPageNum);
  return true;
}

export default function SurahReader({
  initialPageNumber = 1,
  initialTargetAyah,
  initialTargetWordIndex,
  onBack,
  fontSize,
  bookmarks = [],
  onToggleBookmark,
  onPageChange
}: SurahReaderProps) {
  // Page number in official Mushaf (1..604)
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(() => {
    return Math.max(1, Math.min(604, initialPageNumber));
  });

  const [pageData, setPageData] = useState<ProcessedPageData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState<boolean>(false);
  const [fontLoaded, setFontLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<number>(1);

  // Pagination Mode ('official' | 'balanced')
  const [paginationMode, setPaginationMode] = useState<ReaderPaginationMode>(() => {
    try {
      return (localStorage.getItem('quran_pagination_mode_v1') as ReaderPaginationMode) || 'official';
    } catch {
      return 'official';
    }
  });

  const [balancedPages, setBalancedPages] = useState<BalancedQuranPage[]>([]);
  const [balancedPageNumber, setBalancedPageNumber] = useState<number>(1);
  const [isComputingBalanced, setIsComputingBalanced] = useState<boolean>(false);

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
  const prevInitialRef = useRef(initialPageNumber);

  // Non-blocking Font Loading with 600ms Timeout Race
  useEffect(() => {
    let active = true;
    Promise.race([
      typeof document !== 'undefined' && 'fonts' in document ? document.fonts.ready : Promise.resolve(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).then(() => {
      if (active) setFontLoaded(true);
    }).catch(() => {
      if (active) setFontLoaded(true);
    });

    return () => { active = false; };
  }, []);

  // Quiet Background Preloader for Adjacent Pages (n - 1 & n + 1)
  const triggerNeighborPreload = useCallback((pageNum: number) => {
    const runPreload = () => {
      if (pageNum > 1) void QuranDataLoader.getMushafPage(pageNum - 1);
      if (pageNum < 604) void QuranDataLoader.getMushafPage(pageNum + 1);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runPreload);
    } else {
      setTimeout(runPreload, 150);
    }
  }, []);

  // Page Loader utilizing memory cache
  const loadPage = useCallback(async (pageNum: number) => {
    if (!pageData) {
      setIsInitialLoading(true);
    } else {
      setIsPageTransitioning(true);
    }
    setError(null);

    try {
      const data = await QuranDataLoader.getMushafPage(pageNum);
      if (!data) {
        throw new Error(`تعذر تحميل صفحة ${pageNum} من المصحف الشريف`);
      }
      verifyPageDataInvariant(data, pageNum);
      setPageData(data);
      triggerNeighborPreload(pageNum);
    } catch (err: any) {
      console.error('Failed to load page:', err);
      setError(err?.message || 'تعذر تحميل صفحة المصحف. يرجى التحقق من الاتصال.');
    } finally {
      setIsInitialLoading(false);
      setIsPageTransitioning(false);
    }
  }, [pageData, triggerNeighborPreload]);

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

  // Surah boundary bounds for strict Surah Session Isolation
  const [surahBounds, setSurahBounds] = useState<{ minPage: number; maxPage: number }>({ minPage: 1, maxPage: 604 });

  useEffect(() => {
    if (pageData?.primarySurahId) {
      QuranDataLoader.getSurahBounds(pageData.primarySurahId).then(bounds => {
        setSurahBounds({ minPage: bounds.startPage, maxPage: bounds.endPage });
      });
    }
  }, [pageData?.primarySurahId]);

  // Typography policy states (Strictly bounded: 26px to 46px, default 30px, line-height 1.85)
  const safeFontSize = getSafeQuranFontSize(fontSize);
  const activeLineHeight = QURAN_READER_LINE_HEIGHT;
  const visibleContentRef = useRef<HTMLDivElement>(null);

  // Auto-hiding controls timeout
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    setShowControls(true);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, []);

  const toggleControls = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    } else {
      resetHideTimer();
    }
  }, [showControls, resetHideTimer]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [currentPageNumber, resetHideTimer]);

  // Load balanced layout engine pages on resize or mode change
  const computeBalancedLayout = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setIsComputingBalanced(true);

    const w = visibleContentRef.current ? visibleContentRef.current.clientWidth : (window.innerWidth || 390);
    const h = visibleContentRef.current ? visibleContentRef.current.clientHeight : (window.innerHeight || 840);

    const config: QuranLayoutConfig = {
      containerWidth: Math.max(280, w),
      availableHeight: Math.max(400, h),
      fontSize: safeFontSize,
      lineHeight: QURAN_READER_LINE_HEIGHT,
      fontFamily: '"Tehaf", "AmiriQuran", "Noto Sans Arabic", serif',
      theme,
      showVerseNumbers: true
    };

    try {
      const pages = await BalancedPaginationEngine.getBalancedPages(config);
      setBalancedPages(pages);
    } catch (e) {
      console.error('Failed to compute balanced pagination:', e);
    } finally {
      setIsComputingBalanced(false);
    }
  }, [theme]);

  useEffect(() => {
    if (paginationMode === 'balanced') {
      computeBalancedLayout();
    }
  }, [paginationMode, computeBalancedLayout]);

  // ResizeObserver for dynamic layout recalculation on viewport change
  useEffect(() => {
    if (typeof window === 'undefined' || !visibleContentRef.current) return;
    const observer = new ResizeObserver(() => {
      if (paginationMode === 'balanced') {
        computeBalancedLayout();
      }
    });
    observer.observe(visibleContentRef.current);
    return () => observer.disconnect();
  }, [paginationMode, computeBalancedLayout]);

  const currentBalancedPage = useMemo(() => {
    if (balancedPages.length === 0) return null;
    const idx = Math.max(0, Math.min(balancedPages.length - 1, balancedPageNumber - 1));
    return balancedPages[idx] || null;
  }, [balancedPages, balancedPageNumber]);

  const performPageTurn = useCallback((step: number) => {
    if (paginationMode === 'official') {
      setCurrentPageNumber(prev => {
        const next = Math.max(1, Math.min(604, prev + step));
        if (next !== prev) {
          setDirection(step);
          resetHideTimer();
        }
        return next;
      });
    } else {
      setBalancedPageNumber(prev => {
        const maxP = Math.max(1, balancedPages.length);
        const next = Math.max(1, Math.min(maxP, prev + step));
        if (next !== prev) {
          setDirection(step);
          resetHideTimer();
        }
        return next;
      });
    }
  }, [paginationMode, balancedPages.length, resetHideTimer]);

  const togglePaginationMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMode: ReaderPaginationMode = paginationMode === 'official' ? 'balanced' : 'official';
    setPaginationMode(newMode);
    try {
      localStorage.setItem('quran_pagination_mode_v1', newMode);
    } catch {}

    // Map position smoothly between modes
    if (newMode === 'balanced') {
      if (pageData && balancedPages.length > 0) {
        const targetBPage = BalancedPaginationEngine.getPageForSurah(pageData.primarySurahId, balancedPages);
        setBalancedPageNumber(targetBPage);
      }
    } else {
      if (currentBalancedPage) {
        QuranDataLoader.getPageForSurah(currentBalancedPage.primarySurahId).then(targetMPage => {
          setCurrentPageNumber(targetMPage);
        });
      }
    }
    resetHideTimer();
  };

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

    // Horizontal swipe (> 50px) within 1200ms
    if (
      Math.abs(deltaX) >= 50 && 
      Math.abs(deltaX) > Math.abs(deltaY) * 1.4 &&
      duration > 50 &&
      duration < 1200
    ) {
      if (deltaX < 0) {
        performPageTurn(1);
      } else {
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
        "relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden select-none transition-colors duration-300",
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
            className="w-full"
          >
            <SurahTopBar
              currentSurahName={
                paginationMode === 'balanced' && currentBalancedPage
                  ? currentBalancedPage.primarySurahName
                  : pageData
                  ? pageData.primarySurahName
                  : 'الفاتحة'
              }
              currentPageNumber={paginationMode === 'official' ? currentPageNumber : balancedPageNumber}
              totalPages={paginationMode === 'official' ? 604 : (balancedPages.length || 1)}
              isBalancedMode={paginationMode === 'balanced'}
              onBack={onBack}
              onTogglePaginationMode={togglePaginationMode}
              onOpenSearch={() => setIsSearchOpen(true)}
              onToggleBookmark={
                onToggleBookmark && pageData
                  ? () => onToggleBookmark(pageData.primarySurahId, currentPageNumber)
                  : undefined
              }
              isBookmarked={isBookmarked}
              onToggleTheme={toggleTheme}
              theme={theme}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container (Fixed Viewport, NO Vertical Scroll) */}
      <main className="quran-page-viewport relative min-h-0 flex-1 overflow-hidden flex flex-col justify-start items-center w-full">
        {/* Full-screen initial spinner ONLY on first open when pageData is null */}
        {(isInitialLoading || isComputingBalanced) && !pageData && (
          <div className="flex flex-col items-center justify-center space-y-4 my-auto">
            <div className="w-12 h-12 border-4 border-gold-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-black text-gold-accent">جاري تحميل صفحة المصحف الشريف...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isInitialLoading && !pageData && (
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

        {/* 1. Official 604 Mushaf Mode */}
        {paginationMode === 'official' && pageData && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`mushaf_page_${currentPageNumber}_${theme}`}
              initial={{ opacity: 0, x: direction * 25, scale: 0.99 }}
              animate={{ opacity: isPageTransitioning ? 0.85 : 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -direction * 25, scale: 0.99 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex h-full min-h-0 flex-col w-full justify-start items-center relative overflow-hidden pt-14 pb-16"
              style={{
                backgroundColor: theme === 'paper' ? '#fdfbf7' : '#082117',
              }}
            >
              <div 
                ref={visibleContentRef}
                data-json-page={currentPageNumber}
                className="quran-page-content h-full min-h-0 w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col justify-start items-stretch overflow-hidden z-10"
                style={{
                  boxSizing: 'border-box',
                  paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
                  paddingBottom: `calc(22px + env(safe-area-inset-bottom, 0px))`,
                  paddingInline: `${READING_SIDE_PADDING}px`,
                  direction: 'rtl',
                  unicodeBidi: 'embed',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textRendering: 'optimizeLegibility'
                }}
              >
                <MushafPageContent
                  pageData={pageData}
                  fontSize={safeFontSize}
                  lineHeight={activeLineHeight}
                  theme={theme}
                  highlightedWord={highlightedWord}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* 2. Balanced Layout Mode */}
        {paginationMode === 'balanced' && currentBalancedPage && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`balanced_page_${balancedPageNumber}_${theme}`}
              initial={{ opacity: 0, x: direction * 25, scale: 0.99 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -direction * 25, scale: 0.99 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex h-full min-h-0 flex-col w-full justify-start items-center relative overflow-hidden pt-14 pb-16"
              style={{
                backgroundColor: theme === 'paper' ? '#fdfbf7' : '#082117',
              }}
            >
              <div 
                className="quran-page-content h-full min-h-0 w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col justify-start items-stretch overflow-hidden z-10"
                style={{
                  boxSizing: 'border-box',
                  paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
                  paddingBottom: `calc(22px + env(safe-area-inset-bottom, 0px))`,
                  paddingInline: `${READING_SIDE_PADDING}px`,
                  direction: 'rtl',
                  unicodeBidi: 'embed',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textRendering: 'optimizeLegibility'
                }}
              >
                <BalancedPageContent
                  page={currentBalancedPage}
                  fontSize={safeFontSize}
                  lineHeight={activeLineHeight}
                  theme={theme}
                  highlightedWord={highlightedWord}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

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
