import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight,
  Bookmark as BookmarkIcon, 
  Moon,
  Sun,
  LayoutGrid,
  FileUp,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  RotateCcw
} from 'lucide-react';
import { pdfjs, Document, Page } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Bookmark as BookmarkType } from '../types';
import { cn } from '../lib/utils';
import surahsData from '../data/surahs.json';

// Configure PDFJS worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`
};

interface SurahReaderProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  onBack: () => void;
  fontSize: number;
  bookmarks: BookmarkType[];
  onToggleBookmark: (pageNumber: number) => void;
}

// Memory-cached resolver for shared pages
export const findCurrentSurah = (page: number) => {
  // Shared page rule: if a surah starts exactly on this page, prioritize it!
  const starting = surahsData.find(s => s.startPage === page);
  if (starting) return starting;
  // Otherwise, return the surah containing this page
  return surahsData.find(s => page >= s.startPage && page <= s.endPage) || null;
};

export default function SurahReader({ 
  currentPage, 
  setCurrentPage, 
  onBack, 
  fontSize,
  bookmarks,
  onToggleBookmark
}: SurahReaderProps) {
  const [numPages, setNumPages] = useState<number | null>(604);
  const [isNightMode, setIsNightMode] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [localPdfUrl, setLocalPdfUrl] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [isCheckingPdf, setIsCheckingPdf] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);

  const resolvedPdfUrl = localPdfUrl || "/quran.pdf";

  // Dynamic Surah name and bookmark state mapping (Zero state variables)
  const currentSurah = useMemo(() => findCurrentSurah(currentPage), [currentPage]);
  const surahName = currentSurah ? `سورة ${currentSurah.name}` : 'القرآن الكريم';
  const isBookmarked = useMemo(() => bookmarks.some(b => b.pageNumber === currentPage), [bookmarks, currentPage]);

  const resetControlsTimeout = useCallback(() => {
    if (isLocked) return;
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, [isLocked]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    return () => {
      if (localPdfUrl) URL.revokeObjectURL(localPdfUrl);
    };
  }, [localPdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const toggleControls = (e: React.MouseEvent) => {
    if (isLocked) return;
    const isControlClick = (e.target as HTMLElement).closest('button, input, select, .no-toggle');
    if (!isControlClick) {
      setShowControls(prev => !prev);
      if (!showControls) resetControlsTimeout();
    }
  };

  const goToNextPage = useCallback(() => {
    if (isLocked) return;
    if (currentPage < 604) {
      setDirection('forward');
      setCurrentPage(currentPage + 1);
      if (transformRef.current) {
        transformRef.current.resetTransform(0);
      }
    }
  }, [isLocked, currentPage, setCurrentPage]);

  const goToPrevPage = useCallback(() => {
    if (isLocked) return;
    if (currentPage > 1) {
      setDirection('backward');
      setCurrentPage(currentPage - 1);
      if (transformRef.current) {
        transformRef.current.resetTransform(0);
      }
    }
  }, [isLocked, currentPage, setCurrentPage]);

  const handleZoomIn = () => {
    if (transformRef.current) {
      transformRef.current.zoomIn(0.5);
    }
  };

  const handleZoomOut = () => {
    if (transformRef.current) {
      transformRef.current.zoomOut(0.5);
    }
  };

  const handleResetZoom = () => {
    if (transformRef.current) {
      transformRef.current.resetTransform();
    }
  };

  const onZoomChange = (ref: any) => {
    const newScale = ref.state.scale;
    setIsZoomedIn(newScale > 1.05);
    if (newScale > 1.05) {
      setShowControls(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomedIn || isLocked) return;
    resetControlsTimeout();
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isZoomedIn || isLocked || touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    
    const swipeThreshold = 50;
    if (deltaX > swipeThreshold) {
      goToPrevPage(); // Swipe right pulls previous page
    } else if (deltaX < -swipeThreshold) {
      goToNextPage(); // Swipe left pulls next page
    }
    touchStartX.current = null;
  };

  const getPageDimensions = () => {
    if (!containerSize.height || !containerSize.width) return { width: 320, scale: 1 };
    
    const MARGIN = 16;
    const availableWidth = containerSize.width - MARGIN;
    const availableHeight = containerSize.height - MARGIN - (showControls && !isLocked ? 140 : 20);

    const pageAspectRatio = 850 / 1250;
    const widthIfFittingHeight = availableHeight * pageAspectRatio;
    
    let targetWidth: number;
    if (widthIfFittingHeight > availableWidth) {
      targetWidth = availableWidth;
    } else {
      targetWidth = widthIfFittingHeight;
    }

    return { 
      width: Math.floor(targetWidth),
      scale: 1 
    };
  };

  const slideVariants: any = {
    enter: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      x: dir === 'forward' ? -300 : 300,
      scale: 0.96
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      x: dir === 'forward' ? 300 : -300,
      scale: 0.96,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  return (
    <div 
      className={cn(
        "h-screen flex flex-col transition-all duration-700 overflow-hidden select-none relative",
        isNightMode ? "bg-[#050505] text-white/95" : "bg-neutral-100 text-neutral-900"
      )}
      dir="rtl"
      ref={containerRef}
    >
      {/* Top Header Controls App Bar */}
      <AnimatePresence>
        {showControls && !isLocked && (
          <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            className="flex-none z-50 p-4 pt-safe flex items-center justify-between bg-[#00140a]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/5 text-white hover:bg-gold-accent hover:text-black transition-all active:scale-95 shadow-md cursor-pointer"
              >
                <ChevronLeft size={20} className="rotate-180" />
              </button>
              <div className="text-right">
                <h3 className="font-bold text-lg leading-none tracking-tight text-white">{surahName}</h3>
                <span className="text-[10px] uppercase font-black text-gold-accent tracking-tighter block mt-1.5">صفحة {currentPage}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleBookmark(currentPage); resetControlsTimeout(); }} 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 shadow-md cursor-pointer",
                  isBookmarked 
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" 
                    : "bg-white/10 border-white/5 text-white hover:text-gold-accent"
                )}
                title={isBookmarked ? "إلغاء حفظ الصفحة" : "حفظ الصفحة الحالية"}
              >
                <BookmarkIcon size={18} className={cn(isBookmarked && "fill-emerald-400")} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsNightMode(!isNightMode); resetControlsTimeout(); }} 
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/5 text-white transition-all active:scale-95 shadow-md cursor-pointer"
                title="تغيير الإضاءة والمظهر"
              >
                {isNightMode ? <Sun size={18} className="text-gold-bright" /> : <Moon size={18} className="text-white" />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsLocked(true); setShowControls(false); }} 
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/5 text-white transition-all active:scale-95 shadow-md cursor-pointer"
                title="تأمين شاشة القراءة"
              >
                <Unlock size={18} />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Floating Lock Indicator when locked */}
      <AnimatePresence>
        {isLocked && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => {
              setIsLocked(false);
              setShowControls(true);
            }}
            className="fixed top-6 left-6 z-[60] w-12 h-12 bg-gold-accent text-emerald-950 font-bold rounded-full flex items-center justify-center border border-gold-bright/30 shadow-[0_4px_30px_rgba(212,175,55,0.4)] active:scale-90 transition-transform cursor-pointer"
            title="إلغاء قفل الشاشة"
          >
            <Lock size={20} className="animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mushaf Page Viewport Area */}
      <main 
        className="flex-1 flex flex-col items-center justify-center relative touch-none overflow-hidden w-full h-full"
        onClick={toggleControls}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Side Gradients for page depth immersion */}
          <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/20 to-transparent pointer-events-none z-10" />

          {/* Large Tap targets for next/prev pages (very comfy for phone thumbs) */}
          {!isLocked && !isZoomedIn && (
            <>
              {/* Right target - Swipe forward (RTL next page) */}
              <div 
                onClick={(e) => { e.stopPropagation(); goToNextPage(); resetControlsTimeout(); }}
                className="absolute right-0 top-0 bottom-0 w-[15%] z-30 cursor-pointer pointer-events-auto"
                title="الصفحة التالية"
              />
              {/* Left target - Swipe backward (RTL previous page) */}
              <div 
                onClick={(e) => { e.stopPropagation(); goToPrevPage(); resetControlsTimeout(); }}
                className="absolute left-0 top-0 bottom-0 w-[15%] z-30 cursor-pointer pointer-events-auto"
                title="الصفحة السابقة"
              />
            </>
          )}

          {/* Desktop/Tablet visual arrow overlays */}
          {!isLocked && !isZoomedIn && (
            <div className={cn(
              "absolute inset-x-4 top-1/2 -translate-y-1/2 z-40 flex justify-between pointer-events-none transition-opacity duration-300 hidden md:flex",
              showControls ? "opacity-100" : "opacity-0"
            )}>
              <button 
                onClick={(e) => { e.stopPropagation(); goToPrevPage(); resetControlsTimeout(); }}
                className={cn(
                  "p-3 bg-black/40 text-white rounded-full backdrop-blur-md pointer-events-auto transition-all transform hover:scale-110 border border-white/5 cursor-pointer",
                  currentPage === 1 ? "opacity-20 cursor-not-allowed" : "hover:bg-gold-accent hover:text-black"
                )}
                disabled={currentPage === 1}
              >
                <ChevronRight size={32} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); goToNextPage(); resetControlsTimeout(); }}
                className={cn(
                  "p-3 bg-black/40 text-white rounded-full backdrop-blur-md pointer-events-auto transition-all transform hover:scale-110 border border-white/5 cursor-pointer",
                  currentPage === 604 ? "opacity-20 cursor-not-allowed" : "hover:bg-gold-accent hover:text-black"
                )}
                disabled={currentPage === 604}
              >
                <ChevronLeft size={32} />
              </button>
            </div>
          )}

          {/* Zoomable Track configured for PDF bounds and centering */}
          <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden">
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit={true}
              wheel={{ step: 0.1 }}
              zoomAnimation={{ animationType: "linear" }}
              doubleClick={{ step: 1.5, mode: "toggle" }}
              onTransform={onZoomChange}
              panning={{ disabled: isLocked }}
              pinch={{ disabled: isLocked }}
            >
              <TransformComponent
                wrapperClass="!w-full !h-full flex items-center justify-center touch-none select-none"
                contentClass="!w-full !h-full flex items-center justify-center select-none"
              >
                {isCheckingPdf ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 border-4 border-gold-accent border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(212,175,55,0.3)]" />
                    <div className="text-gold-accent font-black text-xs uppercase tracking-[0.3em] animate-pulse">جاري التهيئة والتحقق...</div>
                  </div>
                ) : pdfError ? (
                  <div className="p-10 text-center space-y-6 max-w-sm bg-[#00140a] rounded-[2rem] border border-gold-accent/20 z-10 shadow-2xl flex flex-col items-center animate-fade-in">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center">
                      <FileUp size={30} className="text-rose-500 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-rose-500 text-base">تعذر تحميل صفحة المصحف</p>
                      <p className="text-xs text-white/50 leading-relaxed px-2">
                        ملف المصحف الإلكتروني غير متوفر حالياً أو لم يتم تحديثه بنجاح.
                      </p>
                    </div>
                    {/* Native PDF File Upload Box */}
                    <div className="mt-2 w-full">
                      <label className="inline-flex w-full items-center justify-center gap-2 px-5 py-3.5 bg-gold-accent text-emerald-950 font-black text-xs rounded-full cursor-pointer hover:bg-gold-bright active:scale-95 transition-all shadow-[0_4px_15px_rgba(212,175,55,0.3)] select-none">
                        <FileUp size={16} />
                        <span>تصفح ملف PDF يدوياً</span>
                        <input 
                          type="file" 
                          accept="application/pdf" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (localPdfUrl) {
                                URL.revokeObjectURL(localPdfUrl);
                              }
                              setLocalPdfUrl(URL.createObjectURL(file));
                              setPdfError(null);
                            }
                          }} 
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <Document
                    file={resolvedPdfUrl}
                    options={PDF_OPTIONS}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => setPdfError(error.message)}
                    loading={
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-14 h-14 border-4 border-gold-accent border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(212,175,55,0.3)]" />
                        <div className="text-gold-accent font-black text-xs uppercase tracking-[0.3em] animate-pulse">جاري تحميل صفحات المصحف...</div>
                      </div>
                    }
                    className="max-w-full max-h-full flex flex-col items-center justify-center select-none relative w-full h-full"
                  >
                    <AnimatePresence custom={direction} initial={false}>
                      <motion.div
                        key={currentPage}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        style={{ filter: 'none', colorScheme: 'light' }}
                        className={cn(
                          "absolute shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden rounded-2xl border border-white/10 select-none",
                          "bg-[#ffffff]" // Force pure white to ensure exact color fidelity
                        )}
                      >
                        <Page 
                          pageNumber={currentPage} 
                          renderTextLayer={false} 
                          renderAnnotationLayer={false}
                          devicePixelRatio={3} // High resolution rendering
                          width={getPageDimensions().width}
                          scale={getPageDimensions().scale}
                          className="max-w-full object-contain mx-auto select-none pointer-events-none pdf-page-wrapper"
                          loading={
                            <div className="flex flex-col items-center justify-center p-24 gap-3 bg-white w-full h-full min-h-[300px]">
                              <div className="w-10 h-10 border-4 border-gold-accent border-t-transparent rounded-full animate-spin" />
                              <span className="text-[10px] text-emerald-950 font-bold">جاري التهيئة...</span>
                            </div>
                          }
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Background Smart Cache Queue: Render neighboring pages invisible to force browser pre-caching */}
                    <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: '-9999px' }}>
                      {currentPage > 1 && (
                        <Page 
                          pageNumber={currentPage - 1} 
                          renderTextLayer={false} 
                          renderAnnotationLayer={false}
                          devicePixelRatio={1}
                          width={100}
                          scale={1} 
                          className="pdf-page-wrapper"
                        />
                      )}
                      {numPages && currentPage < numPages && (
                        <Page 
                          pageNumber={currentPage + 1} 
                          renderTextLayer={false} 
                          renderAnnotationLayer={false}
                          devicePixelRatio={1}
                          width={100}
                          scale={1} 
                          className="pdf-page-wrapper"
                        />
                      )}
                    </div>
                  </Document>
                )}
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      </main>

      {/* Floating Bottom Navigation And Zoom App Bar */}
      <AnimatePresence>
        {showControls && !isLocked && (
          <motion.footer
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            className="flex-none z-50 p-4 pb-safe bg-[#00140a]/90 backdrop-blur-xl border-t border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-4 max-w-4xl mx-auto w-full no-toggle">
              {/* Zoom controls segment */}
              <div className="flex bg-white/5 border border-white/5 rounded-[1.8rem] p-1 gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleZoomIn(); resetControlsTimeout(); }} 
                  className="w-10 h-10 bg-white/5 rounded-[1.4rem] flex items-center justify-center text-white hover:bg-gold-accent hover:text-black transition-all active:scale-90 cursor-pointer"
                >
                  <ZoomIn size={18} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleResetZoom(); resetControlsTimeout(); }} 
                  className="w-10 h-10 bg-white/5 rounded-[1.4rem] flex items-center justify-center text-white/50 hover:text-gold-accent hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
                  title="إعادة التكبير للأصل"
                >
                  <RotateCcw size={15} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleZoomOut(); resetControlsTimeout(); }} 
                  className="w-10 h-10 bg-white/5 rounded-[1.4rem] flex items-center justify-center text-white hover:bg-gold-accent hover:text-black transition-all active:scale-90 cursor-pointer"
                >
                  <ZoomOut size={18} />
                </button>
              </div>

              {/* Page indicator and tracking progress bar */}
              <div className="flex-1 bg-white/5 border border-white/5 rounded-[1.8rem] p-3 flex flex-col gap-1.5 shadow-inner">
                 <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-gold-accent uppercase tracking-widest leading-none">صفحة {currentPage}</span>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">604 صفحة</span>
                 </div>
                 <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="absolute right-0 top-0 h-full bg-gold-accent rounded-full"
                      animate={{ width: `${(currentPage / 604) * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                 </div>
              </div>

              {/* Index return button */}
              <button 
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="h-12 px-5 rounded-[1.4rem] bg-gradient-to-br from-gold-bright to-gold-accent text-emerald-950 flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all font-black text-xs cursor-pointer"
              >
                <LayoutGrid size={16} />
                <span>الفهرس</span>
              </button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Persistent Elegant Page Bubble (only visible when toolbars are hidden) */}
      <AnimatePresence>
         {!showControls && !isLocked && (
            <motion.div
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#00140a]/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black text-gold-accent shadow-2xl border border-white/5 pointer-events-none tracking-widest"
            >
               صفحة {currentPage} / 604
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
