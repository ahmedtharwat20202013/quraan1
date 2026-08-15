import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, ArrowLeft, Smartphone, ShieldCheck, Globe } from 'lucide-react';
import { AppState, DailyVerse } from '../types';
import { cn, normalizeArabicText } from '../lib/utils';
import { isAppInstallable, installPWA } from '../registerSW';
import { PRESET_VERSES } from '../data/verses';

interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onBack: () => void;
  onChooseDailyVerse: () => void;
  onOpenAbout?: () => void;
}

export default function SettingsSection({ state, setState, onBack, onChooseDailyVerse, onOpenAbout }: SettingsProps) {
  const [isInstallable, setIsInstallable] = useState(false);

  const [calcMethod, setCalcMethod] = useState(() => {
    return localStorage.getItem('quran_prayer_calc_method') || 'Egyptian';
  });

  const handleCalcMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setCalcMethod(newVal);
    localStorage.setItem('quran_prayer_calc_method', newVal);
    window.location.reload();
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
          role="button"
          aria-label="الرجوع للقائمة الرئيسية"
          className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-95 border border-white/5 cursor-pointer"
        >
          <ArrowLeft size={24} className="rotate-180" aria-hidden="true" />
        </button>
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-1">الإعدادات</h2>
          <p className="text-white/40 text-xs font-black uppercase tracking-[0.2em]">تخصيص تجربتك الروحية</p>
        </div>
      </header>

      <div className="space-y-10">

        {/* Daily Verse Settings */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-xs uppercase font-black tracking-[0.3em] ml-2 opacity-50">آية اليوم المختارة</h3>
          <div className="glass-card p-6 space-y-4 text-right">
            {state.dailyVerse ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-bold text-white/40">سورة {state.dailyVerse.surahName}</span>
                  <span className="text-xs font-bold text-gold-accent/60 uppercase tracking-widest">{state.dailyVerse.reference}</span>
                </div>
                <p className="quran-font text-lg leading-relaxed text-gold-accent">
                  {normalizeArabicText(state.dailyVerse.text)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-white/40">لا توجد آية مخصصة محددة حالياً. يتم اختيار آية عشوائية تلقائياً عند فتح التطبيق.</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onChooseDailyVerse}
                className="flex-1 py-3 rounded-xl bg-gold-accent text-[#031B10] font-black text-xs hover:bg-gold-bright transition-all cursor-pointer text-center"
              >
                اختر آية اليوم 📖
              </button>
              {state.dailyVerse && (
                <button
                  onClick={() => setDailyVerse(undefined)}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all cursor-pointer text-xs font-bold"
                  title="حذف الآية المخصصة والعودة للعشوائي"
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        </section>

        {/* PWA offline app installation support */}
        {isInstallable && (
          <section className="space-y-4">
            <h3 className="text-gold-accent text-xs uppercase font-black tracking-[0.3em] ml-2 opacity-50">تطبيق الهاتف</h3>
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




        {/* Calculation Method Selection */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-xs uppercase font-black tracking-[0.3em] ml-2 opacity-50">طريقة الحساب الفلكي</h3>
          <div className="glass-card overflow-hidden">
            <div className="p-8 space-y-4 bg-white/[0.02] text-right">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Globe size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">طريقة تحديد مواقيت الصلاة</p>
                  <p className="text-xs text-white/30 uppercase font-black tracking-widest mt-0.5">اختر المرجعية الفقهية والفلكية لحساب الأوقات</p>
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



        {/* About Card */}
        <section className="space-y-4">
          <h3 className="text-gold-accent text-xs uppercase font-black tracking-[0.3em] ml-2 opacity-50">حول التطبيق</h3>
          <div className="glass-card p-8 border border-white/5 relative overflow-hidden bg-white/[0.01]">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Info size={120} className="text-gold-accent" />
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gold-accent/10 border border-gold-accent/20 flex items-center justify-center">
                 <Info size={28} className="text-gold-accent" />
              </div>
              <div>
                <p className="font-bold text-xl mb-1">حقيبة المسلم v1.0.0</p>
                <p className="text-xs text-white/40 uppercase font-black leading-relaxed tracking-wider">
                  صُمم لراحة الروح والسكينة.<br/>شكر خاص 
                  للخطاط ثروت عماره.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer link: حول عن */}
        <div className="pt-2 pb-6 text-center">
          <button 
            onClick={onOpenAbout}
            className="text-xs text-white/50 hover:text-gold-accent font-bold tracking-wide transition-colors cursor-pointer inline-flex items-center gap-1.5 underline underline-offset-4 decoration-white/20 hover:decoration-gold-accent"
          >
            <Info size={13} />
            <span>حول عن</span>
          </button>
        </div>
      </div>
    </div>
  );
}
