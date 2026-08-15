import React from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Headphones,
  Compass,
  MapPinned,
  Heart,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Award,
  Smartphone,
  WifiOff,
  Star,
  BookMarked,
  type LucideIcon, // Added 'type' for TS best practices
} from "lucide-react";

// ==========================================
// CONSTANTS & DATA ARRAYS
// ==========================================
const APP_NAME = "حقيبة المسلم";
const APP_NAME_EN = "Muslim Bag";
const APP_VERSION = "v1.0.0";
const DEVELOPER_NAME = "أحمد ثروت عمارة";
const CALLIGRAPHER_NAME = "الأستاذ ثروت عمارة";
const FONT_NAME = "TE HAFS PRO THARWAT EMARA";

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
}

interface StatItem {
  id: string;
  value: string;
  label: string;
  icon: LucideIcon;
}

interface BadgeItem {
  id: string;
  text: string;
  colorClass: string;
}
const STATS_DATA: StatItem[] = [
  {
    id: "ads",
    value: "0",
    label: "إعلانات",
    icon: ShieldCheck,
  },
  {
    id: "reciters",
    value: "+230",
    label: "قارئ",
    icon: Headphones,
  },
];

const BADGES_DATA: BadgeItem[] = [
  { id: "quran", text: "📖 القرآن الكريم", colorClass: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
  { id: "tafsir", text: "📚 التفسير الميسر", colorClass: "bg-blue-500/10 border-blue-500/30 text-blue-300" },
  { id: "audio", text: "🎧 التلاوات الصوتية", colorClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
  { id: "prayer", text: "🕌 مواقيت الصلاة", colorClass: "bg-purple-500/10 border-purple-500/30 text-purple-300" },
  { id: "qibla", text: "🧭 اتجاه القبلة", colorClass: "bg-teal-500/10 border-teal-500/30 text-teal-300" },
  { id: "mosques", text: "🗺️ أقرب المساجد", colorClass: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" },
  { id: "adhkar", text: "🤲 الأذكار والسبحة", colorClass: "bg-rose-500/10 border-rose-500/30 text-rose-300" },
  { id: "asma", text: "✨ أسماء الله الحسنى", colorClass: "bg-gold-accent/10 border-gold-accent/30 text-gold-accent" },
  { id: "cards", text: "🎨 صانع البطاقات", colorClass: "bg-amber-400/10 border-amber-400/30 text-amber-200" },
];

const FEATURES_DATA: FeatureItem[] = [
  {
    id: "quran-tafsir",
    title: "القرآن الكريم والتفسير الميسر",
    description: "تصفح القرآن الكريم بالرسم العثماني بجودة عالية، مع إمكانية التنقل السلس بين السور والأجزاء، وحفظ العلامات المرجعية، بالإضافة إلى التفسير الميسر لكل آية.",
    icon: BookOpen,
    iconBg: "bg-amber-500/10",
    iconBorder: "border-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    id: "audio-recitations",
    title: "التلاوات والمكتبة الصوتية",
    description: "استمع إلى تلاوات خاشعة لنخبة من كبار القراء، مع دعم تحميل السور للاستماع إليها دون إنترنت، ومشغل صوتي متطور يعمل في الخلفية.",
    icon: Headphones,
    iconBg: "bg-emerald-500/10",
    iconBorder: "border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    id: "prayer-qibla",
    title: "مواقيت الصلاة واتجاه القبلة",
    description: "تحديد دقيق لمواقيت الصلاة بناءً على موقعك الجغرافي، مع عداد تنازلي للصلاة القادمة، وبوصلة تفاعلية دقيقة لتحديد اتجاه القبلة.",
    icon: Compass,
    iconBg: "bg-purple-500/10",
    iconBorder: "border-purple-500/20",
    iconColor: "text-purple-400",
  },
  {
    id: "mosques-finder",
    title: "دليل أقرب المساجد",
    description: "استعراض المساجد القريبة منك عبر قاعدة بيانات سريعة تعمل دون اتصال، مع إمكانية استخدام الخرائط للملاحة المباشرة عند توفر الإنترنت.",
    icon: MapPinned,
    iconBg: "bg-indigo-500/10",
    iconBorder: "border-indigo-500/20",
    iconColor: "text-indigo-400",
  },
  {
    id: "adhkar-tasbeeh",
    title: "الأذكار والسبحة الإلكترونية",
    description: "موسوعة شاملة للأذكار والأدعية اليومية مع عداد تكرار تفاعلي، وسبحة رقمية متطورة تدعم الاهتزاز التفاعلي وإحصائيات التسبيح.",
    icon: Heart,
    iconBg: "bg-rose-500/10",
    iconBorder: "border-rose-500/20",
    iconColor: "text-rose-400",
  },
  {
    id: "asma-allah",
    title: "أسماء الله الحسنى",
    description: "عرض أسماء الله الحسنى الـ 99 بخط كلاسيكي متميز، مع شرح دقيق لمعاني كل اسم وإمكانية البحث السريع.",
    icon: BookMarked,
    iconBg: "bg-gold-accent/10",
    iconBorder: "border-gold-accent/20",
    iconColor: "text-gold-accent",
  },
  {
    id: "card-creator",
    title: "صانع البطاقات الإسلامية",
    description: "صمم بطاقات دعوية للآيات والأذكار بخلفيات متنوعة وتنسيقات احترافية، مع إمكانية إضافة توقيعك وتصديرها كصور عالية الجودة.",
    icon: Sparkles,
    iconBg: "bg-amber-400/10",
    iconBorder: "border-amber-400/20",
    iconColor: "text-amber-300",
  },
];

const WHY_US_ITEMS: string[] = [
  "القرآن الكريم بالرسم العثماني الأصيل.",
  "التفسير الميسر المُنقّح للآيات الكريمة.",
  "مكتبة صوتية شاملة مع دعم التحميل.",
  "دقة عالية في مواقيت الصلاة والقبلة.",
  "دليل المساجد المجاورة مع دعم الملاحة.",
  "الأذكار والأدعية مع نظام التكرار والمفضلة.",
  "سبحة إلكترونية تفاعلية متطورة.",
  "أسماء الله الحسنى مع شرح وافٍ لمعانيها.",
  "أداة احترافية لتصميم وتصدير البطاقات الإسلامية.",
  "مجاني تماماً وخالٍ من أي إعلانات مزعجة.",
  "يعمل بكفاءة دون إنترنت في معظم الخصائص."
];

interface AboutSectionProps {
  onBack: () => void;
}

export default function AboutSection({ onBack }: AboutSectionProps) {
  return (
    <div
      dir="rtl"
      className="min-h-screen max-w-md mx-auto px-4 pt-6 pb-24 space-y-6 text-right"
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <button
          onClick={onBack}
          aria-label="العودة للخلف"
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        >
          <ArrowRight size={18} />
        </button>

        <div className="text-right">
          <h1 className="text-2xl font-black text-white">حول التطبيق</h1>
          <p className="mt-1 text-[11px] font-bold tracking-[0.35em] uppercase text-gold-accent/70">
            {APP_NAME_EN}
          </p>
        </div>
      </header>

      {/* Hero Card */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-gold-accent/20 bg-gradient-to-br from-[#1a1a1a] via-[#181818] to-[#111111] p-6 shadow-2xl"
      >
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-gold-accent/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[36px] border border-gold-accent/30 bg-gradient-to-br from-gold-accent/20 to-gold-accent/5 shadow-[0_0_60px_rgba(212,175,55,.35)] hover:scale-105 transition-all duration-500 cursor-pointer">
            <img
              src="/favicon.png"
              alt={APP_NAME}
              className="h-full w-full object-contain p-2"
            />
          </div>

          <h2 className="mt-5 text-3xl font-black text-white">{APP_NAME}</h2>

          <span className="mt-2 rounded-full border border-gold-accent/30 bg-gold-accent/10 px-3 py-1 text-[11px] font-bold text-gold-accent">
            الإصدار {APP_VERSION}
          </span>

          <p className="mt-5 max-w-xs text-center text-sm leading-7 font-medium text-white/80">
            تطبيق إسلامي متكامل يجمع أهم احتياجات المسلم اليومية في مكان واحد: القرآن الكريم بالرسم العثماني، التفسير الميسر، التلاوات الصوتية، مواقيت الصلاة، اتجاه القبلة، المساجد، الأذكار، السبحة، أسماء الله الحسنى، وصانع البطاقات؛ مجاني بالكامل، بدون إعلانات، ويدعم العمل دون اتصال بالإنترنت في معظم المميزات.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {BADGES_DATA.map((badge) => (
              <span
                key={badge.id}
                className={`rounded-xl border px-2.5 py-1 text-[11px] font-bold shadow-sm ${badge.colorClass}`}
              >
                {badge.text}
              </span>
            ))}
          </div>

          <div className="mt-6 grid w-full grid-cols-2 gap-3">
            {STATS_DATA.map((stat) => {
              const IconComp = stat.icon;
              return (
                <div
                  key={stat.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center"
                >
                  <div className="mb-1 flex justify-center">
                    <IconComp size={20} className="text-gold-accent" />
                  </div>
                  <p className="text-lg font-black text-white">{stat.value}</p>
                  <p className="text-[11px] font-bold text-white/60">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="flex items-center gap-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 size={14} />
              مجاني بالكامل
            </span>

            <span className="flex items-center gap-1 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400">
              <ShieldCheck size={14} />
              بدون إعلانات
            </span>

            <span className="flex items-center gap-1 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 text-center">
              <WifiOff size={14} />
              يدعم العمل دون اتصال بالإنترنت
            </span>
          </div>
        </div>
      </motion.section>

      {/* Features Grid */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h3 className="mr-1 text-xs font-black uppercase tracking-[0.35em] text-gold-accent/70">
          مميزات التطبيق
        </h3>

        {FEATURES_DATA.map((feat) => {
          const IconComp = feat.icon;
          return (
            <div
              key={feat.id}
              className="flex gap-4 items-start p-5 rounded-3xl border border-white/10 bg-white/[0.03]"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${feat.iconBg} ${feat.iconBorder}`}
              >
                <IconComp size={20} className={feat.iconColor} />
              </div>
              <div>
                <h4 className="font-black text-white text-base">{feat.title}</h4>
                <p className="mt-1.5 text-xs leading-6 text-white/70 font-medium">
                  {feat.description}
                </p>
              </div>
            </div>
          );
        })}
      </motion.section>

      {/* Why Muslim Bag */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-4"
      >
        <h3 className="mr-1 text-xs font-black uppercase tracking-[0.35em] text-gold-accent/70">
          لماذا حقيبة المسلم؟
        </h3>

        <div className="rounded-3xl border border-gold-accent/20 bg-gold-accent/[0.03] p-5">
          <div className="space-y-3">
            {WHY_US_ITEMS.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-white/80 font-bold leading-6">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Our Mission */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Smartphone size={18} className="text-gold-accent" />
          <h3 className="font-black text-white text-base">رسالتنا</h3>
        </div>

        <p className="text-xs text-white/75 leading-6 font-medium">
          هدفنا هو تسخير التكنولوجيا الحديثة لتيسير العبادات اليومية للمسلم، وتوفير أدوات إسلامية متكاملة وسهلة الاستخدام عبر واجهة بسيطة وآمنة، مع التطوير المستمر لخدمة القرآن الكريم والسنة النبوية الشريفة.
        </p>
      </motion.section>

      {/* Acknowledgements */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-3xl border border-gold-accent/20 bg-gradient-to-br from-gold-accent/[0.04] to-transparent p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Award size={18} className="text-gold-accent" />
          <h3 className="font-black text-gold-accent text-base">شكر وتقدير</h3>
        </div>

        <p className="text-xs text-white/80 leading-6 font-medium">
          يتوجه مطور التطبيق <span className="font-black text-white">{DEVELOPER_NAME}</span> بخالص الشكر والتقدير للخطاط القدير <span className="font-black text-gold-accent">{CALLIGRAPHER_NAME}</span>، صاحب تصميم المصحف الشريف ومبتكر خط <span className="font-black text-gold-accent">{FONT_NAME}</span> المستخدم داخل التطبيق لعرض الآيات الكريمة والمخطوطات.
        </p>

        <div className="h-px bg-white/10 my-3" />

        <p className="text-center text-xs leading-6 text-white/60 font-medium">
          نسأل الله تعالى أن يجعل هذا العمل خالصاً لوجهه الكريم، وصدقة جارية لكل من ساهم فيه أو انتفع به.
        </p>
      </motion.section>

      {/* Footer */}
      <footer className="pt-4 pb-10 text-center space-y-2.5 border-t border-white/10">
        <p className="text-xs text-white/50 font-bold">
          © {new Date().getFullYear()} {APP_NAME} ({APP_NAME_EN}). جميع الحقوق محفوظة.
        </p>

        <p className="text-[10px] text-gold-accent/70 tracking-[0.25em] uppercase font-bold">
          {APP_NAME_EN} • {APP_VERSION}
        </p>

        <p className="text-[11px] text-white/40 leading-5 max-w-sm mx-auto font-medium">
          تُستخدم الموارد والأنماط الرسومية داخل التطبيق بموجب تراخيصها المعتمدة مع احترام كامل لحقوق الملكية الفكرية.
        </p>

        <p className="text-[10px] text-white/30 font-bold">
          نسأل الله أن ينفع بهذا التطبيق المسلمين في كل مكان، وأن يتقبله بقبول حسن.
        </p>
      </footer>
    </div>
  );
}
