import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  Heart, 
  CircleDot, 
  ChevronRight, 
  ArrowLeft, 
  BookOpen, 
  Smartphone, 
  ShieldCheck, 
  Trophy, 
  Volume2, 
  HandHeart,
  CalendarDays,
  Settings,
  BellRing,
  MapPin
} from 'lucide-react';
import { AppState } from '../types';
import { Capacitor } from '@capacitor/core';
import { cn } from '../lib/utils';
import { isAppInstallable, installPWA } from '../registerSW';
import surahsData from '../data/surahs.json';

interface HomeProps {
  state: AppState;
  onNavigate: (screen: any) => void;
  onPageClick: (pageNumber: number) => void;
  downloadProgress: number | null;
  isDownloaded: boolean;
}

export default function Home({ state, onNavigate, onPageClick, downloadProgress, isDownloaded }: HomeProps) {
  const savedPage = state.lastRead ? state.lastRead.pageNumber : 1;
  const lastReadSurah = surahsData.find(s => savedPage >= s.startPage && savedPage <= s.endPage) || null;

  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('pwa_install_banner_dismissed') === 'true';
  });

  useEffect(() => {
    setIsInstallable(isAppInstallable());
    const handleInstallable = () => setIsInstallable(true);
    window.addEventListener('pwa-installable', handleInstallable);
    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const handleInstallClick = async () => {
    const success = await installPWA();
    if (success) {
      setIsInstallable(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa_install_banner_dismissed', 'true');
  };

  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  useEffect(() => {
    const hasCoords = localStorage.getItem('quran_gps_coords') !== null;
    const currentNotifPerm = 'Notification' in window ? Notification.permission : 'granted';
    setShowPermissionBanner(!hasCoords || currentNotifPerm === 'default');
  }, []);

  const handleActivatePermissions = async () => {
    // 1. Request notification permission
    if ('Notification' in window) {
      try {
        await Notification.requestPermission();
      } catch (err) {
        console.warn('Notification permission request failed', err);
      }
    }

    // 2. Request Geolocation permission
    if ('geolocation' in navigator) {


      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          localStorage.setItem('quran_gps_coords', JSON.stringify(coords));

          // Fetch Address using OpenStreetMap Nominatim for extremely high-detail localized names
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=ar`,
              { headers: { 'User-Agent': 'QuranLightApp/1.0' } }
            );
            if (response.ok) {
              const data = await response.json();
              let name = '';
              if (data.address) {
                const addr = data.address;
                const parts = [];
                const localName = addr.village || addr.hamlet || addr.suburb || addr.town || addr.city;
                if (localName) parts.push(localName);
                if (addr.county) parts.push(addr.county);
                if (addr.state) parts.push(addr.state);
                if (addr.country) parts.push(addr.country);
                name = parts.join('، ');
              } else if (data.display_name) {
                name = data.display_name;
              }
              if (name) {
                localStorage.setItem('quran_gps_address', name);
              }
            }
          } catch (e) {
            console.warn(e);
          }

          setShowPermissionBanner(false);
          window.location.reload(); // Refresh to trigger Azan schedules
        },
        (err) => {
          console.warn('Location permission request failed', err);
          setShowPermissionBanner(false);
          window.location.reload();
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } else {
      setShowPermissionBanner(false);
    }
  };

  // Natively calculate Hijri date with exactly high precision
  const hijriToday = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-6 py-4">
      {/* Header and Welcome */}
      <header className="flex justify-between items-center pb-2 border-b border-white/5">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">حقيبة المسلم</h1>
          <p className="text-gold-accent text-xs font-bold tracking-wide">
            أهلاً ومرحباً بك يا أخي المسلم • {hijriToday}
          </p>
        </div>
        <button 
          onClick={() => onNavigate('settings')}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all active:scale-95"
          title="الإعدادات"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* Geolocation & Notification Permission Request Banner */}
      <AnimatePresence>
        {showPermissionBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 rounded-[2rem] bg-gradient-to-br from-gold-accent/20 via-emerald-950/20 to-emerald-950/40 border border-gold-accent/30 relative overflow-hidden shadow-2xl"
          >
            {/* Ambient background glow */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gold-accent/5 blur-[40px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gold-accent/15 flex items-center justify-center text-gold-accent shrink-0 border border-gold-accent/20">
                    <BellRing size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">تفعيل تنبيهات الأذان والموقع</h4>
                    <p className="text-[11px] text-white/70 mt-1 leading-relaxed text-right">
                      يرجى السماح بصلاحيات الموقع الجغرافي والإشعارات لكي يتمكن التطبيق من حساب مواقيت الصلاة بدقة وإرسال نداء الأذان ورسائل هل تعلم اليومية في مواعيدها.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/5 pt-3 mt-1">
                <button
                  onClick={() => setShowPermissionBanner(false)}
                  className="px-4 py-2 text-white/50 hover:text-white font-bold text-[10px] rounded-xl hover:bg-white/5 transition-all"
                >
                  تجاهل مؤقتاً
                </button>
                <button
                  onClick={handleActivatePermissions}
                  className="px-5 py-2.5 bg-gradient-to-r from-gold-bright to-gold-accent text-islamic-dark font-black text-[10px] rounded-xl tracking-wide hover:brightness-110 transition-all active:scale-95 flex items-center gap-1 shadow-lg shadow-gold-accent/10"
                >
                  <MapPin size={12} />
                  تفعيل الصلاحيات الآن
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Installation Banner */}
      <AnimatePresence>
        {isInstallable && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 rounded-[2rem] bg-gradient-to-br from-gold-accent/20 to-emerald-950/40 border border-gold-accent/30 relative overflow-hidden shadow-xl"
          >
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold-accent/10 flex items-center justify-center text-gold-accent shrink-0">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">تثبيت التطبيق على الهواتف</h4>
                    <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                      حمّل التطبيق الآن ليتثبت كـ App وبشكل كامل أوفلاين مع سرعة تصفح فائقة.
                    </p>
                  </div>
                </div>
                <button onClick={handleDismiss} className="text-white/40 hover:text-white p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-gold-accent text-islamic-dark font-black text-[10px] rounded-lg tracking-wide hover:bg-white transition-all active:scale-95 flex items-center gap-1 shadow-md"
                >
                  <ShieldCheck size={12} />
                  تثبيت الآن
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue Reading Card */}
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={() => onPageClick(savedPage)}
        className="bg-gradient-to-br from-emerald-900/60 to-emerald-950/80 border border-gold-accent/20 rounded-3xl p-6 relative overflow-hidden cursor-pointer shadow-xl group border-l-4 border-l-gold-accent"
      >
        <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Book size={100} className="rotate-12 translate-x-2 -translate-y-2 text-gold-accent" />
        </div>
        
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gold-accent/15 text-gold-accent rounded-full text-[10px] font-black uppercase tracking-widest border border-gold-accent/10">
              متابعة القراءة اليومية
            </span>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                {lastReadSurah ? lastReadSurah.name : 'سورة الفاتحة'}
              </h2>
              <p className="text-white/60 text-xs">
                {lastReadSurah 
                  ? `أخر ما قرأت: صفحة ${savedPage}` 
                  : 'اقرأ تلاوتك اليومية واحفظ تقدمك في المصحف'}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gold-accent">
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          </div>
        </div>

        {downloadProgress !== null && !isDownloaded && (
          <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-white/60">جاري تحميل ملف المصحف الشريف للأوفلاين...</span>
              <span className="text-gold-accent">{downloadProgress}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gold-accent transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Verse of the Day Card */}
      <div className="bg-gradient-to-br from-white/5 to-white/[0.01] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gold-accent animate-ping" />
          <span className="text-gold-accent/80 text-[10px] font-black uppercase tracking-[0.3em]">آية اليوم العطرة</span>
        </div>
        
        <p className="font-arabic text-xl sm:text-2xl text-white font-extrabold leading-loose text-center drop-shadow-md">
          {state.dailyVerse?.text || "يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا وَسَبِّحُوهُ بُكْرَةً وَأَصِيلًا"}
        </p>

        <div className="flex justify-center items-center gap-2 text-gold-accent/60 text-xs font-bold border-t border-white/5 pt-3">
          <CalendarDays size={14} />
          <span>{state.dailyVerse ? `سورة ${state.dailyVerse.surahName} • الآية ${state.dailyVerse.reference}` : "سورة الأحزاب • الآية ٤١ - ٤٢"}</span>
        </div>
      </div>



    </div>
  );
}
