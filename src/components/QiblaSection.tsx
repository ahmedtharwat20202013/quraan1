import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Navigation, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Info, Search, MapPin, Wifi } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { OFFLINE_CITIES, OfflineCity } from '../services/offlineGeocoder';
import EmptyState from './ui/EmptyState';

interface QiblaSectionProps {
  onBack: () => void;
}

// ─── Sensor Fusion: Complementary Filter (Compass + Gyroscope) ──────────────
class CompassGyroFusion {
  private fusedHeading: number = 0;
  private lastGyroTimestamp: number = 0;
  private gyroContrib: number = 0;
  // Weight for gyroscope contribution between compass updates (0–1)
  // Higher = more gyro (smoother but drifts), Lower = more compass (noisier but accurate)
  private readonly GYRO_WEIGHT = 0.75;
  private readonly COMPASS_CORRECTION_RATE = 0.08;
  private isInitialized: boolean = false;

  initWithHeading(heading: number) {
    this.fusedHeading = heading;
    this.gyroContrib = heading;
    this.isInitialized = true;
  }

  updateGyro(rotationRateZ: number, timestamp: number): number | null {
    if (!this.isInitialized) return null;
    if (this.lastGyroTimestamp === 0) {
      this.lastGyroTimestamp = timestamp;
      return null;
    }
    const dt = Math.min((timestamp - this.lastGyroTimestamp) / 1000, 0.1); // cap dt at 100ms
    this.lastGyroTimestamp = timestamp;

    // Integrate gyro to get delta rotation (degrees)
    // rotationRateZ is in deg/s from DeviceMotion alpha
    const delta = rotationRateZ * dt;
    this.gyroContrib = (this.gyroContrib + delta + 360) % 360;

    return this.fusedHeading;
  }

  updateCompass(compassHeading: number): number {
    if (!this.isInitialized) {
      this.initWithHeading(compassHeading);
      return compassHeading;
    }
    // Complementary filter: pull gyro estimate towards compass truth
    const diff = ((compassHeading - this.gyroContrib + 540) % 360) - 180;
    this.gyroContrib = (this.gyroContrib + diff * (1 - this.GYRO_WEIGHT) + 360) % 360;
    this.fusedHeading = this.gyroContrib;

    return this.fusedHeading;
  }

  getHeading(): number {
    return this.fusedHeading;
  }
}

// ─── Kalman Filter for Compass Heading ──────────────────────────────────────
class QiblaKalmanFilter {
  private x: number = 0; // Heading state estimate
  private P: number = 5.0; // Estimation error covariance
  private readonly Q: number = 0.02; // Process noise covariance (lower = smoother)
  private readonly R: number = 1.8; // Measurement noise covariance (higher = filters more jitter)
  private isInitialized: boolean = false;

  initWithHeading(heading: number) {
    this.x = heading;
    this.P = 5.0;
    this.isInitialized = true;
  }

  update(measurement: number): number {
    if (!this.isInitialized) {
      this.initWithHeading(measurement);
      return measurement;
    }

    // Prediction Phase
    this.P = this.P + this.Q;

    // Measurement Update Phase
    // Handle wrap-around difference
    let diff = ((measurement - this.x + 540) % 360) - 180;

    // Kalman gain calculation
    const K = this.P / (this.P + this.R);

    // Update state and clamp angle between [0, 360)
    this.x = (this.x + K * diff + 360) % 360;

    // Update error covariance
    this.P = (1 - K) * this.P;

    return this.x;
  }

  getHeading(): number {
    return this.x;
  }
}

export default function QiblaSection({ onBack }: QiblaSectionProps) {
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPrecisionLow, setLocationPrecisionLow] = useState(false);

  const [heading, setHeading] = useState<number | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(true);
  const [sensorStatus, setSensorStatus] = useState<string>('waiting');
  const [isAligned, setIsAligned] = useState<boolean>(false);
  const [needsCalibration, setNeedsCalibration] = useState<boolean>(false);
  const [magneticInterference, setMagneticInterference] = useState<boolean>(false);

  // Visual feedback state — arrow color/scale changes as user approaches Qibla
  const [proximityLevel, setProximityLevel] = useState<'far' | 'near' | 'close' | 'aligned'>('far');

  // Manual city selection
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return OFFLINE_CITIES;
    return OFFLINE_CITIES.filter(city =>
      city.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const [isIOS, setIsIOS] = useState(false);
  const [iosPermissionNeeded, setIosPermissionNeeded] = useState(false);

  // Direct DOM refs for 60fps animation without React re-renders
  const dialRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const arrowHeadRef = useRef<HTMLDivElement | null>(null);
  const arrowStemRef = useRef<HTMLDivElement | null>(null);
  const arrowGlowRef = useRef<HTMLDivElement | null>(null);
  const headingTextRef = useRef<HTMLSpanElement | null>(null);
  const alignmentContainerRef = useRef<HTMLDivElement | null>(null);
  const bezelRef = useRef<HTMLDivElement | null>(null);
  const backdropGlowRef = useRef<HTMLDivElement | null>(null);

  // Core sensor refs
  const currentHeadingRef = useRef<number>(0);
  const targetHeadingRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isAlignedRef = useRef<boolean>(false);
  const compassCleanupRef = useRef<(() => void) | null>(null);
  const gpsWatchIdRef = useRef<string | null>(null);
  const gpsTimeoutRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const screenAdjustmentRef = useRef<number>(0);
  const isUnmountedRef = useRef<boolean>(false);

  // Vibration throttle — prevents spamming vibration on every frame
  const lastVibrationRef = useRef<number>(0);
  const hasPlayedAlignmentSoundRef = useRef<boolean>(false);
  const alignmentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Magnetic interference detection — track recent readings variance
  const recentReadingsRef = useRef<number[]>([]);

  // Sensor fusion instance (persists across renders)
  const fusionRef = useRef<CompassGyroFusion>(new CompassGyroFusion());
  const kalmanRef = useRef<QiblaKalmanFilter>(new QiblaKalmanFilter());
  const proximityCircleRef = useRef<HTMLDivElement | null>(null);
  const currentArrowRotRef = useRef<number>(0);
  const hasVibratedRef = useRef<boolean>(false);
  const kaabaMarkerRef = useRef<HTMLDivElement | null>(null);
  const screenAdjustmentTimeoutRef = useRef<any>(null);
  const calibrationTimeoutRef = useRef<any>(null);

  const KAABA_LAT = 21.422487;
  const KAABA_LON = 39.826206;

  // Haversine distance (meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── Adaptive Low-Pass Filter with ease-out interpolation ──────────────────
  // Eliminates "stuck needle" jerk by using dynamic alpha based on movement speed
  const filterAngle = (current: number, target: number): number => {
    let diff = ((target - current + 540) % 360) - 180;
    const speed = Math.abs(diff);

    // Dynamic alpha: aggressive for large movements, gentle for micro-adjustments
    let alpha: number;
    if (speed < 0.5) {
      alpha = 0.018; // Micro-movements: ultra-slow ease — eliminates freeze/jerk
    } else if (speed < 2) {
      alpha = 0.07;  // Fine-tuning zone
    } else if (speed < 8) {
      alpha = 0.14;  // Normal tracking
    } else if (speed < 20) {
      alpha = 0.22;  // Fast tracking
    } else {
      alpha = 0.30;  // Rapid spin — catch up quickly
    }

    // Cubic ease-out: decelerates smoothly as target is approached
    const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(t, 1), 3);
    const smoothedAlpha = easeOut(alpha);

    return (current + diff * smoothedAlpha + 360) % 360;
  };

  // ── Qibla Angle (Great Circle bearing) ────────────────────────────────────
  const calculateQiblaDirection = (lat: number, lon: number): number => {
    const phi1 = (lat * Math.PI) / 180;
    const lambda1 = (lon * Math.PI) / 180;
    const phi2 = (KAABA_LAT * Math.PI) / 180;
    const lambda2 = (KAABA_LON * Math.PI) / 180;
    const dLon = lambda2 - lambda1;
    const y = Math.sin(dLon);
    const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  // ── Graduated Vibration Pattern based on proximity to Qibla ──────────────
  const getVibrationPattern = (diff: number): number[] | null => {
    const now = Date.now();
    const throttleMs = diff <= 1 ? 2000 : diff <= 3 ? 1500 : diff <= 5 ? 2500 : 4000;
    if (now - lastVibrationRef.current < throttleMs) return null;

    if (diff <= 1) return [0, 200, 80, 200];      // Perfect: double pulse
    if (diff <= 3) return [0, 150, 60, 150];       // Very close: medium double
    if (diff <= 5) return [0, 100, 0, 0];          // Close: single medium
    if (diff <= 10) return [0, 50];                // Approaching: light tick
    return null;
  };

  // ── Visual color/scale based on proximity ─────────────────────────────────
  // Returns { arrowColor, glowColor, scale } for direct DOM update
  const getProximityStyle = (diff: number) => {
    if (diff <= 1)  return { color: '#10b981', glow: 'rgba(16,185,129,0.85)', scale: 1.05, level: 'aligned' as const };
    if (diff <= 3)  return { color: '#34d399', glow: 'rgba(52,211,153,0.65)', scale: 1.03, level: 'close'   as const };
    if (diff <= 8)  return { color: '#fbbf24', glow: 'rgba(251,191,36,0.60)', scale: 1.02, level: 'near'    as const };
    if (diff <= 15) return { color: '#f59e0b', glow: 'rgba(245,158,11,0.50)',  scale: 1.01, level: 'near'    as const };
    return           { color: '#D4AF37', glow: 'rgba(212,175,55,0.40)',   scale: 1.00, level: 'far'     as const };
  };

  // ── Magnetic Interference Detection ───────────────────────────────────────
  const checkMagneticInterference = (newReading: number): boolean => {
    const readings = recentReadingsRef.current;
    readings.push(newReading);
    if (readings.length > 20) readings.shift(); // Keep last 20 readings (~0.3s at 60fps)
    if (readings.length < 10) return false;

    const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
    const variance = readings.reduce((sum, r) => {
      // Handle angular wrap-around
      let d = r - mean;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return sum + d * d;
    }, 0) / readings.length;

    return variance > 120; // High variance = erratic readings = likely interference
  };

  // ── GPS Watcher cleanup ───────────────────────────────────────────────────
  const clearGPSWatch = useCallback(() => {
    if (gpsWatchIdRef.current) {
      Geolocation.clearWatch({ id: gpsWatchIdRef.current }).catch(err =>
        console.error('Error clearing watch:', err)
      );
      gpsWatchIdRef.current = null;
    }
    if (gpsTimeoutRef.current) {
      clearTimeout(gpsTimeoutRef.current);
      gpsTimeoutRef.current = null;
    }
    setIsLocating(false);
  }, []);

  const handleSelectCity = (city: OfflineCity) => {
    const coords = { latitude: city.lat, longitude: city.lon };
    setGpsCoords(coords);
    setQiblaAngle(calculateQiblaDirection(coords.latitude, coords.longitude));
    localStorage.setItem('quran_gps_coords', JSON.stringify(coords));
    localStorage.setItem('quran_gps_address', city.name);
    setLocationError(null);
    setLocationPrecisionLow(true);
    setShowCitySelector(false);
  };

  // ── Location fetch ─────────────────────────────────────────────────────────
  const fetchLocationAndCalculate = async (forceRefresh = false) => {
    setIsLocating(true);
    setLocationError(null);
    setLocationPrecisionLow(false);

    try {
      if (!forceRefresh) {
        const saved = localStorage.getItem('quran_gps_coords');
        if (saved) {
          try {
            const coords = JSON.parse(saved);
            if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
              lastCoordsRef.current = coords;
              setGpsCoords(coords);
              setQiblaAngle(calculateQiblaDirection(coords.latitude, coords.longitude));
              setIsLocating(false);
              return;
            }
          } catch {
            localStorage.removeItem('quran_gps_coords');
          }
        }
      }

      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        permStatus = await Geolocation.requestPermissions();
      }
      if (permStatus.location !== 'granted') throw new Error('permission_denied');

      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        (position, err) => {
          if (err) {
            console.warn('GPS watch update error:', err);
            if (!lastCoordsRef.current) {
              const saved = localStorage.getItem('quran_gps_coords');
              if (saved) {
                try {
                  const coords = JSON.parse(saved);
                  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
                    setGpsCoords(coords);
                    setQiblaAngle(calculateQiblaDirection(coords.latitude, coords.longitude));
                  }
                } catch {
                  localStorage.removeItem('quran_gps_coords');
                }
              } else {
                setLocationPrecisionLow(true);
                const fallback = { latitude: 30.0444, longitude: 31.2357 };
                setGpsCoords(fallback);
                setQiblaAngle(calculateQiblaDirection(fallback.latitude, fallback.longitude));
                setShowCitySelector(true);
              }
            }
            clearGPSWatch();
            return;
          }

          if (position) {
            const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            if (lastCoordsRef.current) {
              const dist = calculateDistance(
                lastCoordsRef.current.latitude, lastCoordsRef.current.longitude,
                coords.latitude, coords.longitude
              );
              if (dist < 50) { setIsLocating(false); return; }
            }
            lastCoordsRef.current = coords;
            setGpsCoords(coords);
            setQiblaAngle(calculateQiblaDirection(coords.latitude, coords.longitude));
            localStorage.setItem('quran_gps_coords', JSON.stringify(coords));
            setLocationPrecisionLow(position.coords.accuracy > 100);
            if (position.coords.accuracy <= 15) clearGPSWatch();
          }
        }
      );

      if (isUnmountedRef.current) {
        Geolocation.clearWatch({ id: watchId }).catch(() => {});
      } else {
        gpsWatchIdRef.current = watchId;
      }

      gpsTimeoutRef.current = setTimeout(() => {
        if (gpsWatchIdRef.current) clearGPSWatch();
      }, 8000);

    } catch (e: any) {
      console.warn(e);
      const msg =
        e.message === 'permission_denied'
          ? 'تم رفض إذن الوصول للموقع. يرجى تفعيل الصلاحية أو اختيار المدينة يدوياً.'
          : 'تعذر الحصول على الموقع الجغرافي. يرجى اختيار المدينة يدوياً.';
      setLocationError(msg);
      setLocationPrecisionLow(true);
      const saved = localStorage.getItem('quran_gps_coords');
      if (saved) {
        try {
          const coords = JSON.parse(saved);
          setGpsCoords(coords);
          setQiblaAngle(calculateQiblaDirection(coords.latitude, coords.longitude));
        } catch {
          const fallback = { latitude: 30.0444, longitude: 31.2357 };
          setGpsCoords(fallback);
          setQiblaAngle(calculateQiblaDirection(fallback.latitude, fallback.longitude));
          setShowCitySelector(true);
        }
      } else {
        const fallback = { latitude: 30.0444, longitude: 31.2357 };
        setGpsCoords(fallback);
        setQiblaAngle(calculateQiblaDirection(fallback.latitude, fallback.longitude));
        setShowCitySelector(true);
      }
      setIsLocating(false);
    }
  };

  const requestIOSPermission = async () => {
    const req = (DeviceOrientationEvent as any).requestPermission;
    if (typeof req === 'function') {
      try {
        const state = await req();
        if (state === 'granted') {
          setIosPermissionNeeded(false);
          startCompassListener();
        } else {
          setSensorStatus('unavailable');
          setIsSensorAvailable(false);
        }
      } catch (e) {
        setSensorStatus('unavailable');
        setIsSensorAvailable(false);
      }
    }
  };

  // ── Compass + Gyroscope listener setup ────────────────────────────────────
  const startCompassListener = () => {
    let sensorFired = false;
    let absoluteSensorActive = false;
    let absoluteSensor: any = null;
    setSensorStatus('active');

    const handleOrientationData = (alpha: number | null, webkitHeading?: number) => {
      // If AbsoluteOrientationSensor is actively updating, bypass deviceorientation to avoid redundancy
      if (absoluteSensorActive) return;
      sensorFired = true;
      let rawHeading: number | null = null;

      if (webkitHeading !== undefined && !isNaN(webkitHeading)) {
        rawHeading = webkitHeading;
      } else if (alpha !== null && !isNaN(alpha)) {
        rawHeading = (360 - alpha) % 360;
      }

      if (rawHeading !== null) {
        const normalizedHeading = (rawHeading + screenAdjustmentRef.current + 360) % 360;

        // Magnetic interference check
        const hasInterference = checkMagneticInterference(normalizedHeading);
        setMagneticInterference(hasInterference);

        // Fusion: update compass reading
        const fused = fusionRef.current.updateCompass(normalizedHeading);
        targetHeadingRef.current = fused;

        setHeading(prev => (prev === null ? fused : prev));
      }
    };

    const handleMotionData = (event: DeviceMotionEvent) => {
      if (absoluteSensorActive) return;
      const rotRate = event.rotationRate;
      if (rotRate && rotRate.alpha !== null) {
        // alpha is rotation around z-axis in deg/s
        fusionRef.current.updateGyro(rotRate.alpha, event.timeStamp);
      }
    };

    let motionListener: any = null;
    let webCleanup: (() => void) | null = null;
    let onReading: (() => void) | null = null;
    let onError: ((err: any) => void) | null = null;

    const setupAbsoluteOrientationSensor = () => {
      const win = window as any;
      if (typeof win !== 'undefined' && 'AbsoluteOrientationSensor' in win) {
        try {
          const sensor = new win.AbsoluteOrientationSensor({ frequency: 60 });
          onReading = () => {
            sensorFired = true;
            absoluteSensorActive = true;
            const q = sensor.quaternion;
            if (q && q.length >= 4) {
              // Convert quaternion to Euler yaw / heading angle
              const headingRad = Math.atan2(
                2 * (q[0] * q[1] + q[2] * q[3]),
                1 - 2 * (q[1] * q[1] + q[2] * q[2])
              );
              let headingDeg = (-headingRad * 180) / Math.PI;
              headingDeg = (headingDeg + 360) % 360;

              const normalizedHeading = (headingDeg + screenAdjustmentRef.current + 360) % 360;

              // Magnetic interference check
              const hasInterference = checkMagneticInterference(normalizedHeading);
              setMagneticInterference(hasInterference);

              targetHeadingRef.current = normalizedHeading;
              setHeading(prev => (prev === null ? normalizedHeading : prev));
            }
          };
          onError = (err: any) => {
            console.warn('AbsoluteOrientationSensor error, falling back to Web APIs:', err);
            absoluteSensorActive = false;
          };

          sensor.addEventListener('reading', onReading);
          sensor.addEventListener('error', onError);
          sensor.start();
          absoluteSensor = sensor;
          return true;
        } catch (e) {
          console.warn('Failed to initialize AbsoluteOrientationSensor:', e);
        }
      }
      return false;
    };

    const setupMotionListener = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { Motion } = await import('@capacitor/motion');
          const listener = await Motion.addListener('orientation', (event) => {
            handleOrientationData(event.alpha, (event as any).webkitCompassHeading);
          });
          if (isUnmountedRef.current) {
            listener.remove();
            return false;
          }
          motionListener = listener;
          console.log('Using Capacitor Motion native orientation listener.');
          return true;
        }
      } catch (err) {
        console.warn('Capacitor Motion setup failed, falling back to Web APIs', err);
      }
      return false;
    };

    const setupWebListeners = () => {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        handleOrientationData(event.alpha, (event as any).webkitCompassHeading);
      };

      const win = window as any;
      const supportsAbsolute = 'ondeviceorientationabsolute' in win;

      if (supportsAbsolute) {
        win.addEventListener('deviceorientationabsolute', handleOrientation);
      } else {
        win.addEventListener('deviceorientation', handleOrientation);
      }

      // Gyroscope via DeviceMotion (Web)
      window.addEventListener('devicemotion', handleMotionData);

      return () => {
        if (supportsAbsolute) {
          win.removeEventListener('deviceorientationabsolute', handleOrientation);
        } else {
          win.removeEventListener('deviceorientation', handleOrientation);
        }
        window.removeEventListener('devicemotion', handleMotionData);
      };
    };

    // Attempt AbsoluteOrientationSensor first, then fall back to Capacitor Motion or Web DeviceOrientation APIs
    const sensorSuccess = setupAbsoluteOrientationSensor();
    
    setupMotionListener().then(success => {
      if (isUnmountedRef.current) {
        if (motionListener) motionListener.remove();
        return;
      }
      if (!success && !sensorSuccess) webCleanup = setupWebListeners();
    });

    const timer = setTimeout(() => {
      if (!sensorFired) {
        setSensorStatus('unavailable');
        setIsSensorAvailable(false);
      }
    }, 2000);

    compassCleanupRef.current = () => {
      if (motionListener) {
        motionListener.remove();
      }
      if (webCleanup) {
        webCleanup();
      }
      if (absoluteSensor) {
        try {
          absoluteSensor.stop();
          if (onReading) absoluteSensor.removeEventListener('reading', onReading);
          if (onError) absoluteSensor.removeEventListener('error', onError);
        } catch (e) {
          console.warn('Error cleaning up orientation sensor:', e);
        }
      }
      clearTimeout(timer);
    };
  };

  // ── Initialization effect ──────────────────────────────────────────────────
  useEffect(() => {
    isUnmountedRef.current = false;
    fetchLocationAndCalculate();

    const updateScreenAdjustment = () => {
      if (screenAdjustmentTimeoutRef.current) {
        clearTimeout(screenAdjustmentTimeoutRef.current);
      }
      screenAdjustmentTimeoutRef.current = setTimeout(() => {
        if (typeof window !== 'undefined') {
          if (window.screen?.orientation) {
            screenAdjustmentRef.current = window.screen.orientation.angle;
          } else if ('orientation' in window) {
            screenAdjustmentRef.current = (window as any).orientation || 0;
          }
        }
      }, 100);
    };

    updateScreenAdjustment();

    if (typeof window !== 'undefined') {
      if (window.screen?.orientation) {
        window.screen.orientation.addEventListener('change', updateScreenAdjustment);
      } else {
        window.addEventListener('orientationchange', updateScreenAdjustment);
      }
      window.addEventListener('resize', updateScreenAdjustment);
    }

    const handleCalibrationNeeded = (e: Event) => {
      e.preventDefault();
      setNeedsCalibration(true);
    };
    window.addEventListener('compassneedscalibration', handleCalibrationNeeded);

    const isIOSDevice =
      typeof window !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const DeviceOrientationEventReq =
      typeof DeviceOrientationEvent !== 'undefined'
        ? (DeviceOrientationEvent as any).requestPermission
        : null;

    if (isIOSDevice && typeof DeviceOrientationEventReq === 'function') {
      setIosPermissionNeeded(true);
    } else {
      startCompassListener();
    }

    return () => {
      isUnmountedRef.current = true;
      window.removeEventListener('compassneedscalibration', handleCalibrationNeeded);

      if (typeof window !== 'undefined') {
        if (window.screen?.orientation) {
          window.screen.orientation.removeEventListener('change', updateScreenAdjustment);
        } else {
          window.removeEventListener('orientationchange', updateScreenAdjustment);
        }
        window.removeEventListener('resize', updateScreenAdjustment);
      }

      if (compassCleanupRef.current) compassCleanupRef.current();
      clearGPSWatch();

      if (screenAdjustmentTimeoutRef.current) {
        clearTimeout(screenAdjustmentTimeoutRef.current);
      }
      if (calibrationTimeoutRef.current) {
        clearTimeout(calibrationTimeoutRef.current);
      }

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }

      // Cleanup alignment audio
      if (alignmentAudioRef.current) {
        alignmentAudioRef.current.pause();
        alignmentAudioRef.current.src = '';
        alignmentAudioRef.current = null;
      }
    };
  }, []);

  // ── Auto-Calibration and Variance Check (Every 5 seconds) ──────────────────
  useEffect(() => {
    const calibrationInterval = setInterval(() => {
      const readings = recentReadingsRef.current;
      if (readings.length >= 10) {
        const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
        const variance = readings.reduce((sum, r) => {
          let d = r - mean;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          return sum + d * d;
        }, 0) / readings.length;

        // If variance > 50, trigger magnetic interference alert
        if (variance > 50) {
          setMagneticInterference(true);
        } else {
          setMagneticInterference(false);
        }
      }
    }, 5000);

    return () => clearInterval(calibrationInterval);
  }, []);

  // ── 60fps Animation Loop with Kalman Filter + Visual/Haptic feedback ────────
  useEffect(() => {
    const updateCompass = () => {
      const target = targetHeadingRef.current;

      const smoothed = kalmanRef.current.update(target);
      currentHeadingRef.current = smoothed;

      // A. Keep dial static (reference N, E, S, W stay fixed relative to phone)
      if (dialRef.current) {
        dialRef.current.style.transform = 'rotate(0deg)';
      }

      // B. Arrow + proximity visual feedback
      if (arrowRef.current && qiblaAngle !== null) {
        // Calculate target rotation relative to top (12 o'clock)
        const targetArrowRot = qiblaAngle - smoothed;

        // Initialize starting rotation if not set
        if (currentArrowRotRef.current === 0) {
          currentArrowRotRef.current = targetArrowRot;
        }

        // shortest path wrap-around
        let deltaAngle = ((targetArrowRot - currentArrowRotRef.current + 540) % 360) - 180;

        // Filter micro-jitter to keep arrow stable when held still
        if (Math.abs(deltaAngle) < 0.15) {
          deltaAngle = 0;
        }

        // Adaptive LERP factor (natural ease-out: slower as it gets closer, faster when far)
        const lerpFactor = Math.max(0.04, Math.min(0.24, Math.abs(deltaAngle) / 28));
        currentArrowRotRef.current = (currentArrowRotRef.current + deltaAngle * lerpFactor + 360) % 360;

        const arrowRot = currentArrowRotRef.current;
        const diff = Math.abs(((arrowRot + 180) % 360) - 180); // relative diff to top (0 degrees)
        const aligned = diff <= 1; // Aligned within 1 degree
        const { color, glow, scale, level } = getProximityStyle(diff);

        // Arrow rotation + scale
        arrowRef.current.style.transform = `rotate(${arrowRot}deg) scale(${scale})`;

        // Rotate Kaaba marker on the dial to match the relative Qibla angle
        if (kaabaMarkerRef.current) {
          kaabaMarkerRef.current.style.transform = `rotate(${arrowRot}deg)`;
        }

        // Proximity Circle dynamic update
        if (proximityCircleRef.current) {
          if (diff <= 35) {
            const progress = (35 - diff) / 35; // 0 (far) to 1 (aligned)
            const targetScale = 1.2 - progress * 0.45; // shrinks from 1.2 to 0.75
            const targetOpacity = 0.15 + progress * 0.75; // fades in from 0.15 to 0.90
            proximityCircleRef.current.style.transform = `scale(${targetScale})`;
            proximityCircleRef.current.style.opacity = `${targetOpacity}`;
            proximityCircleRef.current.style.borderColor = aligned ? '#10b981' : diff <= 8 ? '#fbbf24' : '#fbbf24';
            proximityCircleRef.current.style.borderWidth = aligned ? '2px' : '1px';
            proximityCircleRef.current.style.boxShadow = aligned 
              ? '0 0 15px rgba(16,185,129,0.3)' 
              : 'none';
          } else {
            proximityCircleRef.current.style.opacity = '0';
          }
        }

        // Arrow head color
        if (arrowHeadRef.current) {
          arrowHeadRef.current.style.borderBottomColor = color;
        }
        // Arrow stem color
        if (arrowStemRef.current) {
          arrowStemRef.current.style.backgroundColor = color;
        }
        // Glow dot color
        if (arrowGlowRef.current) {
          arrowGlowRef.current.style.backgroundColor = color;
          arrowGlowRef.current.style.boxShadow = `0 0 12px ${glow}`;
        }

        // Backdrop glow intensity
        if (backdropGlowRef.current) {
          backdropGlowRef.current.style.opacity = aligned ? '0.45' : diff <= 8 ? '0.2' : '0.08';
          backdropGlowRef.current.style.backgroundColor = aligned ? '#10b981' : diff <= 8 ? '#fbbf24' : '#D4AF37';
        }

        // Bezel ring color
        if (bezelRef.current) {
          bezelRef.current.style.borderColor = aligned ? '#10b981' : diff <= 8 ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)';
          bezelRef.current.style.boxShadow = aligned
            ? '0 0 30px rgba(16,185,129,0.35)'
            : diff <= 8
            ? '0 0 15px rgba(251,191,36,0.15)'
            : 'none';
        }

        // C. Vibration on alignment entry (once per event)
        if (aligned) {
          if (!hasVibratedRef.current) {
            if (navigator.vibrate) {
              navigator.vibrate(80); // light vibration once
            }
            hasVibratedRef.current = true;
          }
        } else if (diff > 3) {
          hasVibratedRef.current = false;
        }

        // D. Alignment sound — plays once per alignment event
        if (aligned && !hasPlayedAlignmentSoundRef.current) {
          hasPlayedAlignmentSoundRef.current = true;
          try {
            const audio = new Audio('/audio/alignment_soft.mp3');
            audio.volume = 0.25;
            alignmentAudioRef.current = audio;
            audio.play().catch(() => {});
          } catch {}
        } else if (!aligned && diff > 3) {
          hasPlayedAlignmentSoundRef.current = false;
        }

        // E. React state updates (throttled — only on alignment change)
        if (aligned !== isAlignedRef.current) {
          isAlignedRef.current = aligned;
          setIsAligned(aligned);
          setProximityLevel(level);
        }
      }

      // F. Heading readout
      if (headingTextRef.current) {
        headingTextRef.current.innerText = `${Math.round(smoothed)}°`;
      }

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
          aria-label="الرجوع للقائمة الرئيسية"
          className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft size={18} className="rotate-180" />
          <span className="text-xs font-bold">الرجوع</span>
        </button>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Compass className="text-gold-accent animate-pulse" size={22} aria-hidden="true" />
          بوصلة اتجاه القبلة
        </h1>
        <button
          onClick={() => {
            fetchLocationAndCalculate(true);
            setNeedsCalibration(true);
            if (calibrationTimeoutRef.current) {
              clearTimeout(calibrationTimeoutRef.current);
            }
            calibrationTimeoutRef.current = setTimeout(() => {
              if (!isUnmountedRef.current) {
                setNeedsCalibration(false);
              }
            }, 5000);
          }}
          aria-label="تحديث الموقع وإعادة معايرة البوصلة"
          className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="تحديث الموقع والمعايرة"
        >
          <RefreshCw size={18} className={isLocating ? 'animate-spin text-gold-accent' : ''} />
        </button>
      </header>

      {/* Location Status */}
      {isLocating && (
        <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 animate-pulse">
          <RefreshCw className="animate-spin text-gold-accent" size={16} />
          <p className="text-xs text-white/70">جاري تحديد الموقع بدقة GPS عالية...</p>
        </div>
      )}

      {locationError && !isLocating && (
        <div className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-rose-300 leading-relaxed">{locationError}</p>
          </div>
          <button
            onClick={() => setShowCitySelector(true)}
            className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            اختر المدينة يدوياً 🏙️
          </button>
        </div>
      )}

      {locationPrecisionLow && !isLocating && (
        <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-300 leading-relaxed">
            دقة الموقع الجغرافي منخفضة حالياً. قد يختلف اتجاه القبلة ببعض الدرجات.
          </p>
        </div>
      )}

      {/* Magnetic Interference Warning */}
      {magneticInterference && !needsCalibration && (
        <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-pulse">
          <Wifi className="text-red-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-red-300 leading-relaxed">
            ⚠️ تداخل مغناطيسي مرصود! ابتعد عن الأجهزة الإلكترونية، المعادن الكبيرة، أو الشواحن للحصول على قراءة دقيقة.
          </p>
        </div>
      )}

      {gpsCoords && !isLocating && (
        <div className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center text-[10px] text-white/50 font-bold">
          <span>خط العرض: {gpsCoords.latitude.toFixed(4)}°</span>
          <span className="text-gold-accent/40">•</span>
          <span>خط الطول: {gpsCoords.longitude.toFixed(4)}°</span>
          <span className="text-gold-accent/40">•</span>
          <span className="text-gold-accent">القبلة: {qiblaAngle ? Math.round(qiblaAngle) : '--'}°</span>
          <span className="text-gold-accent/40">•</span>
          <button
            onClick={() => setShowCitySelector(true)}
            className="text-gold-accent hover:underline cursor-pointer"
          >
            تغيير
          </button>
        </div>
      )}

      {/* iOS Permission */}
      {iosPermissionNeeded && (
        <div className="w-full p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="text-amber-400" size={32} />
          <div>
            <h3 className="font-bold text-white text-sm">مستشعر الاتجاه يتطلب إذناً</h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              تتطلب أجهزة iOS (آيفون) تفعيل صلاحية مستشعر الاتجاه يدوياً لتشغيل البوصلة.
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

      {/* Compass Render */}
      {sensorStatus === 'unavailable' || !isSensorAvailable ? (
        <div className="w-full p-6 rounded-3xl bg-white/5 border border-white/5 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
            <Compass size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-white text-base">مستشعر البوصلة غير متوفر</h3>
            <p className="text-xs text-white/50 leading-relaxed px-4">
              لا يمكننا الوصول لمستشعر الاتجاه المغناطيسي على هذا الجهاز. يرجى تصفح التطبيق من الهاتف المحمول.
            </p>
          </div>
          {qiblaAngle !== null && (
            <div className="p-4 rounded-2xl bg-gold-accent/5 border border-gold-accent/10 inline-block">
              <span className="text-[10px] text-gold-accent font-bold block uppercase tracking-wider mb-1">انحراف زاوية القبلة</span>
              <span className="text-2xl font-black text-white">{Math.round(qiblaAngle)}°</span>
              <span className="text-xs text-white/50 block mt-1">باتجاه عقارب الساعة من الشمال الجغرافي</span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center space-y-8">

          {/* Calibration Warning */}
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
                .animate-figure8-hand { animation: figure8Calibrate 3s infinite ease-in-out; }
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
                    fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="3,3"
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
            {/* Dynamic Backdrop Glow */}
            <div
              ref={backdropGlowRef}
              className="absolute inset-4 rounded-full blur-3xl transition-colors duration-700"
              style={{ opacity: 0.08, backgroundColor: '#D4AF37' }}
            />

            {/* Bezel Ring */}
            <div
              ref={bezelRef}
              className="absolute inset-0 rounded-full border-2 transition-all duration-500 flex items-center justify-center"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="absolute inset-2 rounded-full border border-dashed border-white/5" />
            </div>

            {/* Fixed Top Reference Indicator (12 o'clock) */}
            <div className="absolute top-0 w-2.5 h-6 z-30 flex flex-col items-center pointer-events-none">
              <div className="w-1 h-3.5 bg-amber-500 rounded-full" />
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-amber-500 -mt-0.5" />
            </div>

            {/* Proximity Circle (Graduated Visual Feedback) */}
            <div
              ref={proximityCircleRef}
              className="absolute rounded-full border border-dashed transition-all duration-300 pointer-events-none flex items-center justify-center"
              style={{ width: '220px', height: '220px', opacity: 0, transform: 'scale(1.2)' }}
            />

            {/* Inner Dial */}
            <div
              ref={dialRef}
              className="absolute inset-6 rounded-full bg-gradient-to-b from-[#151515] to-[#0b0b0b] border border-white/5 shadow-2xl flex items-center justify-center"
            >
              <span className="absolute top-4 text-xs font-black text-rose-500">N</span>
              <span className="absolute right-4 text-xs font-black text-white/60">E</span>
              <span className="absolute bottom-4 text-xs font-black text-white/60">S</span>
              <span className="absolute left-4 text-xs font-black text-white/60">W</span>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-[6px] text-white">
                <span className="absolute -translate-y-20 font-bold">0°</span>
                <span className="absolute translate-x-20 font-bold">90°</span>
                <span className="absolute translate-y-20 font-bold">180°</span>
                <span className="absolute -translate-x-20 font-bold">270°</span>
              </div>

              {/* Kaaba marker on rotating dial */}
              {qiblaAngle !== null && (
                <div
                  ref={kaabaMarkerRef}
                  className="absolute inset-0 flex flex-col items-center pointer-events-none"
                  style={{ transform: `rotate(${qiblaAngle}deg)`, willChange: 'transform' }}
                >
                  <div className="absolute -top-3 w-8 h-8 rounded-full bg-gold-accent border border-black flex items-center justify-center shadow-lg text-xs">
                    🕋
                  </div>
                </div>
              )}
            </div>

            {/* Qibla Pointer Arrow */}
            {qiblaAngle !== null && (
              <div
                ref={arrowRef}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                style={{ willChange: 'transform' }}
              >
                <div className="relative -translate-y-16 flex flex-col items-center">
                  <div
                    ref={arrowHeadRef}
                    className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[36px]"
                    style={{ borderBottomColor: '#D4AF37', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
                  />
                  <div
                    ref={arrowStemRef}
                    className="w-3.5 h-16 -mt-1"
                    style={{ backgroundColor: '#D4AF37' }}
                  />
                  <div
                    ref={arrowGlowRef}
                    className="w-6 h-6 rounded-full -mt-3.5 flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: '#D4AF37' }}
                  >
                    <Navigation size={12} className="rotate-45 fill-current text-neutral-950" />
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

          {/* Info Card */}
          <div className="w-full space-y-4">
            {/* Alignment Banner */}
            <div className="flex justify-center h-10">
              <AnimatePresence mode="wait">
                {isAligned ? (
                  <motion.div
                    key="aligned-text"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black shadow-lg shadow-emerald-500/5"
                  >
                    <CheckCircle2 size={14} />
                    <span>أنت الآن تواجه القبلة</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="align-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-white/50 text-xs font-bold"
                  >
                    <span>أدر الهاتف باتجاه الكعبة المشرفة</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
              <Info size={16} className="text-gold-accent shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white">طريقة الاستخدام</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  احرص على إبقاء الهاتف مستوياً بالكامل على يدك بموازاة سطح الأرض. للحصول على القبلة بالثانية، تجنب الاقتراب من المجالات المغناطيسية القوية (مثل أجهزة اللابتوب أو الشواحن).
                </p>
              </div>
            </div>

            {/* Angle Details */}
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

      {/* City Selector Modal */}
      {showCitySelector && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="w-full max-w-md bg-neutral-900 rounded-t-3xl rounded-b-2xl flex flex-col max-h-[80vh] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 id="modal-title" className="text-sm font-bold text-white">اختر مدينتك يدوياً</h2>
              <button
                onClick={() => setShowCitySelector(false)}
                aria-label="إغلاق نافذة اختيار المدن"
                className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white text-xs cursor-pointer active:scale-95 transition-all"
              >
                إغلاق
              </button>
            </div>
            <div className="p-3 border-b border-white/5">
              <div className="relative flex items-center">
                <Search className="absolute right-3 text-white/40" size={16} />
                <input
                  type="text"
                  placeholder="ابحث عن مدينتك..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label="ابحث عن مدينتك"
                  className="w-full py-2.5 pr-10 pl-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-accent/50 transition-all text-right"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1" role="list">
              {filteredCities.map((city, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectCity(city)}
                  role="listitem"
                  aria-label={`تحديد مدينة ${city.name}`}
                  className="w-full text-right p-3 rounded-xl hover:bg-white/5 flex items-center justify-between transition-all cursor-pointer group"
                >
                  <span className="text-xs text-white group-hover:text-gold-accent transition-all">{city.name}</span>
                  <MapPin size={14} className="text-white/20 group-hover:text-gold-accent/50" />
                </button>
              ))}
              {filteredCities.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    title="لم نعثر على مدن"
                    description={`لا توجد أي مدينة تطابق البحث عن "${searchQuery}". يرجى تجربة تهجئة أخرى.`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
