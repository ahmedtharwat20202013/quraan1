/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft,
  X,
  Plus,
  Compass
} from 'lucide-react';
import { cn } from './lib/utils';
import { AppState } from './types';
import surahsData from './data/surahs.json';

// Components
import Home from './components/Home';
import PrayerSection from './components/PrayerSection';
import QuranSection from './components/QuranSection';
import RecitationsSection from './components/RecitationsSection';
import DuasSection from './components/DuasSection';
import TasbeehSection from './components/TasbeehSection';
import SettingsSection from './components/SettingsSection';
import SurahReader from './components/SurahReader';
import AsmaSection from './components/AsmaSection';
import QuranCardSection from './components/QuranCardSection';
import GlobalMiniPlayer from './components/GlobalMiniPlayer';
import OfflineBanner from './components/ui/OfflineBanner';
import { QuranDataLoader } from './services/quranDataLoader';
import QiblaSection from './components/QiblaSection';
import MosquesSection from './components/MosquesSection';
import DailyVersePickerSection from './components/DailyVersePickerSection';
import TafsirSection from './components/TafsirSection';
import AboutSection from './components/AboutSection';
import { PRESET_VERSES } from './data/verses';

type Screen = 'home' | 'prayer' | 'quran' | 'listen' | 'duas' | 'tasbeeh' | 'settings' | 'reader' | 'qibla' | 'mosques' | 'asma' | 'card' | 'daily-verse-picker' | 'tafsir' | 'about';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');

  const [currentSurahId, setCurrentSurahId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('quran_light_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastRead?.surahId) {
          return parsed.lastRead.surahId;
        }
      }
    } catch (e) {
      console.warn('Failed to parse quran_light_state surahId:', e);
    }
    return 1;
  });

  const [currentPageNumber, setCurrentPageNumber] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('quran_light_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastRead?.pageNumber) {
          return parsed.lastRead.pageNumber;
        }
      }
    } catch (e) {
      console.warn('Failed to parse quran_light_state pageNumber:', e);
    }
    return 1;
  });

  const [isOpenServicesSheet, setIsOpenServicesSheet] = useState<boolean>(false);
  const downloadProgress = null;
  const isDownloaded = true;
  const lastBackPressTime = useRef<number>(0);
  const [showExitToast, setShowExitToast] = useState<boolean>(false);



  useEffect(() => {
    const requestPermissionsOnStartup = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          let geoPerm = await Geolocation.checkPermissions();
          if (geoPerm.location !== 'granted') {
            geoPerm = await Geolocation.requestPermissions();
          }

          // If location is granted, immediately fetch coordinates
          if (geoPerm.location === 'granted') {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              enableLocationFallback: false,
              timeout: 20000,
              maximumAge: 0
            });

            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            localStorage.setItem('quran_gps_coords', JSON.stringify(coords));
          }
        } else {
          // Web browser (localhost) flow
          // Request Geolocation
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                if (lat && lon) {
                  const coords = { latitude: lat, longitude: lon };
                  localStorage.setItem('quran_gps_coords', JSON.stringify(coords));

                  // Attempt reverse lookup for localized Arabic address display
                  let address = 'موقع الويب الحالي';
                  try {
                    const response = await fetch(
                      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ar`,
                      { headers: { 'User-Agent': 'QuranLightApp/1.0' } }
                    );
                    if (response.ok) {
                      const data = await response.json();
                      if (data.display_name) {
                        address = data.display_name;
                      }
                    }
                  } catch (e) {
                    console.warn('Reverse geocoding failed on web:', e);
                  }
                  localStorage.setItem('quran_gps_address', address);
                } else {
                  // Only write fallback if no coordinates exist in localStorage
                  const existingCoords = localStorage.getItem('quran_gps_coords');
                  if (!existingCoords) {
                    const coords = { latitude: 30.0444, longitude: 31.2357 };
                    localStorage.setItem('quran_gps_coords', JSON.stringify(coords));
                    localStorage.setItem('quran_gps_address', 'القاهرة، مصر (الافتراضي)');
                  }
                }
              },
              (err) => {
                console.warn('Browser geolocation failed, using fallback coordinates:', err);
                const existingCoords = localStorage.getItem('quran_gps_coords');
                if (!existingCoords) {
                  const coords = { latitude: 30.0444, longitude: 31.2357 };
                  localStorage.setItem('quran_gps_coords', JSON.stringify(coords));
                  localStorage.setItem('quran_gps_address', 'القاهرة، مصر (الافتراضي)');
                }
              },
              {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
              }
            );
          }
        }
      } catch (err) {
        console.warn('Error requesting startup permissions:', err);
      }
    };

    requestPermissionsOnStartup();
  }, []);

  // Handle native Android back button event
  useEffect(() => {
    let backButtonHandle: any = null;

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', () => {
        // If services sheet is open, close it
        if (isOpenServicesSheet) {
          setIsOpenServicesSheet(false);
          return;
        }

        // Handle screen navigation
        if (currentScreen === 'home') {
          const now = Date.now();
          if (now - lastBackPressTime.current < 2000) {
            if (window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate([100, 50, 100]);
            }
            CapApp.exitApp();
          } else {
            lastBackPressTime.current = now;
            setShowExitToast(true);
            if (window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate(50);
            }
            setTimeout(() => {
              setShowExitToast(false);
            }, 2000);
          }
        } else if (currentScreen === 'reader') {
          setCurrentScreen('quran');
        } else {
          setCurrentScreen('home');
        }
      }).then(handle => {
        backButtonHandle = handle;
      });
    });

    return () => {
      if (backButtonHandle) {
        backButtonHandle.remove();
      }
    };
  }, [currentScreen, isOpenServicesSheet]);

  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('quran_light_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old bookmarks if they exist
        if (parsed.bookmarks) {
          parsed.bookmarks = parsed.bookmarks.map((b: any) => {
            if (b.pageNumber && !b.surahId) {
              const found = surahsData.find(s => b.pageNumber >= s.startPage && b.pageNumber <= s.endPage);
              if (found) {
                return {
                  surahId: found.id,
                  pageInSurah: b.pageNumber - found.startPage + 1,
                  surahName: found.name,
                  timestamp: b.timestamp
                };
              }
            }
            return b;
          });
        }
        return {
          lastRead: null,
          favorites: [],
          fontSize: 18,
          ...parsed,
          bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : []
        };
      }
    } catch (e) {
      console.warn('Failed to parse quran_light_state:', e);
    }
    return {
      lastRead: null,
      bookmarks: [],
      favorites: [],
      fontSize: 18,
    };
  });

  useEffect(() => {
    localStorage.setItem('quran_light_state', JSON.stringify(state));
  }, [state]);

  // Randomize daily verse on mount and on app resume
  useEffect(() => {
    const randomizeVerse = () => {
      setState(prev => {
        const currentText = prev.dailyVerse?.text;
        const pool = PRESET_VERSES.filter(v => v.text !== currentText);
        const actualPool = pool.length > 0 ? pool : PRESET_VERSES;
        const randomIndex = Math.floor(Math.random() * actualPool.length);
        const chosen = actualPool[randomIndex];
        return { ...prev, dailyVerse: chosen };
      });
    };

    // Randomize on initial load
    randomizeVerse();

    // Randomize when app returns from background
    let stateChangeHandle: any = null;
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appStateChange', (appState) => {
        if (appState.isActive) {
          randomizeVerse();
        }
      }).then(handle => {
        stateChangeHandle = handle;
      });
    });

    return () => {
      if (stateChangeHandle) {
        stateChangeHandle.remove();
      }
    };
  }, []);

  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top on screen change with high resilience
  useEffect(() => {
    const doScroll = () => {
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTo({ top: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, behavior: 'instant' });
    };

    doScroll();
    
    // Staggered timeouts to ensure it scrolls to top even if rendering is delayed
    const timer1 = setTimeout(doScroll, 10);
    const timer2 = setTimeout(doScroll, 100);
    const frameId = requestAnimationFrame(doScroll);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      cancelAnimationFrame(frameId);
    };
  }, [currentScreen]);

  // Sync page changes to state.lastRead
  useEffect(() => {
    if (currentSurahId && currentPageNumber) {
      setState(prev => {
        if (
          prev.lastRead?.surahId === currentSurahId && 
          prev.lastRead?.pageNumber === currentPageNumber
        ) {
          return prev;
        }
        const currentSurah = surahsData.find(s => s.id === currentSurahId);
        const name = currentSurah ? currentSurah.name : 'القرآن الكريم';
        return {
          ...prev,
          lastRead: {
            surahId: currentSurahId,
            pageNumber: currentPageNumber,
            surahName: name,
            timestamp: Date.now()
          }
        };
      });
    }
  }, [currentSurahId, currentPageNumber]);

  const [targetAyah, setTargetAyah] = useState<number | undefined>(undefined);
  const [targetWordIndex, setTargetWordIndex] = useState<number | undefined>(undefined);

  const handleSurahClick = useCallback(async (surahId: number, targetPageNum?: number, targetAyahNum?: number, targetWordIdx?: number) => {
    setCurrentSurahId(surahId);
    setTargetAyah(targetAyahNum);
    setTargetWordIndex(targetWordIdx);

    let finalPageNum = targetPageNum;
    if (!finalPageNum) {
      if (targetAyahNum) {
        finalPageNum = await QuranDataLoader.getPageForAyah(surahId, targetAyahNum);
      } else {
        finalPageNum = await QuranDataLoader.getPageForSurah(surahId);
      }
    }

    setCurrentPageNumber(finalPageNum);
    setPreviousScreen(currentScreen);
    setCurrentScreen('reader');
  }, [currentScreen]);

  const handleToggleBookmark = useCallback((surahId: number, pageInSurah: number) => {
    setState(prev => {
      const exists = prev.bookmarks.some(b => b.surahId === surahId && b.pageInSurah === pageInSurah);
      let updatedBookmarks;
      if (exists) {
        updatedBookmarks = prev.bookmarks.filter(b => !(b.surahId === surahId && b.pageInSurah === pageInSurah));
      } else {
        const surah = surahsData.find(s => s.id === surahId);
        const name = surah ? surah.name : 'القرآن الكريم';
        updatedBookmarks = [
          ...prev.bookmarks,
          {
            surahId,
            pageInSurah,
            surahName: name,
            timestamp: Date.now()
          }
        ];
      }
      return {
        ...prev,
        bookmarks: updatedBookmarks
      };
    });
  }, []);

  // Custom navigation handler that automatically shuts the bottom sheet
  const handleNavigation = (screen: Screen) => {
    setIsOpenServicesSheet(false);
    setCurrentScreen(screen);
  };

  return (
    <div 
      dir="rtl"
      className={cn(
        "min-h-screen flex flex-col w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto relative shadow-2xl transition-all duration-300",
        "bg-[#011209]"
      )}
    >
      {/* Offline Status Check Banner */}
      <OfflineBanner />

      {/* Dynamic Background Glow Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[80%] h-[50%] bg-gold-accent/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[80%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Main Container Content */}
      <main ref={mainRef} className="flex-1 relative z-10 overflow-y-auto pb-32">
        <AnimatePresence mode="wait">


          {currentScreen === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <Home 
                state={state} 
                onNavigate={(scr) => handleNavigation(scr as Screen)} 
                onSurahClick={handleSurahClick}
                downloadProgress={downloadProgress}
                isDownloaded={isDownloaded}
              />
            </motion.div>
          )}

          {currentScreen === 'prayer' && (
            <motion.div
              key="prayer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <PrayerSection />
            </motion.div>
          )}

          {currentScreen === 'quran' && (
            <motion.div
              key="quran"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <QuranSection 
                onSurahClick={handleSurahClick} 
                bookmarks={state.bookmarks || []}
                onRemoveBookmark={handleToggleBookmark}
                downloadProgress={downloadProgress}
                isDownloaded={isDownloaded}
              />
            </motion.div>
          )}

          {currentScreen === 'listen' && (
            <motion.div
              key="listen"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <RecitationsSection />
            </motion.div>
          )}

          {currentScreen === 'reader' && (
            <motion.div
              key="reader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 bg-black"
            >
              <SurahReader 
                key={`surah_reader_${currentSurahId}_${currentPageNumber}_${targetAyah || 0}`}
                initialPageNumber={currentPageNumber}
                initialTargetAyah={targetAyah}
                initialTargetWordIndex={targetWordIndex}
                onBack={() => {
                  setTargetAyah(undefined);
                  setTargetWordIndex(undefined);
                  setCurrentScreen('quran');
                }}
                bookmarks={state.bookmarks || []}
                onToggleBookmark={handleToggleBookmark}
                onPageChange={(sId, pageNum) => {
                  setCurrentSurahId(sId);
                  setCurrentPageNumber(pageNum);
                }}
              />
            </motion.div>
          )}

          {currentScreen === 'duas' && (
            <motion.div
              key="duas"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="p-6"
            >
              <div className="pb-6">
                <button 
                  onClick={() => handleNavigation('home')}
                  className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white"
                >
                  <ChevronLeft size={14} className="rotate-180" />
                  رجوع للرئيسية
                </button>
                <DuasSection />
              </div>
            </motion.div>
          )}

          {currentScreen === 'asma' && (
            <motion.div
              key="asma"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="p-6"
            >
              <div className="pb-6">
                <button 
                  onClick={() => handleNavigation('home')}
                  className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white"
                >
                  <ChevronLeft size={14} className="rotate-180" />
                  رجوع للرئيسية
                </button>
                <AsmaSection />
              </div>
            </motion.div>
          )}

          {currentScreen === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="p-6"
            >
              <div className="pb-6">
                <button 
                  onClick={() => handleNavigation('home')}
                  className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white"
                >
                  <ChevronLeft size={14} className="rotate-180" />
                  رجوع للرئيسية
                </button>
                <QuranCardSection />
              </div>
            </motion.div>
          )}

          {currentScreen === 'qibla' && (
            <motion.div
              key="qibla"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="p-6"
            >
              <div className="pb-6">
                <QiblaSection onBack={() => handleNavigation('home')} />
              </div>
            </motion.div>
          )}



          {currentScreen === 'tasbeeh' && (
            <motion.div
              key="tasbeeh"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6"
            >
              <div className="pb-6">
                <button 
                  onClick={() => handleNavigation('home')}
                  className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white"
                >
                  <ChevronLeft size={14} className="rotate-180" />
                  رجوع للرئيسية
                </button>
                <TasbeehSection />
              </div>
            </motion.div>
          )}

          {currentScreen === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <SettingsSection 
                state={state} 
                setState={setState} 
                onBack={() => handleNavigation('home')} 
                onChooseDailyVerse={() => handleNavigation('daily-verse-picker')}
                onOpenAbout={() => handleNavigation('about')}
              />
            </motion.div>
          )}

          {currentScreen === 'daily-verse-picker' && (
            <motion.div
              key="daily-verse-picker"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="p-6"
            >
              <DailyVersePickerSection 
                currentVerse={state.dailyVerse}
                onSelect={(verse) => {
                  setState(prev => ({ ...prev, dailyVerse: verse }));
                  handleNavigation('settings');
                }}
                onBack={() => handleNavigation('settings')}
              />
            </motion.div>
          )}

          {currentScreen === 'mosques' && (
            <motion.div
              key="mosques"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="p-6"
            >
              <MosquesSection onBack={() => handleNavigation('home')} />
            </motion.div>
          )}

          {currentScreen === 'tafsir' && (
            <motion.div
              key="tafsir"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="p-6"
            >
              <TafsirSection onBack={() => handleNavigation('home')} />
            </motion.div>
          )}

          {currentScreen === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              className="p-6"
            >
              <AboutSection onBack={() => handleNavigation('settings')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Mini Player for audio recitations */}
      {currentScreen !== 'reader' && <GlobalMiniPlayer />}

      {/* Drawer / Service Launcher Overlay (Pristine Bottom Sheet) */}
      <AnimatePresence>
        {isOpenServicesSheet && (
          /* Backdrop */
          <motion.div
            key="services-sheet-backdrop"
            id="services-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpenServicesSheet(false)}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
          />
        )}
        {isOpenServicesSheet && (
          /* Sheet itself */
          <motion.div
            key="services-sheet"
            id="services-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 w-full max-w-md md:max-w-2xl lg:max-w-3xl mx-auto z-50 bg-gradient-to-b from-[#011B0D]/95 to-[#001006]/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t-2 border-gold-accent/50 p-6 space-y-6 shadow-2xl shadow-emerald-950/60"
          >
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1 bg-gold-accent/40 rounded-full mx-auto" />

            {/* Title & Close Header */}
            <div className="flex justify-between items-center pb-2 border-b border-gold-accent/20">
              <div>
                <h3 className="text-xl font-black text-gold-accent font-sans tracking-wide drop-shadow-md">الخدمات الإسلامية</h3>
                <p className="text-xs text-amber-200/90 font-bold tracking-wider mt-0.5">مجموعة متكاملة من الخدمات والأدوات الإيمانية</p>
              </div>
              <button 
                onClick={() => setIsOpenServicesSheet(false)}
                className="p-2 rounded-full bg-emerald-950/40 border border-gold-accent/30 text-gold-accent hover:bg-gold-accent/20 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Services Grid inside Bottom Sheet */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* 1. Duas & Adhkar */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('duas')}
                className="p-6 rounded-[2rem] bg-gradient-to-b from-[#022814] to-[#011B0D] border-2 border-gold-accent/35 hover:border-emerald-400/70 flex flex-col items-center justify-center text-center gap-4 transition-all group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 rounded-2xl border border-gold-accent/20 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-gold-accent/40 group-hover:bg-islamic-green/20 flex items-center justify-center bg-islamic-dark/60">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" fill="none" stroke="url(#nav-gold-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    <path d="M6 8h2M16 8h2M6 12h2M16 12h2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gold-accent group-hover:text-amber-300 transition-colors">الأذكار والتحصين</h4>
                  <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent mt-2 mx-auto" />
                  <p className="text-[10px] text-amber-100/70 group-hover:text-amber-100 transition-colors mt-2">أذكار الصباح، المساء، والنوم</p>
                </div>
              </motion.button>

              {/* 2. Electronic Tasbeeh */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('tasbeeh')}
                className="p-6 rounded-[2rem] bg-gradient-to-b from-[#022814] to-[#011B0D] border-2 border-gold-accent/35 hover:border-emerald-400/70 flex flex-col items-center justify-center text-center gap-4 transition-all group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 rounded-2xl border border-gold-accent/30 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-gold-accent/50 group-hover:bg-emerald-950/40 flex items-center justify-center bg-[#011209]/80">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" fill="none" stroke="url(#nav-gold-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {/* Tally counter outer body */}
                    <rect x="5" y="4" width="14" height="16" rx="4" />
                    {/* LCD Display screen box */}
                    <rect x="8" y="7" width="8" height="4" rx="1" />
                    {/* LCD screen inside details (lines representing digits) */}
                    <path d="M10 9h4" strokeWidth="1" />
                    {/* Large count trigger button */}
                    <circle cx="12" cy="15" r="2" />
                    {/* Reset button */}
                    <circle cx="16" cy="15" r="0.75" fill="url(#nav-gold-grad)" stroke="none" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gold-accent group-hover:text-amber-300 transition-colors">المسبحة الذكية</h4>
                  <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent mt-2 mx-auto" />
                  <p className="text-[10px] text-amber-100/70 group-hover:text-amber-100 transition-colors mt-2">سبح واحتسب الأجر مع الجهاز</p>
                </div>
              </motion.button>

              {/* 3. Qibla Compass */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('qibla')}
                className="p-6 rounded-[2rem] bg-gradient-to-b from-[#022814] to-[#011B0D] border-2 border-gold-accent/35 hover:border-emerald-400/70 flex flex-col items-center justify-center text-center gap-4 transition-all group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 rounded-2xl border border-gold-accent/30 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-gold-accent/50 group-hover:bg-emerald-950/40 flex items-center justify-center bg-[#011209]/80">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" fill="none" stroke="url(#nav-gold-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M16.2 7.8l-2.8 7-7 2.8 2.8-7 7-2.8z" fill="url(#nav-gold-grad)" fillOpacity="0.2" />
                    <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gold-accent group-hover:text-amber-300 transition-colors">اتجاه القبلة</h4>
                  <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent mt-2 mx-auto" />
                  <p className="text-[10px] text-amber-100/70 group-hover:text-amber-100 transition-colors mt-2">بوصلة تفاعلية ومعايرة دقيقة</p>
                </div>
              </motion.button>

              {/* 4. Nearby Mosques */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('mosques')}
                className="p-6 rounded-[2rem] bg-gradient-to-b from-[#022814] to-[#011B0D] border-2 border-gold-accent/35 hover:border-emerald-400/70 flex flex-col items-center justify-center text-center gap-4 transition-all group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 rounded-2xl border border-gold-accent/30 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-gold-accent/50 group-hover:bg-emerald-950/40 flex items-center justify-center bg-[#011209]/80">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" fill="none" stroke="url(#nav-gold-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M6 21v-7c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4v7" />
                    <path d="M10 21v-4c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v4" />
                    <path d="M12 10V5M12 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gold-accent group-hover:text-amber-300 transition-colors">المساجد القريبة</h4>
                  <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent mt-2 mx-auto" />
                  <p className="text-[10px] text-amber-100/70 group-hover:text-amber-100 transition-colors mt-2">اعرض أقرب المساجد حولك بالخريطة</p>
                </div>
              </motion.button>

              {/* 5. Asma Al Husna */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('asma')}
                className="p-6 rounded-[2rem] bg-gradient-to-b from-[#022814] to-[#011B0D] border-2 border-gold-accent/35 hover:border-emerald-400/70 flex flex-col items-center justify-center text-center gap-4 transition-all group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 rounded-2xl border border-gold-accent/30 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-gold-accent/50 group-hover:bg-emerald-950/40 flex items-center justify-center bg-[#011209]/80">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" fill="none" stroke="url(#nav-gold-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l2.5 3.5 4 .5-1.5 4 2.5 3.5-3.5 2.5-.5 4-4-1.5-3.5 2.5-2.5-3.5-4-.5 1.5-4L2 9.5l3.5-2.5.5-4 4 1.5z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gold-accent group-hover:text-amber-300 transition-colors">أسماء الله الحسنى</h4>
                  <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent mt-2 mx-auto" />
                  <p className="text-[10px] text-amber-100/70 group-hover:text-amber-100 transition-colors mt-2">تأمل أسماء الله ومعانيها العظيمة</p>
                </div>
              </motion.button>

              {/* 6. Islamic Cards Generator */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('card')}
                className="p-6 rounded-[2rem] bg-gradient-to-b from-[#022814] to-[#011B0D] border-2 border-gold-accent/35 hover:border-emerald-400/70 flex flex-col items-center justify-center text-center gap-4 transition-all group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 rounded-2xl border border-gold-accent/30 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-gold-accent/50 group-hover:bg-emerald-950/40 flex items-center justify-center bg-[#011209]/80">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" fill="none" stroke="url(#nav-gold-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M12 8v8M8 12h8" />
                    <circle cx="12" cy="12" r="5" strokeOpacity="0.2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gold-accent group-hover:text-amber-300 transition-colors">البطاقات الإسلامية</h4>
                  <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent mt-2 mx-auto" />
                  <p className="text-[10px] text-amber-100/70 group-hover:text-amber-100 transition-colors mt-2">صمم بطاقة بالآيات الكريمة وشاركها كصورة</p>
                </div>
              </motion.button>

              {/* 7. Tafsir Section */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('tafsir')}
                className="col-span-2 p-6 rounded-[2rem] bg-gradient-to-b from-[#022814] to-[#011B0D] border-2 border-gold-accent/35 hover:border-emerald-400/70 flex flex-col items-center justify-center text-center gap-4 transition-all group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 rounded-2xl border border-gold-accent/20 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:border-gold-accent/40 group-hover:bg-islamic-green/20 flex items-center justify-center bg-islamic-dark/60">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 transition-transform group-hover:scale-110 duration-300" fill="none" stroke="url(#nav-gold-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="url(#nav-gold-grad)" fillOpacity="0.2" />
                    <path d="M6 6h10M6 10h10" strokeOpacity="0.5" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gold-accent group-hover:text-amber-300 transition-colors">تفسير القرآن الكريم</h4>
                  <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/80 to-transparent mt-2 mx-auto" />
                  <p className="text-[10px] text-amber-100/70 group-hover:text-amber-100 transition-colors mt-2">تصفح وقراءة آيات القرآن بالتفاسير السبعة المعتمدة</p>
                </div>
              </motion.button>
            </div>

            {/* Floating Scroll Indicator Arrow at bottom-left */}
            <div className="absolute bottom-6 left-6 animate-bounce text-gold-accent/90 bg-black/75 p-2.5 rounded-full border border-gold-accent/25 pointer-events-none z-30 flex items-center justify-center shadow-2xl shadow-black/60">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      {currentScreen !== 'reader' && (
        <div id="bottom-main-nav" className="fixed bottom-6 sm:bottom-8 left-0 right-0 w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto z-40 px-4 sm:px-6">
          <nav className="bg-[#121212]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            {/* Shared SVG Definitions for Navigation Icons */}
            <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
              <defs>
                <linearGradient id="nav-gold-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFE259"/>
                  <stop offset="50%" stopColor="#D4AF37"/>
                  <stop offset="100%" stopColor="#FFA751"/>
                </linearGradient>
                <filter id="nav-glow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#D4AF37" floodOpacity="0.4"/>
                </filter>
              </defs>
            </svg>

            {/* 1. Home Tab Item */}
            <button
              onClick={() => handleNavigation('home')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative rounded-3xl group",
                currentScreen === 'home' ? "text-gold-accent" : "text-gold-accent/40 hover:text-gold-accent/70"
              )}
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 relative z-10 transition-all duration-300 group-hover:scale-110 group-active:scale-95" fill="none" xmlns="http://www.w3.org/2000/svg" filter={currentScreen === 'home' ? "url(#nav-glow)" : "none"}>
                <path d="M12 3 L3 11 H6 V20 H18 V11 H21 Z" fill={currentScreen === 'home' ? "url(#nav-gold-grad)" : "url(#nav-gold-grad)"} fillOpacity={currentScreen === 'home' ? 0.95 : 0.4} />
                <path d="M9 20 V13 H15 V20 Z" fill="#121212" fillOpacity={0.6} />
              </svg>
              <span className="text-[9px] font-black z-10 text-gold-accent/80">الرئيسية</span>
              {currentScreen === 'home' && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-gradient-to-t from-gold-accent/15 via-white/[0.03] to-transparent border-t border-gold-accent/20 rounded-2xl -z-0 shadow-[0_2px_12px_rgba(212,175,55,0.05)]" />
              )}
            </button>

            {/* 2. Prayer Tab Item */}
            <button
              onClick={() => handleNavigation('prayer')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative rounded-3xl group",
                currentScreen === 'prayer' ? "text-gold-accent" : "text-gold-accent/40 hover:text-gold-accent/70"
              )}
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 relative z-10 transition-all duration-300 group-hover:scale-110 group-active:scale-95" fill="none" xmlns="http://www.w3.org/2000/svg" filter={currentScreen === 'prayer' ? "url(#nav-glow)" : "none"}>
                <circle cx="12" cy="12" r="9" stroke={currentScreen === 'prayer' ? "url(#nav-gold-grad)" : "url(#nav-gold-grad)"} strokeWidth="2.5" strokeOpacity={currentScreen === 'prayer' ? 1 : 0.3} fill="#121212" fillOpacity={0.3} />
                <path d="M12 7 V12 L15 14" stroke={currentScreen === 'prayer' ? "#FFE259" : "#FFE259"} strokeWidth="2" strokeLinecap="round" strokeOpacity={currentScreen === 'prayer' ? 1 : 0.4} />
              </svg>
              <span className="text-[9px] font-black z-10 text-gold-accent/80">الصلاة</span>
              {currentScreen === 'prayer' && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-gradient-to-t from-gold-accent/15 via-white/[0.03] to-transparent border-t border-gold-accent/20 rounded-2xl -z-0 shadow-[0_2px_12px_rgba(212,175,55,0.05)]" />
              )}
            </button>

            {/* 3. Central FAB Launcher Button */}
            <div className="flex-1 flex justify-center -translate-y-4 relative">
              {/* Pulsing ring behind launcher */}
              <div className="absolute top-0 w-14 h-14 rounded-full bg-gold-accent/20 animate-ping -z-10" />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsOpenServicesSheet(!isOpenServicesSheet)}
                className="w-14 h-14 bg-gradient-to-br from-gold-bright via-gold-accent to-amber-600 rounded-full flex items-center justify-center text-[#031B10] shadow-[0_10px_30px_rgba(212,175,55,0.4)] border-4 border-neutral-950 focus:outline-none relative z-50 shrink-0 hover:shadow-[0_10px_35px_rgba(212,175,55,0.6)] transition-all"
              >
                <Plus size={28} className={cn("transition-transform duration-500 ease-out", isOpenServicesSheet ? "rotate-135 scale-110" : "rotate-0")} strokeWidth={3.5} />
              </motion.button>
            </div>

            {/* 4. Quran Tab Item */}
            <button
              onClick={() => handleNavigation('quran')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative rounded-3xl group",
                currentScreen === 'quran' ? "text-gold-accent" : "text-gold-accent/40 hover:text-gold-accent/70"
              )}
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 relative z-10 transition-all duration-300 group-hover:scale-110 group-active:scale-95" fill="none" xmlns="http://www.w3.org/2000/svg" filter={currentScreen === 'quran' ? "url(#nav-glow)" : "none"}>
                <path d="M4 19 C4 17 6 15 12 15 C18 15 20 17 20 19 V5 C20 3 18 1 12 1 C6 1 4 3 4 5 Z" fill={currentScreen === 'quran' ? "url(#nav-gold-grad)" : "url(#nav-gold-grad)"} fillOpacity={currentScreen === 'quran' ? 0.95 : 0.3} />
                <path d="M12 1 V15" stroke="#121212" strokeWidth="1.5" />
              </svg>
              <span className="text-[9px] font-black z-10 text-gold-accent/80">المصحف</span>
              {currentScreen === 'quran' && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-gradient-to-t from-gold-accent/15 via-white/[0.03] to-transparent border-t border-gold-accent/20 rounded-2xl -z-0 shadow-[0_2px_12px_rgba(212,175,55,0.05)]" />
              )}
            </button>

            {/* 5. Listening Tab Item */}
            <button
              onClick={() => handleNavigation('listen')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative rounded-3xl group",
                currentScreen === 'listen' ? "text-gold-accent" : "text-gold-accent/40 hover:text-gold-accent/70"
              )}
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 relative z-10 transition-all duration-300 group-hover:scale-110 group-active:scale-95" fill="none" xmlns="http://www.w3.org/2000/svg" filter={currentScreen === 'listen' ? "url(#nav-glow)" : "none"}>
                <path d="M12 3 A 9 9 0 0 0 3 12 V 17 C 3 18.5, 4.5 20, 6 20 H 7 V 14 H 5 V 12 A 7 7 0 0 1 19 12 V 14 H 17 V 20 H 18 C 19.5 20, 21 18.5, 21 17 V 12 A 9 9 0 0 0 12 3 Z" fill={currentScreen === 'listen' ? "url(#nav-gold-grad)" : "url(#nav-gold-grad)"} fillOpacity={currentScreen === 'listen' ? 0.95 : 0.3} />
                <circle cx="6" cy="17" r="1.5" fill={currentScreen === 'listen' ? "#FFA751" : "#FFA751"} />
                <circle cx="18" cy="17" r="1.5" fill={currentScreen === 'listen' ? "#FFA751" : "#FFA751"} />
              </svg>
              <span className="text-[9px] font-black z-10 text-gold-accent/80">الاستماع</span>
              {currentScreen === 'listen' && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-gradient-to-t from-gold-accent/15 via-white/[0.03] to-transparent border-t border-gold-accent/20 rounded-2xl -z-0 shadow-[0_2px_12px_rgba(212,175,55,0.05)]" />
              )}
            </button>
          </nav>
        </div>
      )}
      {/* Exit toast notification for native Android back button */}
      <AnimatePresence>
        {showExitToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-950/95 backdrop-blur-md border border-gold-accent/20 px-6 py-3 rounded-full shadow-2xl flex items-center justify-center gap-2 pointer-events-none"
          >
            <span className="text-xs font-bold text-white tracking-wide">اضغط مرة أخرى للخروج</span>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
