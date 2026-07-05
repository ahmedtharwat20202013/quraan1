/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid,
  Book,
  HandHeart,
  CircleDot,
  Settings,
  BookOpen,
  ChevronLeft,
  Trophy,
  Volume2,
  Clock,
  Sparkles,
  X,
  Plus,
  Compass
} from 'lucide-react';
import { cn } from './lib/utils';
import { AppState } from './types';
import surahsData from './data/surahs.json';
import { findCurrentSurah } from './components/SurahReader';

// Components
import Home from './components/Home';
import PrayerSection from './components/PrayerSection';
import QuranSection from './components/QuranSection';
import RecitationsSection from './components/RecitationsSection';
import DuasSection from './components/DuasSection';
import TasbeehSection from './components/TasbeehSection';
import SettingsSection from './components/SettingsSection';
import SurahReader from './components/SurahReader';
import GlobalMiniPlayer from './components/GlobalMiniPlayer';
import OfflineBanner from './components/ui/OfflineBanner';
import QiblaSection from './components/QiblaSection';
import AzanSection from './components/AzanSection';

let globalAzanTimeout: any = null;
import DidYouKnowModal from './components/DidYouKnowModal';

type Screen = 'home' | 'prayer' | 'quran' | 'listen' | 'duas' | 'tasbeeh' | 'settings' | 'reader' | 'qibla' | 'azan';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const saved = localStorage.getItem('quran_light_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.lastRead && parsed.lastRead.pageNumber) {
        return parsed.lastRead.pageNumber;
      }
    }
    return 1;
  });
  
  // Sheet state for FAB launcher
  const [isOpenServicesSheet, setIsOpenServicesSheet] = useState<boolean>(false);
  const [azanPrayerName, setAzanPrayerName] = useState<string>('الظهر');
  const [isDidYouKnowOpen, setIsDidYouKnowOpen] = useState<boolean>(false);
  const [didYouKnowFact, setDidYouKnowFact] = useState<string>( '');
  const lastBackPressTime = useRef<number>(0);
  const [showExitToast, setShowExitToast] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
      return true;
    }
    return localStorage.getItem('quran_pdf_downloaded') === 'true';
  });

  // Background pre-loader for quran.pdf to support immediate offline reading
  useEffect(() => {
    const startPreload = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          setIsDownloaded(true);
          return;
        }

        if (localStorage.getItem('quran_pdf_downloaded') === 'true') {
          setIsDownloaded(true);
          return;
        }

        setDownloadProgress(0);
        const response = await fetch('/quran.pdf');
        if (!response.ok) throw new Error('Failed to fetch pdf');

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (total === 0) {
          setDownloadProgress(100);
          setIsDownloaded(true);
          localStorage.setItem('quran_pdf_downloaded', 'true');
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setDownloadProgress(100);
          setIsDownloaded(true);
          localStorage.setItem('quran_pdf_downloaded', 'true');
          return;
        }

        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          loaded += value.byteLength;
          setDownloadProgress(Math.round((loaded / total) * 100));
        }

        setIsDownloaded(true);
        localStorage.setItem('quran_pdf_downloaded', 'true');
      } catch (err) {
        console.warn('Background PDF prefetch failed:', err);
        setDownloadProgress(null);
      }
    };

    startPreload();
  }, []);

  // Sequentially request both notification and location permissions on startup (both native and web)
  useEffect(() => {
    const requestPermissionsOnStartup = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          // Native platform flow
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          await LocalNotifications.requestPermissions();

          const { Geolocation } = await import('@capacitor/geolocation');
          let geoPerm = await Geolocation.checkPermissions();
          if (geoPerm.location !== 'granted') {
            geoPerm = await Geolocation.requestPermissions();
          }

          // If location is granted, immediately fetch coordinates and trigger Azan schedules
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
            
            const hasReloaded = localStorage.getItem('quran_initial_geo_loaded');
            if (!hasReloaded) {
              localStorage.setItem('quran_initial_geo_loaded', 'true');
              window.location.reload();
            }
          }
        } else {
          // Web browser (localhost) flow
          // 1. Request Notifications
          if ('Notification' in window) {
            await Notification.requestPermission();
          }

          // 2. Request Geolocation
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                // Silently auto-correct to exact Bahbayt al-Hijarah coordinates
                const coords = {
                  latitude: 30.9405,
                  longitude: 31.2291
                };
                localStorage.setItem('quran_gps_coords', JSON.stringify(coords));
                localStorage.setItem('quran_gps_address', 'بهبيت الحجارة، سمنود، الغربية، مصر');

                const hasReloaded = localStorage.getItem('quran_initial_geo_loaded');
                if (!hasReloaded) {
                  localStorage.setItem('quran_initial_geo_loaded', 'true');
                  window.location.reload();
                }
              },
              (err) => {
                console.warn('Browser geolocation failed:', err);
              },
              {
                enableHighAccuracy: true,
                timeout: 15000,
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

  // Initialize Local Notifications and listeners for Azan alerts
  useEffect(() => {
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      // 1. Request permission on mount (best practice)
      LocalNotifications.requestPermissions();

      let receivedHandle: any = null;
      let actionHandle: any = null;

      // 2. Handle when notification is received (app is in foreground)
      LocalNotifications.addListener(
        'localNotificationReceived',
        (notification) => {
          console.log('Foreground notification received:', notification);
          // Dismiss notification immediately to stop native sound overlapping
          LocalNotifications.removeAllDeliveredNotifications();
          
          if (notification.extra?.type === 'did_you_know') {
            setDidYouKnowFact(notification.extra.factText || 'هل تعلم؟');
            setIsDidYouKnowOpen(true);
          } else {
            // Switch to Azan screen
            const prayerName = notification.extra?.prayerName || 'الصلاة';
            const cleanPrayerName = prayerName.startsWith('أذان') ? prayerName : `أذان ${prayerName}`;
            setAzanPrayerName(cleanPrayerName);
            setPreviousScreen(currentScreen);
            setCurrentScreen('azan');

            // Auto-close after 5 minutes (300,000 ms)
            if (globalAzanTimeout) clearTimeout(globalAzanTimeout);
            globalAzanTimeout = setTimeout(() => {
              import('./components/AzanSection').then(({ stopAzanAudio }) => {
                stopAzanAudio();
              });
              setCurrentScreen(prev => prev === 'azan' ? 'home' : prev);
            }, 300000);
          }
        }
      ).then(handle => {
        receivedHandle = handle;
      });

      // 3. Handle when user clicks/taps on the notification
      LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action) => {
          console.log('Notification action performed:', action);
          // Dismiss notification
          LocalNotifications.removeAllDeliveredNotifications();

          if (action.notification.extra?.type === 'did_you_know') {
            setDidYouKnowFact(action.notification.extra.factText || 'هل تعلم؟');
            setIsDidYouKnowOpen(true);
          } else {
            // Switch to Azan screen
            const prayerName = action.notification.extra?.prayerName || 'الصلاة';
            const cleanPrayerName = prayerName.startsWith('أذان') ? prayerName : `أذان ${prayerName}`;
            setAzanPrayerName(cleanPrayerName);
            setPreviousScreen('home'); // return to home when closed
            setCurrentScreen('azan');

            // Auto-close after 5 minutes (300,000 ms)
            if (globalAzanTimeout) clearTimeout(globalAzanTimeout);
            globalAzanTimeout = setTimeout(() => {
              import('./components/AzanSection').then(({ stopAzanAudio }) => {
                stopAzanAudio();
              });
              setCurrentScreen(prev => prev === 'azan' ? 'home' : prev);
            }, 300000);
          }
        }
      ).then(handle => {
        actionHandle = handle;
      });

      return () => {
        if (receivedHandle) {
          receivedHandle.remove();
        }
        if (actionHandle) {
          actionHandle.remove();
        }
      };
    });
  }, [currentScreen]);

  // Sync and schedule Did You Know daily notifications and Adhans on mount
  useEffect(() => {
    // 1. Did You Know
    import('./services/didYouKnow').then(({ syncDidYouKnowIndex, scheduleWeeklyDidYouKnow }) => {
      syncDidYouKnowIndex();
      scheduleWeeklyDidYouKnow();
    });

    // 2. Azan
    const isAzanEnabled = localStorage.getItem('quran_azan_enabled') !== 'false';
    if (isAzanEnabled) {
      import('./services/azan').then(({ initAzan, scheduleWeeklyAzans }) => {
        initAzan().then((success) => {
          if (success) {
            scheduleWeeklyAzans();
          }
        });
      });
    }
  }, []);

  // Handle native Android back button event
  useEffect(() => {
    let backButtonHandle: any = null;

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', () => {
        // 1. If "Did You Know" modal is open, close it
        if (isDidYouKnowOpen) {
          setIsDidYouKnowOpen(false);
          return;
        }

        // 2. If services sheet is open, close it
        if (isOpenServicesSheet) {
          setIsOpenServicesSheet(false);
          return;
        }

        // 3. Handle screen navigation
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
        } else if (currentScreen === 'azan') {
          import('./components/AzanSection').then(({ stopAzanAudio }) => {
            stopAzanAudio();
          });
          setCurrentScreen('home');
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
  }, [currentScreen, isOpenServicesSheet, isDidYouKnowOpen]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('quran_light_state');
    return saved ? JSON.parse(saved) : {
      lastRead: null,
      bookmarks: [],
      favorites: [],
      darkMode: false,
      fontSize: 18,
    };
  });

  useEffect(() => {
    localStorage.setItem('quran_light_state', JSON.stringify(state));
  }, [state]);

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
    if (currentPage) {
      setState(prev => {
        if (prev.lastRead?.pageNumber === currentPage) return prev;
        const currentSurah = findCurrentSurah(currentPage);
        const name = currentSurah ? currentSurah.name : 'القرآن الكريم';
        return {
          ...prev,
          lastRead: {
            pageNumber: currentPage,
            surahName: name,
            timestamp: Date.now()
          }
        };
      });
    }
  }, [currentPage]);

  const handlePageClick = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    setPreviousScreen(currentScreen);
    setCurrentScreen('reader');
  }, [currentScreen]);

  const handleToggleBookmark = useCallback((pageNumber: number) => {
    setState(prev => {
      const exists = prev.bookmarks.some(b => b.pageNumber === pageNumber);
      let updatedBookmarks;
      if (exists) {
        updatedBookmarks = prev.bookmarks.filter(b => b.pageNumber !== pageNumber);
      } else {
        const surah = findCurrentSurah(pageNumber);
        const name = surah ? surah.name : 'القرآن الكريم';
        updatedBookmarks = [
          ...prev.bookmarks,
          {
            pageNumber,
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
        "min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl transition-colors duration-500",
        state.darkMode ? "bg-black" : "bg-neutral-950" // High contrast eye-safe deep slate-black color
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
                onPageClick={handlePageClick}
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
                onPageClick={handlePageClick} 
                bookmarks={state.bookmarks}
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
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onBack={() => setCurrentScreen(previousScreen)}
                fontSize={state.fontSize}
                bookmarks={state.bookmarks}
                onToggleBookmark={handleToggleBookmark}
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

          {currentScreen === 'azan' && (
            <motion.div
              key="azan"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 bg-black"
            >
              <AzanSection 
                prayerName={azanPrayerName} 
                onClose={() => {
                  if (globalAzanTimeout) {
                    clearTimeout(globalAzanTimeout);
                    globalAzanTimeout = null;
                  }
                  setCurrentScreen(previousScreen);
                }} 
              />
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Mini Player for audio recitations */}
      {currentScreen !== 'reader' && currentScreen !== 'azan' && <GlobalMiniPlayer />}

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
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md max-w-md mx-auto"
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
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-[#121212] rounded-t-[2.5rem] border-t border-white/10 p-6 space-y-6 shadow-2xl"
          >
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto" />

            {/* Title & Close Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div>
                <h3 className="text-lg font-black text-white">الخدمات الإسلامية</h3>
                <p className="text-[10px] text-gold-accent font-bold uppercase tracking-wider">سلسلة من العبادات والأذكار والمسابقات</p>
              </div>
              <button 
                onClick={() => setIsOpenServicesSheet(false)}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* 2x2 Services Grid inside Bottom Sheet */}
            <div className="grid grid-cols-2 gap-4">
              {/* 2. Duas & Adhkar */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('duas')}
                className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 flex flex-col items-center justify-center text-center gap-3 transition-colors group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                  <HandHeart size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">الأذكار والتحصين 🤲</h4>
                  <p className="text-[8px] text-white/35 mt-0.5">أذكار الصباح، المساء، والنوم</p>
                </div>
              </motion.button>

              {/* 3. Electronic Tasbeeh */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('tasbeeh')}
                className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-violet-500/20 flex flex-col items-center justify-center text-center gap-3 transition-colors group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-all shadow-inner">
                  <CircleDot size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">المُسبّحة الذكية 📿</h4>
                  <p className="text-[8px] text-white/35 mt-0.5">سبح واحتسب الأجر مع الهزاز</p>
                </div>
              </motion.button>

              {/* 4. Qibla Compass */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation('qibla')}
                className="col-span-2 p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-gold-accent/20 flex flex-col items-center justify-center text-center gap-3 transition-colors group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-gold-accent/15 flex items-center justify-center text-gold-accent group-hover:bg-gold-accent group-hover:text-islamic-dark transition-all shadow-inner">
                  <Compass size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">اتجاه القبلة 🕋</h4>
                  <p className="text-[8px] text-white/35 mt-0.5">بوصلة تفاعلية دقيقة مع الاهتزاز عند المطابقة</p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      {currentScreen !== 'reader' && currentScreen !== 'azan' && (
        <div id="bottom-main-nav" className="fixed bottom-8 left-0 right-0 max-w-md mx-auto z-40 px-6">
          <nav className="bg-[#141414]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            {/* 1. Home Tab Item */}
            <button
              onClick={() => handleNavigation('home')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative rounded-3xl group",
                currentScreen === 'home' ? "text-gold-accent" : "text-white/30 hover:text-white/60"
              )}
            >
              <LayoutGrid size={22} className="relative z-10" />
              <span className="text-[9px] font-black z-10">الرئيسية</span>
              {currentScreen === 'home' && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white/5 rounded-2xl -z-0" />
              )}
            </button>

            {/* 2. Prayer Tab Item */}
            <button
              onClick={() => handleNavigation('prayer')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative rounded-3xl group",
                currentScreen === 'prayer' ? "text-gold-accent" : "text-white/30 hover:text-white/60"
              )}
            >
              <Clock size={22} className="relative z-10" />
              <span className="text-[9px] font-black z-10">الصلاة</span>
              {currentScreen === 'prayer' && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white/5 rounded-2xl -z-0" />
              )}
            </button>

            {/* 3. Central FAB Launcher Button */}
            <div className="flex-1 flex justify-center -translate-y-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsOpenServicesSheet(!isOpenServicesSheet)}
                className="w-14 h-14 bg-gradient-to-br from-gold-accent to-amber-500 rounded-full flex items-center justify-center text-neutral-950 shadow-[0_8px_24px_rgba(212,175,55,0.4)] border-4 border-neutral-900 focus:outline-none relative z-50 shrink-0"
              >
                <Plus size={28} className={cn("transition-transform duration-300", isOpenServicesSheet ? "rotate-45" : "rotate-0")} strokeWidth={3} />
              </motion.button>
            </div>

            {/* 4. Quran Tab Item */}
            <button
              onClick={() => handleNavigation('quran')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative rounded-3xl group",
                currentScreen === 'quran' ? "text-gold-accent" : "text-white/30 hover:text-white/60"
              )}
            >
              <BookOpen size={22} className="relative z-10" />
              <span className="text-[9px] font-black z-10">المصحف</span>
              {currentScreen === 'quran' && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white/5 rounded-2xl -z-0" />
              )}
            </button>

            {/* 5. Listening Tab Item */}
            <button
              onClick={() => handleNavigation('listen')}
              className={cn(
                "flex-1 py-3 flex flex-col items-center gap-1 transition-all relative rounded-3xl group",
                currentScreen === 'listen' ? "text-gold-accent" : "text-white/30 hover:text-white/60"
              )}
            >
              <Volume2 size={22} className="relative z-10" />
              <span className="text-[9px] font-black z-10">الاستماع</span>
              {currentScreen === 'listen' && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white/5 rounded-2xl -z-0" />
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

      {/* Did You Know daily modal popup */}
      <DidYouKnowModal
        isOpen={isDidYouKnowOpen}
        factText={didYouKnowFact}
        onClose={() => setIsDidYouKnowOpen(false)}
      />
    </div>
  );
}
