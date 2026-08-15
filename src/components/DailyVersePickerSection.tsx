import { useState, useMemo } from 'react';
import { Search, ChevronLeft } from 'lucide-react';
import { PRESET_VERSES } from '../data/verses';
import { DailyVerse } from '../types';
import { cn, normalizeArabicText } from '../lib/utils';

interface DailyVersePickerProps {
  onSelect: (verse: DailyVerse) => void;
  onBack: () => void;
  currentVerse?: DailyVerse;
}

export default function DailyVersePickerSection({ onSelect, onBack, currentVerse }: DailyVersePickerProps) {
  // Picker sub-states: 'surahs' | 'verses'
  const [pickerView, setPickerView] = useState<'surahs' | 'verses'>('surahs');
  const [selectedSurah, setSelectedSurah] = useState<string>("الفاتحة");
  const [surahSearch, setSurahSearch] = useState("");

  // Get unique surahs that exist in the PRESET_VERSES pool (2500 verses)
  const uniqueSurahs = useMemo(() => {
    return Array.from(new Set(PRESET_VERSES.map(v => v.surahName)));
  }, []);

  // Filter surahs list based on search text
  const filteredSurahs = useMemo(() => {
    const q = surahSearch.trim();
    if (!q) return uniqueSurahs;
    return uniqueSurahs.filter(name => name.includes(q));
  }, [surahSearch, uniqueSurahs]);

  return (
    <div className="space-y-6 pb-24 text-right animate-fadeIn" dir="rtl">
      
      {/* 1. SURAHS PICKER VIEW */}
      {pickerView === 'surahs' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-xl font-black text-white">اختر آية اليوم</h2>
              <p className="text-xs text-white/40 mt-1">تصفح السور لاختيار الآية المحددة لليوم</p>
            </div>
            <button 
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={12} className="rotate-180" />
              رجوع للإعدادات
            </button>
          </div>

          {/* Search Box */}
          <div className="relative group">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="ابحث عن السورة..." 
              value={surahSearch}
              onChange={(e) => setSurahSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pr-10 pl-4 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right text-sm font-bold"
            />
          </div>

          {/* Surah List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
            {filteredSurahs.map((surahName) => {
              const count = PRESET_VERSES.filter(v => v.surahName === surahName).length;
              return (
                <button
                  key={surahName}
                  onClick={() => {
                    setSelectedSurah(surahName);
                    setPickerView('verses');
                  }}
                  className="p-4.5 rounded-2xl bg-white/5 border border-white/10 hover:border-gold-accent/40 text-right flex justify-between items-center transition-all group cursor-pointer hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl border border-gold-accent/20 bg-gold-accent/5 flex items-center justify-center text-[10px] font-mono text-gold-accent font-black">
                      📖
                    </div>
                    <span className="font-bold text-white group-hover:text-gold-accent transition-colors text-sm">سورة {surahName}</span>
                  </div>
                  <span className="text-[10px] text-gold-accent/80 font-bold bg-gold-accent/5 border border-gold-accent/10 px-2.5 py-1 rounded-lg">
                    {count} آية
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. VERSES PICKER VIEW */}
      {pickerView === 'verses' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-xl font-black text-white">سورة {selectedSurah}</h2>
              <p className="text-xs text-white/40 mt-1">اختر الآية الكريمة ليتم تعيينها كآية لليوم</p>
            </div>
            <button 
              onClick={() => setPickerView('surahs')}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={12} className="rotate-180" />
              رجوع للسور
            </button>
          </div>

          {/* Verses List */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 divide-y divide-white/5">
            {PRESET_VERSES.filter(v => v.surahName === selectedSurah).map((verse, idx) => {
              const isSelected = currentVerse?.text === verse.text;
              return (
                <button
                  key={idx}
                  onClick={() => onSelect(verse)}
                  className={cn(
                    "w-full py-4.5 px-3 text-right block transition-all cursor-pointer border-b border-white/5",
                    isSelected 
                      ? "bg-gold-accent/10 text-gold-accent font-bold" 
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="quran-font text-lg flex-1 leading-loose">{normalizeArabicText(verse.text)}</span>
                    <span className="text-xs text-white/30 shrink-0 font-mono mt-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                      {verse.reference}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
