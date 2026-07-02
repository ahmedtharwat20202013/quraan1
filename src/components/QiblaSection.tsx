import React, { useState, useEffect, useRef } from 'react';
import { Compass, Navigation, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

interface QiblaSectionProps {
  onBack: () => void;
}

export default function QiblaSection({ onBack }: QiblaSectionProps) {
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [heading, setHeading] = useState<number | null>(null); // phone heading relative to North (0-360)
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null); // Qibla angle relative to North (0-360)
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(true);
  const [sensorStatus, setSensorStatus] = useState<string>('waiting'); // 'waiting' | 'active' | 'unavailable'
  const [isAligned, setIsAligned] = useState<boolean>(false);
  const [needsCalibration, setNeedsCalibration] = useState<boolean>(false);

  // iOS orientation permission state
  const [isIOS, setIsIOS] = useState(false);
  const [iosPermissionNeeded, setIosPermissionNeeded] = useState(false);

  const vibratedRef = useRef(false);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const headingTextRef = useRef<HTMLSpanElement | null>(null);

  const currentHeadingRef = useRef<number>(0);
  const targetHeadingRef = useRef<number>(0);
  const compassCleanupRef = useRef<(() => void) | null>(null);

  // Kaaba absolute coordinates
  const KAABA_LAT = 21.422487;
  const KAABA_LON = 39.826206;

  // Shortest path angle interpolation with dynamic adaptive damping
  const lerpAngle = (current: number, target: number): number => {
    let diff = ((target - current + 540) % 360) - 180;
    const absDiff = Math.abs(diff);
    // Dynamic adaptive factor: micro-movements are highly damped, fast turns are responsive
    let factor = 0.04 + (absDiff / 180) * 0.25;
    if (factor > 0.25) factor = 0.25;
    return (current + diff * factor + 360) % 360;
  };

  // 1. Calculate Qibla angle based on lat/lon
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

  // 2. Fetch User coordinates with high accuracy (calibrates to < 10 meters)
  const fetchLocationAndCalculate = async (forceRefresh = false) => {
    setIsLocating(true);
    setLocationError(null);
    try {
      // Check saved coords first
      if (!forceRefresh) {
        const saved = localStorage.getItem('quran_gps_coords');
        if (saved) {
          const coords = JSON.parse(saved);
          setGpsCoords(coords);
          const angle = calculateQiblaDirection(coords.latitude, coords.longitude);
          setQiblaAngle(angle);
          setIsLocating(false);
          return;
        }
      }

      // Query GPS natively
      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        permStatus = await Geolocation.requestPermissions();
      }

      if (permStatus.location !== 'granted') {
        throw new Error('permission_denied');
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

      // Watch GPS coordinates continuously to narrow down accuracy to < 10 meters
      watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }, (position, err) => {
        if (err) {
          console.error("GPS watch error:", err);
          if (!resolved) {
            clearGPSWatch();
            // Fallback to Egypt
            setGpsCoords({ latitude: 30.9405, longitude: 31.2291 });
            setQiblaAngle(calculateQiblaDirection(30.9405, 31.2291));
          }
          return;
        }

        if (position) {
          const accuracy = position.coords.accuracy;
          console.log(`GPS Calibrating: Accuracy reached ${accuracy} meters`);

          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          setGpsCoords(coords);
          const angle = calculateQiblaDirection(coords.latitude, coords.longitude);
          setQiblaAngle(angle);

          // Save high-precision coordinates
          localStorage.setItem('quran_gps_coords', JSON.stringify(coords));

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
          console.log("GPS Calibration reached safety timeout. Keeping best resolved location.");
          clearGPSWatch();
        }
      }, 12000);

    } catch (e: any) {
      console.error(e);
      let errorMsg = 'تعذر الوصول للموقع لحساب زاوية القبلة بدقة. تم تعيين الإحداثيات الافتراضية (مصر).';
      if (e.message === 'permission_denied') {
        errorMsg = 'يرجى السماح بالوصول للموقع لحساب زاوية القبلة لبلدك بدقة.';
      }
      setLocationError(errorMsg);
      // Fallback to Egypt
      setGpsCoords({ latitude: 30.9405, longitude: 31.2291 });
      setQiblaAngle(calculateQiblaDirection(30.9405, 31.2291));
      setIsLocating(false);
    }
  };

  // 3. Request iOS permission and start listener
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

  // 4. Setup Orientation Listener with 3-layered absolute sensor fusion
  const startCompassListener = () => {
    let sensorFired = false;

    // Layer 1: AbsoluteOrientationSensor (Modern Android Sensor Fusion using magnetometer/gyroscope)
    if (typeof window !== 'undefined' && 'AbsoluteOrientationSensor' in window) {
      try {
        const sensor = new (window as any).AbsoluteOrientationSensor({ frequency: 60 });
        
        sensor.addEventListener('reading', () => {
          sensorFired = true;
          setSensorStatus('active');
          const q = sensor.quaternion;
          if (q && q.length >= 4) {
            // Convert quaternion coordinates [x, y, z, w] to Euler yaw heading
            const headingRad = Math.atan2(2 * (q[0] * q[1] + q[3] * q[2]), 1 - 2 * (q[1] * q[1] + q[2] * q[2]));
            let headingDeg = -(headingRad * 180) / Math.PI;
            const normalizedHeading = (headingDeg + 360) % 360;
            
            targetHeadingRef.current = normalizedHeading;
            setHeading((prev) => (prev === null ? normalizedHeading : prev));
          }
        });

        sensor.addEventListener('error', (event: any) => {
          console.warn("AbsoluteOrientationSensor error, falling back to DeviceOrientationEvent:", event.error);
          setupDeviceOrientationFallback();
        });

        sensor.start();

        compassCleanupRef.current = () => {
          sensor.stop();
        };
        return compassCleanupRef.current;
      } catch (err) {
        console.warn("Failed to start AbsoluteOrientationSensor, falling back:", err);
      }
    }

    // Layer 2 & 3: DeviceOrientationEvent Fallbacks (iOS webkitCompassHeading / Android absolute)
    setupDeviceOrientationFallback();
    return compassCleanupRef.current;

    function setupDeviceOrientationFallback() {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        sensorFired = true;
        setSensorStatus('active');
        
        let currentHeading: number | null = null;

        if ('webkitCompassHeading' in event) {
          // iOS Compass (native magnetometer absolute heading)
          currentHeading = (event as any).webkitCompassHeading;
          const accuracy = (event as any).webkitCompassAccuracy;
          if (accuracy !== undefined && (accuracy > 15 || accuracy < 0)) {
            setNeedsCalibration(true);
          }
        } else if (event.type === 'deviceorientationabsolute' || (event as any).absolute === true) {
          // Android absolute orientation event
          if (event.alpha !== null) {
            currentHeading = 360 - event.alpha;
          }
        }

        if (currentHeading !== null) {
          const normalizedHeading = (currentHeading + 360) % 360;
          targetHeadingRef.current = normalizedHeading;
          setHeading((prev) => (prev === null ? normalizedHeading : prev));
        }
      };

      const win = window as any;
      win.addEventListener('deviceorientationabsolute', handleOrientation);
      win.addEventListener('deviceorientation', handleOrientation);

      const timer = setTimeout(() => {
        if (!sensorFired) {
          setSensorStatus('unavailable');
          setIsSensorAvailable(false);
        }
      }, 2500);

      compassCleanupRef.current = () => {
        win.removeEventListener('deviceorientationabsolute', handleOrientation);
        win.removeEventListener('deviceorientation', handleOrientation);
        clearTimeout(timer);
      };
    }
  };

  // 5. Initialize Location and sensors
  useEffect(() => {
    fetchLocationAndCalculate();

    // Show calibration reminder on mount for 6 seconds
    setNeedsCalibration(true);
    const timer = setTimeout(() => {
      setNeedsCalibration(false);
    }, 6000);

    // Listen to compass calibration request from the OS
    const handleCalibrationNeeded = (e: Event) => {
      e.preventDefault();
      setNeedsCalibration(true);
    };
    window.addEventListener('compassneedscalibration', handleCalibrationNeeded);

    // Check device type and permission requirement
    const isIOSDevice = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const DeviceOrientationEventReq = typeof DeviceOrientationEvent !== 'undefined' ? (DeviceOrientationEvent as any).requestPermission : null;
    if (isIOSDevice && typeof DeviceOrientationEventReq === 'function') {
      setIosPermissionNeeded(true);
    } else {
      startCompassListener();
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('compassneedscalibration', handleCalibrationNeeded);
      if (compassCleanupRef.current) {
        compassCleanupRef.current();
      }
    };
  }, []);

  // 6. Smooth animation render loop (LERP + Direct DOM updates)
  useEffect(() => {
    let animationFrameId: number;

    const updateCompass = () => {
      const current = currentHeadingRef.current;
      const target = targetHeadingRef.current;

      // Butter-smooth interpolation (Dynamic adaptive damping resolves micro-jitters)
      const smoothed = lerpAngle(current, target);
      currentHeadingRef.current = smoothed;

      // 1. Rotate dial opposite of phone heading
      if (dialRef.current) {
        dialRef.current.style.transform = `rotate(${-smoothed}deg)`;
      }

      // 2. Rotate Qibla pointer pointing directly to Kaaba
      if (arrowRef.current && qiblaAngle !== null) {
        const arrowRot = qiblaAngle - smoothed;
        arrowRef.current.style.transform = `rotate(${arrowRot}deg)`;
      }

      // 3. Update numerical angle readout
      if (headingTextRef.current) {
        headingTextRef.current.innerText = `${Math.round(smoothed)}°`;
      }

      // 4. Calculate alignment (vibration)
      if (qiblaAngle !== null) {
        const diff = Math.abs(((qiblaAngle - smoothed + 540) % 360) - 180);
        const aligned = diff <= 3;
        setIsAligned(aligned);
      }

      animationFrameId = requestAnimationFrame(updateCompass);
    };

    if (sensorStatus === 'active') {
      animationFrameId = requestAnimationFrame(updateCompass);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [sensorStatus, qiblaAngle]);

  // 7. Handle Haptic Vibration on target alignment (pulsing pattern)
  useEffect(() => {
    let vibrateInterval: any = null;

    if (isAligned) {
      if (navigator.vibrate) {
        navigator.vibrate(80); // Vibrate 80ms
      }
      
      vibrateInterval = setInterval(() => {
        if (navigator.vibrate) {
          navigator.vibrate(80); // Pulse every 800ms
        }
      }, 800);
    }

    return () => {
      if (vibrateInterval) {
        clearInterval(vibrateInterval);
      }
    };
  }, [isAligned]);

  return (
    <div className="space-y-6 py-4 flex flex-col items-center w-full">
      {/* Header */}
      <header className="w-full flex items-center justify-between pb-3 border-b border-white/5">
        <button 
          onClick={onBack}
          className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 flex items-center gap-1"
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
            setTimeout(() => {
              setNeedsCalibration(false);
            }, 6000);
          }}
          className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95"
          title="تحديث الموقع والمعايرة"
        >
          <RefreshCw size={18} className={isLocating ? "animate-spin text-gold-accent" : ""} />
        </button>
      </header>

      {/* Location Status Message */}
      {isLocating && (
        <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 animate-pulse">
          <RefreshCw className="animate-spin text-gold-accent" size={16} />
          <p className="text-xs text-white/70">جاري تحديد موقعك الجغرافي بالـ GPS...</p>
        </div>
      )}

      {locationError && !isLocating && (
        <div className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-rose-300 leading-relaxed">{locationError}</p>
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

      {/* Compass Permission Request for iOS */}
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
            className="px-5 py-2.5 bg-gradient-to-br from-gold-accent to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg hover:shadow-gold-accent/20 active:scale-95 transition-all"
          >
            تفعيل البوصلة الآن 🧭
          </button>
        </div>
      )}

      {/* Compass Widget Container */}
      {sensorStatus === 'unavailable' || !isSensorAvailable ? (
        // Non-sensor device fallback
        <div className="w-full p-6 rounded-3xl bg-white/5 border border-white/5 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
            <Compass size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-white text-base">مستشعر البوصلة غير متوفر</h3>
            <p className="text-xs text-white/50 leading-relaxed px-4">
              لا يمكننا الوصول لمستشعر الاتجاه المغناطيسي على هذا الجهاز. لمزيد من الدقة، يرجى تصفح التطبيق من هاتفك المحمول.
            </p>
          </div>
          {qiblaAngle !== null && (
            <div className="p-4 rounded-2xl bg-gold-accent/5 border border-gold-accent/10 inline-block">
              <span className="text-[10px] text-gold-accent font-bold block uppercase tracking-wider mb-1">انحراف زاوية القبلة</span>
              <span className="text-2xl font-black text-white">{Math.round(qiblaAngle)}°</span>
              <span className="text-xs text-white/50 block mt-1">درجة باتجاه عقارب الساعة من اتجاه الشمال</span>
            </div>
          )}
        </div>
      ) : (
        // Active interactive Qibla Compass
        <div className="w-full flex flex-col items-center space-y-8">
          
          {/* Figure 8 Calibration Warning Alert Card */}
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
                  <span className="text-xs font-black">إشارة البوصلة ضعيفة (تحتاج معايرة)</span>
                </div>
                <button 
                  onClick={() => setNeedsCalibration(false)}
                  className="text-[10px] font-bold text-white/40 hover:text-white px-2.5 py-1 rounded-xl bg-white/5 border border-white/5"
                >
                  إغلاق
                </button>
              </div>
              
              <p className="text-[10px] text-white/70 text-center leading-relaxed">
                يرجى تحريك الهاتف بهذا الشكل لمعايرة البوصلة ودقة القبلة
              </p>
              
              {/* Figure-8 Animation Widget */}
              <div className="w-full h-16 relative flex items-center justify-center mt-1">
                {/* Background Dotted Track */}
                <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-30 absolute">
                  <path 
                    d="M 60 30 C 40 10, 20 10, 20 30 C 20 50, 40 50, 60 30 C 80 10, 100 10, 100 30 C 100 50, 80 50, 60 30 Z" 
                    fill="none" 
                    stroke="#D4AF37" 
                    strokeWidth="1.5" 
                    strokeDasharray="3,3" 
                  />
                </svg>
                
                {/* Moving Hand / Phone Icon */}
                <div className="animate-figure8-hand absolute flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="filter drop-shadow-[0_2px_5px_rgba(212,175,55,0.4)]">
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
            
            {/* Pulsing glow behind compass when aligned */}
            <div className={`absolute inset-4 rounded-full blur-3xl opacity-30 transition-all duration-500 ${isAligned ? 'bg-emerald-500 scale-110' : 'bg-gold-accent/10'}`} />
            
            {/* Glowing outer bezel ring */}
            <div className={`absolute inset-0 rounded-full border-2 transition-colors duration-500 flex items-center justify-center ${isAligned ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-white/10'}`}>
              {/* Microticks */}
              <div className="absolute inset-2 rounded-full border border-dashed border-white/5" />
            </div>

            {/* Inner Rotating Dial */}
            <div 
              ref={dialRef}
              className="absolute inset-6 rounded-full bg-gradient-to-b from-[#161616] to-[#0c0c0c] border border-white/5 shadow-2xl flex items-center justify-center"
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

              {/* Kaaba marker on the dial itself */}
              {qiblaAngle !== null && (
                <div 
                  className="absolute inset-0 flex flex-col items-center pointer-events-none"
                  style={{ transform: `rotate(${qiblaAngle}deg)` }}
                >
                  {/* Kaaba Icon marker at target angle */}
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
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                {/* Visual Arrow */}
                <div className={`relative -translate-y-16 flex flex-col items-center transition-colors duration-500`}>
                  
                  {/* Glowing Arrow head */}
                  <div 
                    className={`w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[36px] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-colors duration-500 ${
                      isAligned ? 'border-b-emerald-400' : 'border-b-gold-accent'
                    }`}
                  />
                  
                  {/* Arrow stem */}
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
            <div className="flex justify-center">
              {isAligned ? (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black shadow-lg shadow-emerald-500/5 animate-bounce">
                  <CheckCircle2 size={14} />
                  أنت باتجاه القبلة الآن 🕋
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
                <h4 className="text-xs font-black text-white">طريقة المعايرة والاستخدام</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  ضع الهاتف بشكل مسطح تماماً على راحة يدك (موازياً للأرض). إذا لاحظت عدم دقة في المؤشر، قم بتحريك الهاتف بالهواء على شكل رقم (8) لمعايرة مستشعر البوصلة المغناطيسي.
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
