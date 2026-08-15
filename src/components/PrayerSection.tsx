import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coordinates, CalculationMethod, PrayerTimes, Prayer, SunnahTimes } from 'adhan';
import { MapPin, Calendar, Clock, CheckCircle2, AlertCircle, Compass, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface City {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  method: string;
}

const CITIES: City[] = [
  { id: 'cairo', name: 'القاهرة والجيزة (مصر)', latitude: 30.0444, longitude: 31.2357, method: 'Egyptian' },
  { id: 'alex', name: 'الإسكندرية (مصر)', latitude: 31.2001, longitude: 29.9187, method: 'Egyptian' },
  { id: 'mansoura', name: 'المنصورة والدقهلية (مصر)', latitude: 31.0409, longitude: 31.3785, method: 'Egyptian' },
  { id: 'asyut', name: 'أسيوط وصعيد مصر', latitude: 27.1783, longitude: 31.1859, method: 'Egyptian' },
  { id: 'tanta', name: 'طنطا والغربية (مصر)', latitude: 30.7865, longitude: 30.9998, method: 'Egyptian' },
  { id: 'zagazig', name: 'الزقازيق والشرقية (مصر)', latitude: 30.5877, longitude: 31.5015, method: 'Egyptian' },
  { id: 'mecca', name: 'مكة المكرمة (السعودية)', latitude: 21.4225, longitude: 39.8262, method: 'UmmAlQura' },
  { id: 'medina', name: 'المدينة المنورة (السعودية)', latitude: 24.4672, longitude: 39.6111, method: 'UmmAlQura' },
  { id: 'riyadh', name: 'الرياض (السعودية)', latitude: 24.7136, longitude: 46.6753, method: 'UmmAlQura' },
  { id: 'dubai', name: 'دبي والشارقة (الإمارات)', latitude: 25.2048, longitude: 55.2708, method: 'Dubai' },
  { id: 'kuwait', name: 'الكويت العاصمة', latitude: 29.3759, longitude: 47.9774, method: 'Kuwait' },
  { id: 'doha', name: 'الدوحة (قطر)', latitude: 25.2854, longitude: 51.5310, method: 'Qatar' }
];

const CALCULATION_METHODS = [
  { id: 'Egyptian', name: 'الهيئة المصرية العامة للمساحة' },
  { id: 'UmmAlQura', name: 'أم القرى (مكة المكرمة)' },
  { id: 'MuslimWorldLeague', name: 'رابطة العالم الإسلامي' },
  { id: 'Karachi', name: 'جامعة العلوم الإسلامية بكراتشي' },
  { id: 'NorthAmerica', name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' },
  { id: 'MoonsightingCommittee', name: 'لجنة رؤية الهلال التوافقية' },
  { id: 'Kuwait', name: 'وزارة الأوقاف الكويتية' },
  { id: 'Qatar', name: 'وزارة الأوقاف القطرية' },
  { id: 'Dubai', name: 'دبي والمنطقة الشرقية' },
  { id: 'Singapore', name: 'سنغافورة والشرق الأقصى' }
];

const getMethodParams = (methodId: string) => {
  let params;
  switch (methodId) {
    case 'Egyptian':
      params = CalculationMethod.Egyptian();
      break;
    case 'MuslimWorldLeague':
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case 'NorthAmerica':
      params = CalculationMethod.NorthAmerica();
      break;
    case 'ShiaQum':
      params = CalculationMethod.Other();
      params.fajrAngle = 16.0;
      params.ishaAngle = 14.0;
      params.maghribAngle = 4.0;
      break;
    case 'Karachi':
      params = CalculationMethod.Karachi();
      break;
    case 'UmmAlQura':
      params = CalculationMethod.UmmAlQura();
      break;
    case 'Tehran':
      params = CalculationMethod.Tehran();
      break;
    default:
      params = CalculationMethod.Egyptian();
  }
  return params;
};

export default function PrayerSection() {
  const [calcMethod, setCalcMethod] = useState<string>(() => {
    return localStorage.getItem('quran_prayer_calc_method') || 'Egyptian';
  });

  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(() => {
    try {
      const saved = localStorage.getItem('quran_gps_coords');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [detectedAddress, setDetectedAddress] = useState<string | null>(() => {
    return localStorage.getItem('quran_gps_address') || null;
  });

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  





  // Fetch address metadata from coordinates via public reverse geocoding API
  const fetchAddress = async (lat: number, lon: number) => {
    try {
      // 1. Try offline database match for 0ms instant display when offline
      const { getOfflineAddress } = await import('../services/offlineGeocoder');
      const offlineAddr = getOfflineAddress(lat, lon);
      if (offlineAddr) {
        setDetectedAddress(offlineAddr);
        localStorage.setItem('quran_gps_address', offlineAddr);
      }

      // 2. Query OpenStreetMap Nominatim API in background if online for street-level precision
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ar`,
        { 
          headers: { 'User-Agent': 'QuranLightApp/1.0' },
          signal: controller.signal 
        }
      );
      clearTimeout(timeoutId);
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
          setDetectedAddress(name);
          localStorage.setItem('quran_gps_address', name);

          const country = data.address?.country || '';
          const countryCode = data.address?.country_code?.toUpperCase() || '';

          // Smart auto-detect of the calculation method depending on geographic borders (only if not set before)
          const existingMethod = localStorage.getItem('quran_prayer_calc_method');
          if (!existingMethod) {
            if (country.includes('مصر') || countryCode === 'EG') {
              setCalcMethod('Egyptian');
              localStorage.setItem('quran_prayer_calc_method', 'Egyptian');
            } else if (country.includes('السعودية') || countryCode === 'SA') {
              setCalcMethod('UmmAlQura');
              localStorage.setItem('quran_prayer_calc_method', 'UmmAlQura');
            } else if (country.includes('الإمارات') || countryCode === 'AE') {
              setCalcMethod('Dubai');
              localStorage.setItem('quran_prayer_calc_method', 'Dubai');
            } else if (country.includes('الكويت') || countryCode === 'KW') {
              setCalcMethod('Kuwait');
              localStorage.setItem('quran_prayer_calc_method', 'Kuwait');
            } else if (country.includes('قطر') || countryCode === 'QA') {
              setCalcMethod('Qatar');
              localStorage.setItem('quran_prayer_calc_method', 'Qatar');
            }
          }
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding failed', e);
    }
  };

  // High-precision GPS localization logic
  const handleSmartLocate = async () => {
    setIsLocating(true);
    setLocationError(null);

    try {


      // First check and request native permissions (handles APK prompt seamlessly)
      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        permStatus = await Geolocation.requestPermissions();
      }

      if (permStatus.location !== 'granted') {
        setIsLocating(false);
        setLocationError('تم رفض إذن الوصول للموقع. يرجى تفعيل الإذن من إعدادات التطبيق لتحديد مواقيت الصلاة بدقة بالغة.');
        return;
      }

      let watchId: string = '';
      let resolved = false;

      const clearGPSWatch = () => {
        if (watchId) {
          Geolocation.clearWatch({ id: watchId }).catch(err => console.error("Error clearing watch:", err));
          watchId = '';
        }
        setIsLocating(false);
      };

      const isWeb = !Capacitor.isNativePlatform();

      if (isWeb) {
        const savedCoords = localStorage.getItem('quran_gps_coords');
        const savedAddress = localStorage.getItem('quran_gps_address');
        if (savedCoords) {
          try {
            const parsed = JSON.parse(savedCoords);
            setGpsCoords({ ...parsed, accuracy: 1 });
            setDetectedAddress(savedAddress || 'موقع الويب الحالي');
            setIsLocating(false);
            return;
          } catch {}
        }
        const coords = { latitude: 30.0444, longitude: 31.2357, accuracy: 1 };
        setGpsCoords(coords);
        localStorage.setItem('quran_gps_coords', JSON.stringify(coords));
        setDetectedAddress('القاهرة، مصر (الافتراضي)');
        localStorage.setItem('quran_gps_address', 'القاهرة، مصر (الافتراضي)');
        setIsLocating(false);
        return;
      }

      // Continuously watch GPS coordinates to calibrate accuracy below 10 meters
      watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }, (position, err) => {
        if (err) {
          console.error("GPS watch error:", err);
          if (!resolved) {
            clearGPSWatch();
            const savedCoords = localStorage.getItem('quran_gps_coords');
            const savedAddress = localStorage.getItem('quran_gps_address');
            if (savedCoords) {
              try {
                const parsed = JSON.parse(savedCoords);
                setGpsCoords(parsed);
                setDetectedAddress(savedAddress || 'موقعك المحفوظ');
                setIsLocating(false);
                return;
              } catch {}
            }
            // Fallback to Cairo default coordinates
            const coords = { latitude: 30.0444, longitude: 31.2357 };
            setGpsCoords(coords);
            setDetectedAddress('القاهرة، مصر (الافتراضي)');
            setIsLocating(false);
          }
          return;
        }

        if (position) {
          const accuracy = position.coords.accuracy;
          console.log(`Prayer GPS Calibrating: Accuracy resolved to ${accuracy} meters`);

          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined
          };

          setGpsCoords(coords);
          localStorage.setItem('quran_gps_coords', JSON.stringify(coords));

          // Try reverse geocoding (which will fail gracefully and offline-safely if no connection is present)
          fetchAddress(coords.latitude, coords.longitude);

          // Stop watching once accuracy is less than 10 meters
          if (accuracy <= 10) {
            resolved = true;
            clearGPSWatch();
          }
        }
      });

      // Safety timeout: stop watching after 12 seconds and keep the best location resolved so far
      setTimeout(() => {
        if (watchId) {
          console.log("Prayer GPS Calibration reached safety timeout. Keeping best resolved location.");
          clearGPSWatch();
        }
      }, 12000);

    } catch (error: any) {
      setIsLocating(false);
      let errorMsg = 'تعذر الوصول إلى الموقع الإحداثي بدقة. تأكد من تشغيل الـ GPS والسماح بالإذن.';
      if (error && error.message) {
        if (error.message.includes('denied') || error.message.includes('permission')) {
          errorMsg = 'تم رفض إذن الوصول للموقع. يرجى تفعيل الإذن من إعدادات التطبيق لتحديد مواقيت الصلاة بدقة بالغة.';
        } else if (error.message.includes('unavailable') || error.message.includes('location provider')) {
          errorMsg = 'معلومات الموقع الجغرافي غير متوفرة بقمر الـ GPS حاليًا.';
        } else if (error.message.includes('timeout')) {
          errorMsg = 'انتهت مهلة الوصول لإحداثيات الـ GPS. أعد المحاولة مجددًا.';
        }
      }
      setLocationError(errorMsg);
    }
  };

  // Run automatically on mount to request location or fetch address metadata
  useEffect(() => {
    if (!gpsCoords) {
      handleSmartLocate();
    } else {
      fetchAddress(gpsCoords.latitude, gpsCoords.longitude);
    }
  }, []);

  // Update clock every second — optimized with Page Visibility API to save battery
  useEffect(() => {
    let intervalId: any = null;

    const startTimer = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    };

    const stopTimer = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        setCurrentTime(new Date());
        startTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start timer initially if document is visible
    if (!document.hidden) {
      startTimer();
    }

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);



  // Calculate prayer times
  const prayerData = useMemo(() => {
    let lat = 30.0444; // Cairo defaults
    let lon = 31.2357;
    let activeMethod = calcMethod;

    if (gpsCoords) {
      lat = gpsCoords.latitude;
      lon = gpsCoords.longitude;
    }

    const coordinates = new Coordinates(lat, lon);
    const params = getMethodParams(activeMethod);
    const date = new Date();
    
    const prayerTimes = new PrayerTimes(coordinates, date, params);
    const sunnahTimes = new SunnahTimes(prayerTimes);

    const checkFormat = (d: Date) => {
      return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const list = [
      { id: 'fajr', name: 'الفجر', dateObj: prayerTimes.fajr, timeStr: checkFormat(prayerTimes.fajr) },
      { id: 'sunrise', name: 'الشروق', dateObj: prayerTimes.sunrise, timeStr: checkFormat(prayerTimes.sunrise) },
      { id: 'dhuhr', name: 'الظهر', dateObj: prayerTimes.dhuhr, timeStr: checkFormat(prayerTimes.dhuhr) },
      { id: 'asr', name: 'العصر', dateObj: prayerTimes.asr, timeStr: checkFormat(prayerTimes.asr) },
      { id: 'maghrib', name: 'المغرب', dateObj: prayerTimes.maghrib, timeStr: checkFormat(prayerTimes.maghrib) },
      { id: 'isha', name: 'العشاء', dateObj: prayerTimes.isha, timeStr: checkFormat(prayerTimes.isha) },
      { id: 'midnight', name: 'منتصف الليل', dateObj: sunnahTimes.middleOfTheNight, timeStr: checkFormat(sunnahTimes.middleOfTheNight) }
    ];

    // Determine past/current/next prayers
    let activeIndex = -1;
    let nextIndex = 0;
    const nowMs = currentTime.getTime();

    for (let i = 0; i < list.length; i++) {
      if (nowMs >= list[i].dateObj.getTime()) {
        activeIndex = i;
      }
    }
    
    nextIndex = (activeIndex + 1) % list.length;

    // Remaining time calculation to next prayer
    const nextPrayer = list[nextIndex];
    let timeDiffMs = nextPrayer.dateObj.getTime() - nowMs;
    // If next prayer is Fajr tomorrow
    if (timeDiffMs < 0) {
      const tomorrowPrayer = new Date(nextPrayer.dateObj);
      tomorrowPrayer.setDate(tomorrowPrayer.getDate() + 1);
      timeDiffMs = tomorrowPrayer.getTime() - nowMs;
    }

    const totalSecs = Math.floor(timeDiffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const remainingStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return {
      list,
      activeIndex,
      nextPrayerName: nextPrayer.name,
      remainingStr,
    };
  }, [calcMethod, gpsCoords, currentTime]);


  // Natively calculate Hijri date with exactly high precision
  const hijriDateStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(currentTime);
    } catch {
      return 'تاريخ هجري تقريبي';
    }
  }, [currentTime]);

  const miladiDateStr = useMemo(() => {
    return currentTime.toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [currentTime]);

  return (
    <div className="relative text-white min-h-screen rounded-3xl overflow-hidden pb-32">
      {/* Background with Holy Kaaba picture and blur overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=1200&auto=format&fit=crop" 
          alt="Holy Kaaba Makkah" 
          className="w-full h-full object-cover scale-105 filter brightness-[0.25]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-emerald-950/40 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 px-6 py-8 space-y-6">
        {/* Header Title & Egyptian timezone dropdown */}
        <div className="flex flex-col gap-4 bg-black/50 border border-white/10 rounded-3xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h1 className="text-lg font-black text-white flex items-center gap-2">
                <Clock size={18} className="text-gold-accent animate-pulse" />
                مواقيت الصلاة اليومية
              </h1>
              <p className="text-[10px] text-emerald-400 font-bold">المواقيت التلقائية والـ GPS الذكي</p>
            </div>
          </div>

          {/* Automatic Location Tracker Banner / Notifications */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            
            {/* 1. Requesting Permission Banner (Notification) if we don't have coordinates yet */}
            {!gpsCoords && !locationError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-3 relative overflow-hidden text-right"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                <div className="flex gap-3 items-start relative z-10">
                  <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl animate-pulse">
                    <MapPin size={18} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-emerald-300">مطلوب إذن تحديد الموقع</h3>
                    <p className="text-[10px] text-white/80 leading-relaxed font-bold">
                      يرجى السماح للتطبيق بتحديد موقعك الجغرافي تلقائيًا بالسماح لإشعار المتصفح، لكي نتمكن من حساب أوقات الصلوات والأذان بدقة بالغة تناسب مكان إقامتك الحالي.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 relative z-10">
                  <button
                    onClick={handleSmartLocate}
                    disabled={isLocating}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600/50 text-black font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 duration-250 cursor-pointer"
                  >
                    {isLocating ? (
                      <>
                        <Compass size={14} className="animate-spin text-black" />
                        جاري تحديد الموقع...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        السماح بالموقع التلقائي
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. Active Detected Address Showcase */}
            {gpsCoords && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-950/40 border border-emerald-500/25 rounded-2xl p-3.5 space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                      <Compass size={15} className={cn("animate-spin", isLocating ? "duration-1000" : "duration-[4000ms]")} />
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[9px] text-emerald-400 font-extrabold block">تم تحديد موقعك التلقائي بنجاح</span>
                      <span className="text-xs font-black text-white leading-tight">
                        {detectedAddress || `إحداثيات (${gpsCoords.latitude.toFixed(3)}°، ${gpsCoords.longitude.toFixed(3)}°)`}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSmartLocate}
                    disabled={isLocating}
                    className="p-2 hover:bg-white/5 border border-white/5 rounded-xl text-neutral-300 hover:text-emerald-300 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                    title="تحديث الإحداثيات والمدينة"
                  >
                    <RefreshCw size={12} className={cn(isLocating ? "animate-spin text-emerald-400" : "")} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-[9px] font-mono text-white/40 pt-1.5 border-t border-white/5">
                  <span>خط عرض: {gpsCoords.latitude.toFixed(4)}°</span>
                  <span>خط طول: {gpsCoords.longitude.toFixed(4)}°</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 rounded-md">✓ محدد بالـ GPS</span>
                </div>
              </motion.div>
            )}

              {/* 3. Handling Location Error / Permission Denied */}
              {locationError && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-right"
                >
                  <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-rose-300">فشل تحديد الموقع التلقائي</h4>
                    <p className="text-[10px] text-white/70 leading-relaxed font-bold">
                      {locationError}
                    </p>
                    <button
                      onClick={handleSmartLocate}
                      className="bg-white/5 border border-white/5 hover:bg-white/10 text-gold-accent font-black text-[10px] py-1.5 px-3 rounded-lg transition-all"
                    >
                      إعادة المحاولة وتفعيل الـ GPS
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

        {/* Big Countdown Timer Card */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/60 border border-white/10 rounded-3xl p-6 text-center backdrop-blur-2xl shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute right-0 top-0 -translate-y-6 translate-x-6 w-24 h-24 bg-gold-accent/10 rounded-full blur-2xl" />
          
          <h2 className="text-sm font-black text-white/50 tracking-wider">العد التنازلي للصلاة التالية</h2>
          
          <div className="text-4xl font-mono text-gold-accent font-extrabold tracking-widest drop-shadow-[0_4px_12px_rgba(212,175,55,0.3)] animate-pulse">
            {prayerData?.remainingStr || '00:00:00'}
          </div>

          <div className="text-sm font-semibold text-emerald-300">
            بقي على <span className="text-gold-accent text-base px-1 font-bold">{prayerData?.nextPrayerName}</span>
          </div>
        </div>

        {/* Date Card */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-center items-center text-center space-y-1">
            <Calendar size={18} className="text-gold-accent" />
            <span className="text-[10px] text-white/40">التاريخ الهجري</span>
            <span className="text-xs font-bold text-white/90">{hijriDateStr}</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-center items-center text-center space-y-1">
            <Calendar size={18} className="text-emerald-400" />
            <span className="text-[10px] text-white/40">التاريخ الميلادي</span>
            <span className="text-xs font-bold text-white/90">{miladiDateStr}</span>
          </div>
        </div>

        {/* Prayer Times Checklist Timeline */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md space-y-4">
          <h3 className="text-sm font-bold text-gold-accent/80 pb-2 border-b border-white/5">جدول الصلوات اليومي</h3>
          
          <div className="relative border-r border-white/10 pr-4 space-y-5">
            {prayerData?.list.map((prayer, idx) => {
              const isPast = idx <= (prayerData?.activeIndex ?? -1);
              const isNext = idx === ((prayerData?.activeIndex ?? -1) + 1) % prayerData.list.length;
              
              return (
                <div 
                  key={prayer.id} 
                  className="flex justify-between items-center relative transition-all duration-300"
                >
                  {/* Timeline point indicator */}
                  <div className={cn(
                    "absolute -right-[21px] w-2.5 h-2.5 rounded-full border transition-all duration-500",
                    isPast ? "bg-emerald-400 border-emerald-400 shadow-[0_0_8px_#34d399]" : 
                    isNext ? "bg-gold-accent border-gold-accent animate-ping" : "bg-white/20 border-white/20"
                  )} />
                  <div className={cn(
                    "absolute -right-[21px] w-2.5 h-2.5 rounded-full border transition-all duration-500",
                    isPast ? "bg-emerald-400 border-emerald-400" : 
                    isNext ? "bg-gold-accent border-gold-accent" : "bg-white/20 border-white/20"
                  )} />

                  <div className="space-y-0.5">
                    <span className={cn(
                      "text-sm font-black transition-all",
                      isNext ? "text-gold-accent font-extrabold text-base" : 
                      isPast ? "text-white/80" : "text-white/40"
                    )}>
                      {prayer.name}
                    </span>
                    {isNext && (
                      <span className="block text-[9px] bg-gold-accent/20 text-gold-accent font-bold px-1.5 py-0.5 rounded-full w-max">
                        الصلاة القادمة
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-mono text-sm tracking-wider",
                      isNext ? "text-gold-accent font-bold" : 
                      isPast ? "text-white/90" : "text-white/30"
                    )}>
                      {prayer.timeStr}
                    </span>
                    {isPast && (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
