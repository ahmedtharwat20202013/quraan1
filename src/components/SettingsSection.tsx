import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Moon, Sun, Download, Trash2, Info, ArrowLeft, Star, Smartphone, ShieldCheck, Volume2, HelpCircle, MapPin, Globe } from 'lucide-react';
import { AppState, DailyVerse } from '../types';
import { cn } from '../lib/utils';
import { isAppInstallable, installPWA } from '../registerSW';
import { initAzan, scheduleWeeklyAzans, cancelAllScheduledAzans } from '../services/azan';
import { initDidYouKnowNotifications, scheduleWeeklyDidYouKnow, cancelDidYouKnowNotifications } from '../services/didYouKnow';

interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onBack: () => void;
}

const PRESET_VERSES: DailyVerse[] = [
  { surahName: 'البقرة', reference: 'الآية 255', text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ' },
  { surahName: 'طه', reference: 'الآية 25', text: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي' },
  { surahName: 'الأحزاب', reference: 'الآية 41', text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا' },
  { surahName: 'الإسراء', reference: 'الآية 82', text: 'وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ' },
];

export default function SettingsSection({ state, setState, onBack }: SettingsProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [azanEnabled, setAzanEnabled] = useState(() => {
    return localStorage.getItem('quran_azan_enabled') === 'true';
  });

  const [calcMethod, setCalcMethod] = useState(() => {
    return localStorage.getItem('quran_prayer_calc_method') || 'Egyptian';
  });

  const handleCalcMethodChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      const newVal = e.target.value;
      setCalcMethod(newVal);
      localStorage.setItem('quran_prayer_calc_method', newVal);
      
      try {
        await scheduleWeeklyAzans();
      } catch (err) {
        console.warn('Failed to reschedule Azans on calculation method change:', err);
      }
      
      window.location.reload();
    } catch (err) {
      console.error('Error changing calculation method:', err);
      window.location.reload();
    }
  };

  const handleAzanToggle = async () => {
    const newVal = !azanEnabled;
    if (newVal) {
      const success = await initAzan();
      if (success) {
        setAzanEnabled(true);
        localStorage.setItem('quran_azan_enabled', 'true');
        await scheduleWeeklyAzans();
      } else {
        alert('يرجى تمكين صلاحية الإشعارات لتتمكن من تشغيل الأذان.');
      }
    } else {
      setAzanEnabled(false);
      localStorage.setItem('quran_azan_enabled', 'false');
      await cancelAllScheduledAzans();
    }
  };

  const [didYouKnowEnabled, setDidYouKnowEnabled] = useState(() => {
    return localStorage.getItem('quran_did_you_know_enabled') !== 'false';
  });
  const [didYouKnowTime, setDidYouKnowTime] = useState(() => {
    return localStorage.getItem('quran_did_you_know_time') || '20:00';
  });

  const handleDidYouKnowToggle = async () => {
    const newVal = !didYouKnowEnabled;
    if (newVal) {
      const success = await initDidYouKnowNotifications();
      if (success) {
        setDidYouKnowEnabled(true);
        localStorage.setItem('quran_did_you_know_enabled', 'true');
        await scheduleWeeklyDidYouKnow();
      } else {
        alert('يرجى تمكين صلاحية الإشعارات لتتمكن من تشغيل إشعارات هل تعلم.');
      }
    } else {
      setDidYouKnowEnabled(false);
      localStorage.setItem('quran_did_you_know_enabled', 'false');
      await cancelDidYouKnowNotifications();
    }
  };

  const handleDidYouKnowTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setDidYouKnowTime(newTime);
    localStorage.setItem('quran_did_you_know_time', newTime);
    if (didYouKnowEnabled) {
      await scheduleWeeklyDidYouKnow();
    }
  };

  useEffect(() => {
    setIsInstallable(isAppInstallable());

    const handleInstallable = () => {
      setIsInstallable(true);
    };

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

  const toggleDarkMode = () => {
    setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const setDailyVerse = (verse: DailyVerse | undefined) => {
    setState(prev => ({ ...prev, dailyVerse: verse }));
  };

  const clearStorage = () => {
    if (confirm('هل أنت متأكد من حذف جميع بيانات القراءة والأذكار؟')) {
      localStorage.removeItem('quran_light_state');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="flex items-center gap-6">
        <button 
          onClick={onBack} 
          className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95 border border-white/5"
        >
          <ArrowLeft size={24} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-1">الإعدادات</h2>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">تخصيص تجربتك الروحية</p>
        </div>
      </header>

      <div className="space-y-10">
        {/* Appearance */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-[10px] uppercase font-black tracking-[0.3em] ml-2 opacity-50">المظهر العام</h3>
          <div className="glass-card overflow-hidden">
            <div className="p-8 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  state.darkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-500"
                )}>
                  {state.darkMode ? <Moon size={24} /> : <Sun size={24} />}
                </div>
                <div>
                  <p className="font-bold text-lg">الوضع الليلي</p>
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-0.5">راحة للعين أثناء الليل</p>
                </div>
              </div>
              <button 
                onClick={toggleDarkMode}
                className={cn(
                  "w-14 h-8 rounded-full relative transition-all duration-300 p-1",
                  state.darkMode ? "bg-amber-500/20" : "bg-white/10"
                )}
              >
                <motion.div 
                  animate={{ x: state.darkMode ? -24 : 0 }}
                  className={cn(
                    "w-6 h-6 rounded-full shadow-lg transition-colors",
                    state.darkMode ? "bg-amber-500" : "bg-white/40"
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Daily Verse Settings */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-[10px] uppercase font-black tracking-[0.3em] ml-2 opacity-50">آية اليوم المختارة</h3>
          <div className="glass-card divide-y divide-white/5 overflow-hidden">
            {PRESET_VERSES.map((verse, idx) => (
              <button 
                key={idx}
                onClick={() => setDailyVerse(verse)}
                className={cn(
                  "w-full p-6 flex flex-col gap-2 hover:bg-white/5 transition-all text-right",
                  state.dailyVerse?.text === verse.text ? "bg-gold-accent/[0.03]" : ""
                )}
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    {state.dailyVerse?.text === verse.text && (
                       <Star size={14} className="text-gold-accent fill-gold-accent" />
                    )}
                    <span className="text-[10px] font-bold text-white/40">سورة {verse.surahName}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gold-accent/60 uppercase tracking-widest">{verse.reference}</span>
                </div>
                <p className={cn(
                  "arabic-text text-lg leading-relaxed transition-colors",
                  state.dailyVerse?.text === verse.text ? "text-gold-accent" : "text-white/80"
                )}>
                  {verse.text}
                </p>
              </button>
            ))}
            <button 
              onClick={() => setDailyVerse(undefined)}
              className="w-full p-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors"
            >
              استخدام الآية الافتراضية
            </button>
          </div>
        </section>

        {/* PWA offline app installation support */}
        {isInstallable && (
          <section className="space-y-4">
            <h3 className="text-gold-accent text-[10px] uppercase font-black tracking-[0.3em] ml-2 opacity-50">تطبيق الهاتف</h3>
            <div className="glass-card p-6 bg-gradient-to-br from-gold-accent/10 to-transparent border border-gold-accent/20">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold-accent/20 flex items-center justify-center text-gold-accent shrink-0">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">تنزيل كتطبيق أوفلاين</h4>
                    <p className="text-xs text-white/50 leading-relaxed mt-0.5">
                      تثبيت واجهة حقيبة المسلم على الهاتف الذكي للوصول الفوري بدون شبكة.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-gold-accent text-emerald-950 font-bold text-xs rounded-xl hover:bg-white hover:text-emerald-900 transition-all active:scale-95 flex items-center gap-1 shrink-0"
                >
                  <ShieldCheck size={14} />
                  تثبيت التطبيق
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Azan Alarm Settings */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-[10px] uppercase font-black tracking-[0.3em] ml-2 opacity-50">تنبيهات الصلاة</h3>
          <div className="glass-card overflow-hidden">
            <div className="p-8 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  azanEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/30"
                )}>
                  <Volume2 size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">تشغيل الأذان تلقائياً</p>
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-0.5">تشغيل الأذان وإرسال إشعار عند دخول وقت الصلاة</p>
                </div>
              </div>
              <button 
                onClick={handleAzanToggle}
                className={cn(
                  "w-14 h-8 rounded-full relative transition-all duration-300 p-1 shrink-0",
                  azanEnabled ? "bg-emerald-500/20" : "bg-white/10"
                )}
              >
                <motion.div 
                  animate={{ x: azanEnabled ? -24 : 0 }}
                  className={cn(
                    "w-6 h-6 rounded-full shadow-lg transition-colors",
                    azanEnabled ? "bg-emerald-500" : "bg-white/40"
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Did You Know Daily Notification Settings */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-[10px] uppercase font-black tracking-[0.3em] ml-2 opacity-50">إشعار هل تعلم اليومي</h3>
          <div className="glass-card overflow-hidden">
            <div className="p-8 space-y-6 bg-white/[0.02]">
              {/* Toggle Switch */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    didYouKnowEnabled ? "bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "bg-white/5 text-white/30"
                  )}>
                    <HelpCircle size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-lg">إشعار "هل تعلم؟" اليومي</p>
                    <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-0.5">تلقي معلومة إسلامية مفيدة يومياً تلقائياً</p>
                  </div>
                </div>
                <button 
                  onClick={handleDidYouKnowToggle}
                  className={cn(
                    "w-14 h-8 rounded-full relative transition-all duration-300 p-1 shrink-0",
                    didYouKnowEnabled ? "bg-amber-500/20" : "bg-white/10"
                  )}
                >
                  <motion.div 
                    animate={{ x: didYouKnowEnabled ? -24 : 0 }}
                    className={cn(
                      "w-6 h-6 rounded-full shadow-lg transition-colors",
                      didYouKnowEnabled ? "bg-amber-500" : "bg-white/40"
                    )}
                  />
                </button>
              </div>

              {/* Time Picker (Only visible when toggle is enabled) */}
              <AnimatePresence>
                {didYouKnowEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-white/5 pt-6 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-sm text-white/70">وقت التنبيه اليومي</p>
                      <p className="text-[10px] text-white/35 font-black uppercase tracking-wider mt-0.5">اختر وقت إرسال الإشعار اليومي</p>
                    </div>
                    <input
                      type="time"
                      value={didYouKnowTime}
                      onChange={handleDidYouKnowTimeChange}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Calculation Method Selection */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-[10px] uppercase font-black tracking-[0.3em] ml-2 opacity-50">طريقة الحساب الفلكي</h3>
          <div className="glass-card overflow-hidden">
            <div className="p-8 space-y-4 bg-white/[0.02] text-right">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Globe size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">طريقة تحديد مواقيت الصلاة</p>
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-0.5">اختر المرجعية الفقهية والفلكية لحساب الأوقات</p>
                </div>
              </div>

              <select
                value={calcMethod}
                onChange={handleCalcMethodChange}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                dir="rtl"
              >
                <option value="Egyptian">الهيئة المصرية العامة للمساحة</option>
                <option value="MuslimWorldLeague">رابطة العالم الإسلامي</option>
                <option value="NorthAmerica">الجمعية الإسلامية لأمريكا الشمالية (ISNA)</option>
                <option value="ShiaQum">مَذْهَب "الشيعة الاثنا عشرية"، مؤسسة تحقيقات اللواء في مدينة "قُم" بإيران</option>
                <option value="Karachi">جامعة العلوم الإسلامية في كراتشي</option>
                <option value="UmmAlQura">جامعة "أم القرى" في مَكّة المكرّمة</option>
                <option value="Tehran">معهد الجيوفيزياء في جامعة طهران</option>
              </select>
            </div>
          </div>
        </section>



        {/* About */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-[10px] uppercase font-black tracking-[0.3em] ml-2 opacity-50">حول التطبيق</h3>
          <div className="glass-card p-8 border border-white/5 relative overflow-hidden bg-white/[0.01]">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Info size={120} className="text-gold-accent" />
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gold-accent/10 border border-gold-accent/20 flex items-center justify-center">
                 <Info size={28} className="text-gold-accent" />
              </div>
              <div>
                <p className="font-bold text-xl mb-1">القرأن الكريم v1.0.0</p>
                <p className="text-[10px] text-white/40 uppercase font-black leading-relaxed tracking-wider">
                  صُمم لراحة الروح والسكينة.<br/>شكر خاص 
                  للخطاط ثروت عماره.
                </p>
                
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
