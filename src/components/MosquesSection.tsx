import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, MapPin, Compass, ShieldCheck, Heart } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface MosquesSectionProps {
  onBack: () => void;
}

export default function MosquesSection({ onBack }: MosquesSectionProps) {
  const handleOpenMaps = () => {
    const url = 'https://www.google.com/maps/search/?api=1&query=mosques+near+me';
    try {
      if (Capacitor.isNativePlatform()) {
        window.open(url, '_system');
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error('Failed to open map URL:', e);
      // Fallback
      window.location.href = url;
    }
  };

  return (
    <div className="space-y-6 py-4 flex flex-col w-full text-right" dir="rtl">
      {/* Header */}
      <header className="w-full flex items-center justify-between pb-3 border-b border-white/5">
        <button
          onClick={onBack}
          aria-label="الرجوع للقائمة الرئيسية"
          className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          <ArrowRight size={18} />
          <span className="text-xs font-bold">الرجوع</span>
        </button>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <MapPin className="text-emerald-400 animate-bounce" size={22} aria-hidden="true" />
          المساجد القريبة
        </h1>
        <div className="w-9 h-9" /> {/* Spacer to center title */}
      </header>

      {/* Main Mockup Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full p-6 rounded-[2.5rem] bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-emerald-950/60 border border-emerald-500/20 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-6"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none" />

        <div className="flex items-center gap-4">
          {/* Mosque SVG Illustration */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-inner relative overflow-hidden">
            {/* Soft inner glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 to-transparent" />
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 text-emerald-400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Crescent Moon */}
              <path
                d="M55 20 A 10 10 0 1 1 65 34 A 8 8 0 1 0 55 20 Z"
                fill="#D4AF37"
                stroke="#D4AF37"
                strokeWidth="0.5"
              />
              
              {/* Minaret Left */}
              <rect x="22" y="45" width="6" height="35" rx="1.5" fill="currentColor" opacity="0.8" />
              <polygon points="21,45 25,32 29,45" fill="currentColor" />
              <rect x="23.5" y="52" width="3" height="8" rx="0.5" fill="#031B10" />

              {/* Main Building Dome */}
              <path
                d="M38 52 C38 35, 62 35, 62 52 Z"
                fill="currentColor"
              />
              <rect x="36" y="52" width="28" height="28" rx="2" fill="currentColor" opacity="0.9" />

              {/* Main Door archway */}
              <path
                d="M45 80 V 66 C45 61, 55 61, 55 66 V 80 Z"
                fill="#031B10"
              />

              {/* Small Dome Windows */}
              <circle cx="50" cy="46" r="3" fill="#D4AF37" opacity="0.8" />
              
              {/* Ground greenery foliage */}
              <path
                d="M15 80 C 25 76, 35 83, 45 79 C 55 83, 65 76, 75 80 C 85 77, 90 80, 95 80 L 95 83 L 15 83 Z"
                fill="#064e3b"
              />
            </svg>
          </div>

          {/* Texts */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white">المساجد القريبة</h2>
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              اعرض أقرب المساجد حولك
            </p>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleOpenMaps}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-700 text-white hover:brightness-110 active:scale-98 font-black text-base flex items-center justify-center gap-3 transition-all cursor-pointer shadow-[0_10px_35px_rgba(16,185,129,0.25)] border border-emerald-400/20"
        >
          <span>فتح الخرائط</span>
          <ArrowRight className="rotate-180" size={20} />
        </motion.button>
      </motion.div>

      {/* Quranic Ayah Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="w-full p-5 rounded-3xl bg-emerald-950/20 border border-gold-accent/20 shadow-lg space-y-3 text-center"
      >
        <div className="flex items-center justify-center gap-2 text-gold-accent">
          <Compass size={16} />
          <span className="text-[10px] font-black tracking-widest uppercase">آية في عمارة المساجد</span>
        </div>
        <p 
          className="quran-font text-lg text-gold-accent text-center py-2 px-3"
          style={{ lineHeight: 1.8 }}
        >
          إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ
        </p>
        <span className="text-[10px] text-white/40 block font-sans font-bold">— سورة التوبة • الآية 18</span>
      </motion.div>

      {/* Hadith & Spiritual Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full p-5 rounded-3xl bg-white/[0.02] border border-white/5 shadow-lg space-y-4"
      >
        <div className="flex items-center gap-2 text-gold-accent">
          <Heart size={16} />
          <span className="text-[10px] font-black tracking-widest uppercase">فضل المشي إلى المساجد</span>
        </div>
        <p 
          className="quran-font text-base text-gold-accent text-center py-3 px-4 bg-emerald-950/20 rounded-2xl border border-gold-accent/20 drop-shadow-sm"
          style={{ lineHeight: 1.8 }}
        >
          "مَنْ تَطَهَّرَ فِي بَيْتِهِ ثُمَّ مَشَى إِلَى بَيْتٍ مِنْ بُيُوتِ اللَّهِ لِيَقْضِيَ فَرِيضَةً مِنْ فَرَائِضِ اللَّهِ كَانَتْ خُطْوَتَاهُ إِحْدَاهُمَا تَحُطُّ خَطِيئَةً وَالأُخْرَى تَرْفَعُ دَرَجَةً"
          <br />
          <span className="text-[10px] text-gold-accent/60 block mt-2 font-sans font-bold">— رواه مسلم</span>
        </p>
      </motion.div>

      {/* Mosque Etiquette */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full p-5 rounded-3xl bg-white/[0.02] border border-white/5 shadow-lg space-y-4"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black tracking-widest uppercase">آداب دخول المسجد</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 text-xs text-white/70">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.01] border border-white/5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">١</span>
            <p className="leading-relaxed">تقديم الرجل اليمنى عند الدخول مع قول: <strong className="text-gold-accent quran-font text-sm">"اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ"</strong>.</p>
          </div>
          
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.01] border border-white/5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">٢</span>
            <p className="leading-relaxed">صلاة ركعتين تحية للمسجد قبل الجلوس.</p>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.01] border border-white/5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">٣</span>
            <p className="leading-relaxed">تقديم الرجل اليسرى عند الخروج مع قول: <strong className="text-gold-accent quran-font text-sm">"اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ"</strong>.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
