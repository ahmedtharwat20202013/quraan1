import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Compass, Navigation, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface QiblaSectionProps {
  onBack: () => void;
}

export default function QiblaSection({ onBack }: QiblaSectionProps) {
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPrecisionLow, setLocationPrecisionLow] = useState(false);
  
  const [heading, setHeading] = useState<number | null>(null); // Initial reference heading
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null); // Qibla angle relative to North (0-360)
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(true);
  const [sensorStatus, setSensorStatus] = useState<string>('waiting'); // 'waiting' | 'active' | 'unavailable'
  const [isAligned, setIsAligned] = useState<boolean>(false);
  const [needsCalibration, setNeedsCalibration] = useState<boolean>(false);

  // iOS orientation permission state
  const [isIOS, setIsIOS] = useState(false);
  const [iosPermissionNeeded, setIosPermissionNeeded] = useState(false);

  // Refs to perform 60fps direct DOM styling and prevent React re-renders
  const dialRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const headingTextRef = useRef<HTMLSpanElement | null>(null);
  const alignmentTextRef = useRef<HTMLDivElement | null>(null);
  const alignmentContainerRef = useRef<HTMLDivElement | null>(null);

  // Core sensor heading variables tracked in refs
  const currentHeadingRef = useRef<number>(0);
  const targetHeadingRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isAlignedRef = useRef<boolean>(false);
  const compassCleanupRef = useRef<(() => void) | null>(null);
  const gpsWatchIdRef = useRef<string | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Kaaba absolute coordinates (Masjid al-Haram, Makkah)
  const KAABA_LAT = 21.422487;
  const KAABA_LON = 39.826206;

  // Haversine formula to compute distance in meters between coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Low-Pass Filter smoothing algorithm with angular wrap-around unwrap
  const filterAngle = (current: number, target: number): number => {
    let diff = ((target - current + 540) % 360) - 180;
    
    // Jerk prevention: if angle difference is less than 1 degree, do not rotate
    if (Math.abs(diff) < 1) {
      return current;
    }
    
    // Low Pass Filter alpha (0.12 ensures high stability while feeling naturally smooth)
    const alpha = 0.12;
    return (current + diff * alpha + 360) % 360;
  };

  // Calculate Qibla direction based on spherical trigonometry
  const calculateQiblaDirection = (lat: number, lon: number): number => {
    const phi1 = (lat * Math.PI) / 180;
    const lambda1 = (lon * Math.PI) / 180;
    const phi2 = (KAABA_LAT * Math.PI) / 180;
    const lambda2 = (KAABA_LON * Math.PI) / 180;
    const dLon = lambda2 - lambda1;

    const y = Math.sin(dLon);
    const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(dLon);

    let qiblaRad = Math.atan2(y, x);
    let qiblaDeg = (qiblaRad * 180) / Math.PI;

    return (qiblaDeg + 360) % 360;
  };

  // Safe release helper for Geolocation watcher
  const clearGPSWatch = () => {
    if (gpsWatchIdRef.current) {
      Geolocation.clearWatch({ id: gpsWatchIdRef.current }).catch(err => console.error("Error clearing watch:", err));
      gpsWatchIdRef.current = null;
    }
    setIsLocating(false);
  };

  // Fetch coordinates and apply the 50m change threshold restriction
  const fetchLocationAndCalculate = async (forceRefresh = false) => {
    setIsLocating(true);
    setLocationError(null);
    setLocationPrecisionLow(false);
    
    try {
      // 1. Try loading cached location first to speed up load time
      if (!forceRefresh) {
        const saved = localStorage.getItem('quran_gps_coords');
        if (saved) {
          const coords = JSON.parse(saved);
          lastCoordsRef.current = coords;
          setGpsCoords(coords);
          const angle = calculateQiblaDirection(coords.latitude, coords.longitude);
          setQiblaAngle(angle);
          setIsLocating(false);
          // Still fetch in background to check for updates
        }
      }

      // Check permission statuses
      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        permStatus = await Geolocation.requestPermissions();
      }

      if (permStatus.location !== 'granted') {
        throw new Error('permission_denied');
      }

      // 2. Start watching position natively to obtain high-precision updates
      const watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }, (position, err) => {
        if (err) {
          console.warn("GPS watch update error:", err);
          if (!lastCoordsRef.current) {
            // Hard fallback if no coordinates resolved
            setLocationPrecisionLow(true);
            const fallback = { latitude: 30.9405, longitude: 31.2291 }; // Egypt defaults
            setGpsCoords(fallback);
            setQiblaAngle(calculateQiblaDirection(fallback.latitude, fallback.longitude));
          }
          clearGPSWatch();
          return;
        }

        if (position) {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          // Limit recalculation to displacements greater than 50 meters
          if (lastCoordsRef.current) {
            const distanceMoved = calculateDistance(
              lastCoordsRef.current.latitude,
              lastCoordsRef.current.longitude,
              coords.latitude,
              coords.longitude
            );
            if (distanceMoved < 50) {
              console.log(`GPS location delta is ${distanceMoved.toFixed(1)}m (less than 50m threshold). Recalculation skipped.`);
              setIsLocating(false);
              return;
            }
          }

          // Update position state
          lastCoordsRef.current = coords;
          setGpsCoords(coords);
          const angle = calculateQiblaDirection(coords.latitude, coords.longitude);
          setQiblaAngle(angle);
          localStorage.setItem('quran_gps_coords', JSON.stringify(coords));
          
          if (position.coords.accuracy > 100) {
            setLocationPrecisionLow(true);
          } else {
            setLocationPrecisionLow(false);
          }

          // If accuracy is high (<15 meters), stop watcher to preserve battery
          if (position.coords.accuracy <= 15) {
            clearGPSWatch();
          }
        }
      });

      gpsWatchIdRef.current = watchId;

      // Safety timeout: stop high precision watching after 8 seconds to save battery
      setTimeout(() => {
        if (gpsWatchIdRef.current) {
          clearGPSWatch();
        }
      }, 8000);

    } catch (e: any) {
      console.warn(e);
      let errorMsg = 'تعذر الحصول على الموقع الجغرافي. تم استخدام الإحداثيات الافتراضية.';
      if (e.message === 'permission_denied') {
        errorMsg = 'يرجى السماح بالوصول للموقع لحساب زاوية القبلة لبلدك بدقة.';
      }
      setLocationError(errorMsg);
      setLocationPrecisionLow(true);
      
      const fallback = { latitude: 30.9405, longitude: 31.2291 };
      setGpsCoords(fallback);
      setQiblaAngle(calculateQiblaDirection(fallback.latitude, fallback.longitude));
      setIsLocating(false);
    }
  };

  // Request iOS DeviceOrientation permissions
  const requestIOSPermission = async () => {
    const DeviceOrientationEventReq = (DeviceOrientationEvent as any).requestPermission;
    if (typeof DeviceOrientationEventReq === 'function') {
      try {
        const state = await DeviceOrientationEventReq();
        if (state === 'granted') {
          setIosPermissionNeeded(false);
          startCompassListener();
        } else {
          setSensorStatus('unavailable');
          setIsSensorAvailable(false);
        }
      } catch (e) {
        console.error('Error requesting iOS compass permission', e);
        setSensorStatus('unavailable');
        setIsSensorAvailable(false);
      }
    }
  };

  // Orientation and compass listener setup
  const startCompassListener = () => {
    let sensorFired = false;
    setSensorStatus('active');

    const handleOrientation = (event: DeviceOrientationEvent) => {
      sensorFired = true;
      let rawHeading: number | null = null;

      // Extract absolute compass heading
      if ('webkitCompassHeading' in event) {
        rawHeading = (event as any).webkitCompassHeading;
        const accuracy = (event as any).webkitCompassAccuracy;
        if (accuracy !== undefined && (accuracy > 25 || accuracy < 0)) {
          setNeedsCalibration(true);
        } else {
          setNeedsCalibration(false);
        }
      } else if (event.type === 'deviceorientationabsolute' || (event as any).absolute === true) {
        if (event.alpha !== null) {
          rawHeading = 360 - event.alpha;
        }
      } else if (event.alpha !== null) {
        rawHeading = 360 - event.alpha;
      }

      if (rawHeading !== null) {
        // Read screen orientation to support landscape layouts correctly
        let screenAdjustment = 0;
        if (typeof window !== 'undefined') {
          if (window.screen && window.screen.orientation) {
            screenAdjustment = window.screen.orientation.angle;
          } else if ('orientation' in window) {
            screenAdjustment = (window as any).orientation || 0;
          }
        }

        const normalizedHeading = (rawHeading + screenAdjustment + 360) % 360;
        targetHeadingRef.current = normalizedHeading;
        
        // Initialize heading state on first reading
        setHeading((prev) => (prev === null ? normalizedHeading : prev));
      }
    };

    const win = window as any;
    win.addEventListener('deviceorientationabsolute', handleOrientation);
    win.addEventListener('deviceorientation', handleOrientation);

    // Watchdog fallback if sensors fail to report any reading within 2 seconds
    const timer = setTimeout(() => {
      if (!sensorFired) {
        setSensorStatus('unavailable');
        setIsSensorAvailable(false);
      }
    }, 2000);

    compassCleanupRef.current = () => {
      win.removeEventListener('deviceorientationabsolute', handleOrientation);
      win.removeEventListener('deviceorientation', handleOrientation);
      clearTimeout(timer);
    };
  };

  // 1. Initialize location and orientation listeners
  useEffect(() => {
    fetchLocationAndCalculate();

    // Setup calibration listeners
    const handleCalibrationNeeded = (e: Event) => {
      e.preventDefault();
      setNeedsCalibration(true);
    };
    window.addEventListener('compassneedscalibration', handleCalibrationNeeded);

    // Detect platform details
    const isIOSDevice = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const DeviceOrientationEventReq = typeof DeviceOrientationEvent !== 'undefined' ? (DeviceOrientationEvent as any).requestPermission : null;
    if (isIOSDevice && typeof DeviceOrientationEventReq === 'function') {
      setIosPermissionNeeded(true);
    } else {
      startCompassListener();
    }

    // Comprehensive unmount cleanup to maximize battery savings
    return () => {
      window.removeEventListener('compassneedscalibration', handleCalibrationNeeded);
      
      if (compassCleanupRef.current) {
        compassCleanupRef.current();
      }
      
      clearGPSWatch();

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  // 2. High-performance Animation Render Loop (LERP + Direct DOM updates)
  useEffect(() => {
    const updateCompass = () => {
      const current = currentHeadingRef.current;
      const target = targetHeadingRef.current;

      // Smoothen heading using low-pass filter
      const smoothed = filterAngle(current, target);
      currentHeadingRef.current = smoothed;

      // Direct DOM manipulation keeps CPU load minimal and skips React re-render cycles
      
      // A. Rotate rotating outer dial opposite of phone orientation
      if (dialRef.current) {
        dialRef.current.style.transform = `rotate(${-smoothed}deg)`;
      }

      // B. Rotate needle pointing directly to Kaaba relative to dial
      if (arrowRef.current && qiblaAngle !== null) {
        const arrowRot = qiblaAngle - smoothed;
        const diff = Math.abs(((qiblaAngle - smoothed + 540) % 360) - 180);
        const aligned = diff <= 3; // Aligned zone threshold of 3 degrees

        if (aligned) {
          // Scale arrow slightly and add emerald glow
          arrowRef.current.style.transform = `rotate(${arrowRot}deg) scale(1.06)`;
          arrowRef.current.style.filter = 'drop-shadow(0 0 15px rgba(16,185,129,0.75))';
        } else {
          // Normal state
          arrowRef.current.style.transform = `rotate(${arrowRot}deg) scale(1)`;
          arrowRef.current.style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))';
        }

        // C. Update alignment state check (vibrates exactly once on entry)
        if (aligned !== isAlignedRef.current) {
          isAlignedRef.current = aligned;
          setIsAligned(aligned);

          if (aligned) {
            if (navigator.vibrate) {
              navigator.vibrate(100); // Light haptic impulse
            }
          }
        }
      }

      // D. Update numerical readout
      if (headingTextRef.current) {
        headingTextRef.current.innerText = `${Math.round(smoothed)}°`;
      }

      // Loop frame
      animationFrameIdRef.current = requestAnimationFrame(updateCompass);
    };

    if (sensorStatus === 'active') {
      animationFrameIdRef.current = requestAnimationFrame(updateCompass);
    }

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [sensorStatus, qiblaAngle]);

  return (
    <div className="space-y-6 py-4 flex flex-col items-center w-full">
      {/* Header */}
      <header className="w-full flex items-center justify-between pb-3 border-b border-white/5">
        <button 
          onClick={onBack}
          className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft size={18} className="rotate-180" />
          <span className="text-xs font-bold">الرجوع</span>
        </button>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Compass className="text-gold-accent animate-pulse" size={22} />
          بوصلة اتجاه القبلة
        </h1>
        <button 
          onClick={() => {
            fetchLocationAndCalculate(true);
            setNeedsCalibration(true);
            setTimeout(() => setNeedsCalibration(false), 5000);
          }}
          className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="تحديث الموقع والمعايرة"
        >
          <RefreshCw size={18} className={isLocating ? "animate-spin text-gold-accent" : ""} />
        </button>
      </header>

      {/* Location Status Message */}
      {isLocating && (
        <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 animate-pulse">
          <RefreshCw className="animate-spin text-gold-accent" size={16} />
          <p className="text-xs text-white/70">جاري تحديد الموقع بدقة GPS عالية...</p>
        </div>
      )}

      {locationError && !isLocating && (
        <div className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-rose-300 leading-relaxed">{locationError}</p>
        </div>
      )}

      {locationPrecisionLow && !isLocating && (
        <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-300 leading-relaxed">دقة الموقع الجغرافي منخفضة حالياً. قد يختلف اتجاه القبلة ببعض الدرجات.</p>
        </div>
      )}

      {gpsCoords && !isLocating && (
        <div className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center text-[10px] text-white/50 font-bold">
          <span>خط العرض: {gpsCoords.latitude.toFixed(4)}°</span>
          <span className="text-gold-accent/40">•</span>
          <span>خط الطول: {gpsCoords.longitude.toFixed(4)}°</span>
          <span className="text-gold-accent/40">•</span>
          <span className="text-gold-accent">القبلة: {qiblaAngle ? Math.round(qiblaAngle) : '--'}°</span>
        </div>
      )}

      {/* iOS Compass Permission Request */}
      {iosPermissionNeeded && (
        <div className="w-full p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="text-amber-400" size={32} />
          <div>
            <h3 className="font-bold text-white text-sm">مستشعر الاتجاه يتطلب إذناً</h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              تتطلب أجهزة iOS (آيفون) تفعيل صلاحية مستشعر الاتجاه يدوياً لتشغيل البوصلة بشكل صحيح ودقيق.
            </p>
          </div>
          <button
            onClick={requestIOSPermission}
            className="px-5 py-2.5 bg-gradient-to-br from-gold-accent to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg hover:shadow-gold-accent/20 active:scale-95 transition-all cursor-pointer"
          >
            تفعيل البوصلة الآن 🧭
          </button>
        </div>
      )}

      {/* Compass Render Block */}
      {sensorStatus === 'unavailable' || !isSensorAvailable ? (
        <div className="w-full p-6 rounded-3xl bg-white/5 border border-white/5 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
            <Compass size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-white text-base">مستشعر البوصلة غير متوفر</h3>
            <p className="text-xs text-white/50 leading-relaxed px-4">
              لا يمكننا الوصول لمستشعر الاتجاه المغناطيسي على هذا الجهاز. يرجى تصفح التطبيق من الهاتف المحمول لمعاينة القبلة الحية.
            </p>
          </div>
          {qiblaAngle !== null && (
            <div className="p-4 rounded-2xl bg-gold-accent/5 border border-gold-accent/10 inline-block">
              <span className="text-[10px] text-gold-accent font-bold block uppercase tracking-wider mb-1">انحراف زاوية القبلة</span>
              <span className="text-2xl font-black text-white">{Math.round(qiblaAngle)}°</span>
              <span className="text-xs text-white/50 block mt-1">باتجاه عقارب الساعة من اتجاه الشمال الجغرافي</span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center space-y-8">
          
          {/* Calibration Warning Alert Card */}
          {needsCalibration && (
            <div className="w-full p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-3 relative overflow-hidden animate-pulse">
              <style>{`
                @keyframes figure8Calibrate {
                  0% { transform: translate(0px, 0px) rotate(0deg); }
                  12.5% { transform: translate(25px, 8px) rotate(15deg); }
                  25% { transform: translate(45px, 0px) rotate(0deg); }
                  37.5% { transform: translate(25px, -8px) rotate(-15deg); }
                  50% { transform: translate(0px, 0px) rotate(0deg); }
                  62.5% { transform: translate(-25px, 8px) rotate(15deg); }
                  75% { transform: translate(-45px, 0px) rotate(0deg); }
                  87.5% { transform: translate(-25px, -8px) rotate(-15deg); }
                  100% { transform: translate(0px, 0px) rotate(0deg); }
                }
                .animate-figure8-hand {
                  animation: figure8Calibrate 3s infinite ease-in-out;
                }
              `}</style>
              
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle size={16} />
                  <span className="text-xs font-black">حرك الهاتف على شكل رقم 8 لمعايرة البوصلة</span>
                </div>
                <button 
                  onClick={() => setNeedsCalibration(false)}
                  className="text-[10px] font-bold text-white/40 hover:text-white px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
              
              <p className="text-[10px] text-white/70 text-center leading-relaxed">
                يرجى تدوير الهاتف في الهواء كشكل الرقم 8 لإعادة ضبط دقة البوصلة.
              </p>
              
              <div className="w-full h-16 relative flex items-center justify-center mt-1">
                <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-30 absolute">
                  <path 
                    d="M 60 30 C 40 10, 20 10, 20 30 C 20 50, 40 50, 60 30 C 80 10, 100 10, 100 30 C 100 50, 80 50, 60 30 Z" 
                    fill="none" 
                    stroke="#D4AF37" 
                    strokeWidth="1.5" 
                    strokeDasharray="3,3" 
                  />
                </svg>
                
                <div className="animate-figure8-hand absolute flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" className="filter drop-shadow-[0_2px_5px_rgba(212,175,55,0.4)]">
                    <rect x="6" y="2" width="12" height="20" rx="2" ry="2" fill="#0A2E24" />
                    <circle cx="12" cy="17" r="1.5" fill="#D4AF37" />
                    <path d="M 12 6 A 2 2 0 0 1 12 10" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Compass Graphic */}
          <div className="relative w-72 h-72 flex items-center justify-center select-none">
            {/* Glowing backdrop when aligned */}
            <div className={`absolute inset-4 rounded-full blur-3xl opacity-30 transition-all duration-500 ${isAligned ? 'bg-emerald-500 scale-110 shadow-[0_0_50px_rgba(16,185,129,0.4)]' : 'bg-gold-accent/5 scale-100'}`} />
            
            {/* Bezel Ring */}
            <div className={`absolute inset-0 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${isAligned ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)]' : 'border-white/10'}`}>
              <div className="absolute inset-2 rounded-full border border-dashed border-white/5" />
            </div>

            {/* Inner Dial */}
            <div 
              ref={dialRef}
              className="absolute inset-6 rounded-full bg-gradient-to-b from-[#151515] to-[#0b0b0b] border border-white/5 shadow-2xl flex items-center justify-center transition-transform duration-75 ease-out"
            >
              {/* Direction Marks */}
              <span className="absolute top-4 text-xs font-black text-rose-500">N</span>
              <span className="absolute right-4 text-xs font-black text-white/60">E</span>
              <span className="absolute bottom-4 text-xs font-black text-white/60">S</span>
              <span className="absolute left-4 text-xs font-black text-white/60">W</span>

              {/* Degrees markings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-[6px] text-white">
                <span className="absolute -translate-y-20 font-bold">0°</span>
                <span className="absolute translate-x-20 font-bold">90°</span>
                <span className="absolute translate-y-20 font-bold">180°</span>
                <span className="absolute -translate-x-20 font-bold">270°</span>
              </div>

              {/* Kaaba marker on the rotating dial */}
              {qiblaAngle !== null && (
                <div 
                  className="absolute inset-0 flex flex-col items-center pointer-events-none"
                  style={{ transform: `rotate(${qiblaAngle}deg)` }}
                >
                  <div className="absolute -top-3 w-8 h-8 rounded-full bg-gold-accent border border-black flex items-center justify-center shadow-lg text-xs">
                    🕋
                  </div>
                </div>
              )}
            </div>

            {/* Glowing Qibla Pointer Arrow (Centered & pointing directly to Kaaba) */}
            {qiblaAngle !== null && (
              <div 
                ref={arrowRef}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-transform duration-75 ease-out"
              >
                <div className="relative -translate-y-16 flex flex-col items-center">
                  {/* Arrow Head */}
                  <div 
                    className={`w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[36px] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-colors duration-500 ${
                      isAligned ? 'border-b-emerald-400' : 'border-b-gold-accent'
                    }`}
                  />
                  
                  {/* Arrow Stem */}
                  <div 
                    className={`w-3.5 h-16 -mt-1 transition-colors duration-500 ${
                      isAligned ? 'bg-emerald-400' : 'bg-gold-accent'
                    }`} 
                  />
                  
                  {/* Glow circle */}
                  <div className={`w-6 h-6 rounded-full -mt-3.5 flex items-center justify-center shadow-inner transition-colors duration-500 ${
                    isAligned ? 'bg-emerald-500 text-white' : 'bg-gold-accent text-neutral-950'
                  }`}>
                    <Navigation size={12} className="rotate-45 fill-current" />
                  </div>
                </div>
              </div>
            )}

            {/* Central Pin */}
            <div className={`absolute w-12 h-12 rounded-full border shadow-2xl flex items-center justify-center text-lg z-10 transition-all duration-500 ${
              isAligned ? 'bg-emerald-950 border-emerald-400 text-emerald-400' : 'bg-neutral-900 border-white/10 text-white/40'
            }`}>
              🕋
            </div>
          </div>

          {/* Heading Information Card */}
          <div className="w-full space-y-4">
            
            {/* Alignment Banner Badge */}
            <div className="flex justify-center h-10">
              {isAligned ? (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black shadow-lg shadow-emerald-500/5 animate-bounce">
                  <CheckCircle2 size={14} />
                  ✅ القبلة أمامك
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-white/50 text-xs font-bold">
                  أدر الهاتف باتجاه الكعبة المشرفة
                </div>
              )}
            </div>

            {/* Calibration Warning */}
            <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
              <Info size={16} className="text-gold-accent shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white">طريقة الاستخدام</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  احرص على إبقاء الهاتف مستوياً بالكامل على يدك بموازاة سطح الأرض. للحصول على القبلة بالثانية، تجنب الاقتراب من المجالات المغناطيسية القوية (مثل أجهزة اللابتوب أو الشواحن).
                </p>
              </div>
            </div>

            {/* Angle details */}
            {heading !== null && qiblaAngle !== null && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-white/30 font-bold block mb-1">اتجاه الهاتف الحالي</span>
                  <span ref={headingTextRef} className="text-xl font-black text-white">{Math.round(heading)}°</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-white/30 font-bold block mb-1">زاوية الكعبة المشرفة</span>
                  <span className="text-xl font-black text-gold-accent">{Math.round(qiblaAngle)}°</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
