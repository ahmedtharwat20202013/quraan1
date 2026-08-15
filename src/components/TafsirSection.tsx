import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ArrowRight, ArrowLeft, Loader2, Info, BookOpen, ChevronLeft, Sparkles } from 'lucide-react';
import { SURAHS } from '../constants';
import { cn, normalizeArabicText } from '../lib/utils';

interface TafsirSectionProps {
  onBack: () => void;
}

interface TafsirVerse {
  ayah: number;
  text: string;
  tafsir: string;
}

export type TafsirEdition = 'muyassar' | 'jalalayn';

const TAFSIR_EDITIONS: Record<TafsirEdition, { id: TafsirEdition; name: string; author: string; desc: string; badge: string }> = {
  muyassar: {
    id: 'muyassar',
    name: 'التفسير الميسر',
    author: 'مجموعة من العلماء',
    desc: 'تفسير ميسر ومختصر يناسب القارئ لتقريب معاني القرآن الكريم وتوضيح مقاصد الآيات.',
    badge: 'الأكثر انتشاراتً وسهولة'
  },
  jalalayn: {
    id: 'jalalayn',
    name: 'تفسير الجلالين',
    author: 'الإمامان الجلال المحلي والجلال السيوطي',
    desc: 'تفسير موجز قيّم معتمد يعتني ببيان المعنى الإجمالي ولغة القرآن وإعراب المشكل.',
    badge: 'تفسير علمي معتمد'
  }
};

export default function TafsirSection({ onBack }: TafsirSectionProps) {
  // Views: 'edition_select' | 'surah_list' | 'verse_list'
  const [view, setView] = useState<'edition_select' | 'surah_list' | 'verse_list'>('edition_select');
  const [selectedSurah, setSelectedSurah] = useState<typeof SURAHS[0] | null>(null);
  
  // Selected Edition
  const [edition, setEdition] = useState<TafsirEdition>('muyassar');

  // Search inputs
  const [surahSearch, setSurahSearch] = useState("");
  const [ayahSearch, setAyahSearch] = useState("");

  // Verses state
  const [verses, setVerses] = useState<TafsirVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const versesListRef = useRef<HTMLDivElement>(null);

  // Handle selecting edition card
  const handleSelectEditionCard = (selectedEd: TafsirEdition) => {
    setEdition(selectedEd);
    setView('surah_list');
    setSurahSearch('');
  };

  // Filter surahs list
  const filteredSurahs = useMemo(() => {
    const q = surahSearch.trim();
    if (!q) return SURAHS;
    const normQ = normalizeArabicText(q);
    return SURAHS.filter(s => normalizeArabicText(s.name).includes(normQ));
  }, [surahSearch]);

  // Load Tafsir data for selected surah and edition
  useEffect(() => {
    if (selectedSurah && view === 'verse_list') {
      setLoading(true);
      setError(null);

      const path = edition === 'jalalayn' 
        ? `/tafsir/jalalayn/${selectedSurah.number}.json`
        : `/tafsir/${selectedSurah.number}.json`;
      
      fetch(path)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`فشل تحميل ${TAFSIR_EDITIONS[edition].name}`);
          }
          return res.json();
        })
        .then((data: TafsirVerse[]) => {
          setVerses(data);
          setError(null);
        })
        .catch((err) => {
          console.error(err);
          setError(`عذراً، لم نتمكن من تحميل ${TAFSIR_EDITIONS[edition].name} لهذه السورة.`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [selectedSurah, edition, view]);

  // Filter verses by Ayah number or search text
  const filteredVerses = useMemo(() => {
    const query = ayahSearch.trim();
    if (!query) return verses;
    
    // Check if query is a number
    const verseNum = parseInt(query, 10);
    if (!isNaN(verseNum)) {
      return verses.filter(v => v.ayah === verseNum);
    }
    
    // Otherwise text search in Ayah or Tafsir
    const normQ = normalizeArabicText(query);
    return verses.filter(v => 
      normalizeArabicText(v.text).includes(normQ) || 
      normalizeArabicText(v.tafsir).includes(normQ)
    );
  }, [verses, ayahSearch]);

  return (
    <div className="space-y-6 text-right pb-28" dir="rtl">
      
      {/* 1. EDITION SELECTION SCREEN (مربعين لتفسير الميسر وتفسير الجلالين) */}
      {view === 'edition_select' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-3xl font-black text-white">كتب التفسير</h2>
              <p className="text-xs text-gold-accent font-black mt-1">اختر كتاب التفسير المطلوب لتصفح آيات وسور القرآن</p>
            </div>
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
              title="رجوع للرئيسية"
            >
              <ArrowLeft size={18} />
            </button>
          </div>

          {/* Two Prominent Cards for Muyassar and Jalalayn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {(['muyassar', 'jalalayn'] as TafsirEdition[]).map((edId) => {
              const ed = TAFSIR_EDITIONS[edId];
              return (
                <div
                  key={edId}
                  onClick={() => handleSelectEditionCard(edId)}
                  className="glass-card hover:bg-white/[0.07] transition-all p-6 rounded-[2rem] border border-white/10 hover:border-gold-accent/40 flex flex-col justify-between gap-6 cursor-pointer group shadow-xl relative overflow-hidden"
                >
                  {/* Decorative Subtle Background Accent */}
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-gold-accent/5 rounded-full blur-2xl group-hover:bg-gold-accent/15 transition-all" />

                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center">
                      <div className="w-12 h-12 rounded-2xl bg-gold-accent/10 border border-gold-accent/20 flex items-center justify-center text-gold-accent">
                        <BookOpen size={24} />
                      </div>
                      <span className="text-[10px] font-black bg-gold-accent/15 text-gold-accent px-3 py-1 rounded-full border border-gold-accent/20">
                        {ed.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-white group-hover:text-gold-accent transition-colors flex items-center gap-2">
                        {ed.name}
                        <Sparkles size={16} className="text-gold-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-xs text-gold-accent/80 font-bold mt-1">{ed.author}</p>
                    </div>

                    <p className="text-xs text-white/60 font-bold leading-relaxed pt-1">
                      {ed.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs font-black text-gold-accent group-hover:translate-x-[-4px] transition-transform relative z-10">
                    <span>تصفح سور المصحف</span>
                    <ChevronLeft size={18} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SURAH LIST VIEW (فهرس السور للتفسير المختار) */}
      {view === 'surah_list' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-3xl font-black text-white">فهرس السور</h2>
              <p className="text-xs text-gold-accent font-black mt-1">كتاب {TAFSIR_EDITIONS[edition].name}</p>
            </div>
            <button 
              onClick={() => setView('edition_select')}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight size={14} />
              تغيير كتاب التفسير
            </button>
          </div>

          {/* Search Box */}
          <div className="relative group">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="ابحث باسم السورة..." 
              value={surahSearch}
              onChange={(e) => setSurahSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pr-10 pl-4 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right text-sm font-bold text-white"
            />
          </div>

          {/* Clean Organized Surah List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredSurahs.map((surah) => {
              const typeArabic = surah.revelationType === 'Meccan' || surah.revelationType === 'مكية' ? 'مكية' : 'مدنية';
              return (
                <button
                  key={surah.number}
                  onClick={() => {
                    setSelectedSurah(surah);
                    setView('verse_list');
                    setAyahSearch("");
                  }}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-gold-accent/40 text-right flex justify-between items-center transition-all group cursor-pointer hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl border border-gold-accent/20 bg-gold-accent/5 flex items-center justify-center text-[10px] font-mono text-gold-accent font-black">
                      {surah.number}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-white group-hover:text-gold-accent transition-colors text-sm">
                        سورة {surah.name}
                      </span>
                      <span className="text-[9px] text-white/30 font-bold mt-0.5">
                        {typeArabic} • {surah.numberOfAyahs} آية
                      </span>
                    </div>
                  </div>
                  <ChevronLeft size={16} className="text-white/20 group-hover:text-gold-accent transition-all" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. VERSE LIST TAFSIR VIEW (عرض تفاسير آيات السورة بدون أيقونات الأرقام) */}
      {view === 'verse_list' && selectedSurah && (
        <div className="space-y-5 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-2xl font-black text-white">سورة {selectedSurah.name}</h2>
              <p className="text-xs text-gold-accent font-black mt-1">
                {TAFSIR_EDITIONS[edition].name} • {selectedSurah.numberOfAyahs} آية
              </p>
            </div>
            <button 
              onClick={() => {
                setView('surah_list');
                setSelectedSurah(null);
                setVerses([]);
                setAyahSearch("");
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight size={14} />
              فهرس السور
            </button>
          </div>

          {/* Clean Single Search Bar for Ayah number or text (No pills bar) */}
          {!loading && !error && verses.length > 0 && (
            <div className="relative group">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="🔍 ابحث برقم الآية أو كلمة من النص والتفسير..." 
                value={ayahSearch}
                onChange={(e) => setAyahSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right text-xs font-bold text-white"
              />
            </div>
          )}

          {/* Loader or Error or List */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/40">
              <Loader2 className="animate-spin text-gold-accent" size={32} />
              <p className="text-sm font-bold">جاري تحميل وتنسيق {TAFSIR_EDITIONS[edition].name}...</p>
            </div>
          )}

          {error && (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
              <p className="text-sm text-red-400 font-bold">{error}</p>
              <button 
                onClick={() => setSelectedSurah({ ...selectedSurah })}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !error && (
            <div ref={versesListRef} className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {filteredVerses.length === 0 ? (
                <div className="p-12 text-center text-white/30 font-bold text-sm">
                  لم نجد آيات تطابق البحث المدخل في {TAFSIR_EDITIONS[edition].name}.
                </div>
              ) : (
                filteredVerses.map((verse) => (
                  <div 
                    key={verse.ayah}
                    className={cn(
                      "p-6 rounded-[2rem] bg-white/[0.02] border transition-all text-right flex flex-col gap-4 relative shadow-md",
                      ayahSearch && parseInt(ayahSearch, 10) === verse.ayah
                        ? "border-gold-accent/60 bg-gold-accent/[0.03] shadow-gold-accent/5"
                        : "border-white/5 hover:border-gold-accent/20"
                    )}
                  >
                    {/* Ayah number badge */}
                    <span className="absolute top-4 left-4 text-[10px] font-mono text-gold-accent bg-gold-accent/10 border border-gold-accent/20 px-2.5 py-0.5 rounded-full font-bold">
                      آية {verse.ayah}
                    </span>

                    {/* Verse Arabic Text (center, styled Amiri/Quran font) */}
                    <div className="pt-2 text-center">
                      <p className="quran-font text-xl md:text-2xl text-gold-accent font-extrabold leading-loose max-w-[90%] mx-auto drop-shadow-sm select-all">
                        {normalizeArabicText(verse.text)}
                      </p>
                    </div>

                    {/* Divider line */}
                    <div className="w-full h-[1px] bg-white/5" />

                    {/* Tafsir text block */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-gold-accent/70 font-black tracking-widest uppercase">
                        <Info size={11} />
                        <span>بيان {TAFSIR_EDITIONS[edition].name}:</span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed font-bold font-sans text-justify select-all">
                        {verse.tafsir}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
