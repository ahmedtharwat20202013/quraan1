import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Copy, Check, Sparkles, Type, Download, ChevronLeft } from 'lucide-react';
import { toPng } from 'html-to-image';
import { QURAN_CARDS_VERSES, QuranCardVerse } from '../data/quranCardsVerses';
import { CARDS_ADHKAR } from '../data/cardsAdhkar';
import { cn, normalizeArabicText } from '../lib/utils';

const REVERSED_CARDS_VERSES = [...QURAN_CARDS_VERSES].reverse();

export default function QuranCardSection() {
  // States for selected verse
  const [selectedVerse, setSelectedVerse] = useState<QuranCardVerse>(REVERSED_CARDS_VERSES[0]);

  // View state: 'editor' | 'surahs' | 'verses' | 'adhkar_categories' | 'adhkar_items'
  const [viewState, setViewState] = useState<'editor' | 'surahs' | 'verses' | 'adhkar_categories' | 'adhkar_items'>('editor');
  const [selectedSurah, setSelectedSurah] = useState<string>("الفاتحة");
  const [pickerTab, setPickerTab] = useState<'quran' | 'adhkar'>('quran');
  const [selectedAdhkarCategory, setSelectedAdhkarCategory] = useState<string | null>(null);

  // Search state
  const [surahSearch, setSurahSearch] = useState("");
  const [adhkarSearch, setAdhkarSearch] = useState("");

  // Styling states
  const [textSize, setTextSize] = useState(24);
  const [textColor, setTextColor] = useState("#FFEB3B");
  const [isColliding, setIsColliding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadQuality, setDownloadQuality] = useState<'saver' | 'standard' | 'high'>('standard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs for drag and collision detection
  const previewRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<HTMLImageElement>(null);

  // Background states
  const bgImages = useMemo(() => [
     "1.webp",
    "dded1c3b72aab75d7673982cc069b120.webp",
    "download (1)(1).webp",
    "download (2)(1).webp",
    "download (3)(1).webp",
    "download (4)(1).webp",
    "download(1).webp",
    "fc82529cfdd425fabc74faee4764aab2(1).webp",
   
    "01853512baa42a07a14beb1d03253664(1).webp",
    "024cdbd0276601c3e1d1fc8382bcf384(1).webp",
    "060888c7aa7db40749e66e1116577eca.webp",
    "0933d900c8676d4dd466dff64fbd2228(1).webp",
    "0e5de4c2aad950613ba81299057213f7(1).webp",
    "14a01008ae56232b56051be39657d108.webp",
    "18c5042705229497c6ad0c7e47ddf68a(1).webp",
    "4a50edaf89e9728a30a322c68b77a5b9.webp",
    "2.webp",
    "4dafb91afd8fe820065f5b257f195d3a.webp",
    "51794a2d0cc12ba7a49f332dbc8f7cb9.webp",
    "654c436a1df8641a0f7a047460ca2239.webp",
    "66b6eac1e293845fd2388f29bb68476a(1).webp",
    "70e44e7969c6f7d9f0710c49be41100d.webp",
    "70e8e0c93e49874def3195a5e3636c45(1).webp",
    "787cfc7a5f57a4b7121faa57c252c8f5(1).webp",
    "81b03c2dc42ba7f0276c5dee700f7f7c.webp",
    "88f519331963339cd40791470dd51a98(1).webp",
    "93bf5411accd4c4abf61d8d2b3028828.webp",
    "ac50e5048bf375ae52f14735562db54e(1).webp",
    "bc73677accd3df902ce7a73d3fe155a7.webp",
    "c1f17d1abff965ec8864bf0967f07df6(1).webp",
    "c9f04e09bd4514e5eda847b882ccb7e5.webp",
    "cb0c3732a3ea2fab5f987c9a22e76fdd(1).webp",
    
  ], []);

  const [bgType, setBgType] = useState<'preset' | 'custom' | 'image'>('image');
  const [selectedBgPreset, setSelectedBgPreset] = useState(0);
  const [selectedBgImage, setSelectedBgImage] = useState(0);
  const [customBgColor, setCustomBgColor] = useState("#011B0D");

  // Color input references to trigger click
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);

  // Preset backgrounds (30 gorgeous Islamic & premium gradients)
  const bgPresets = useMemo(() => [
    { name: 'زمردي', className: 'from-[#011B0D] via-[#032e18] to-[#001006]' },
    { name: 'ليلي', className: 'from-[#021024] via-[#052659] to-[#010c1e]' },
    { name: 'فحمي', className: 'from-[#121212] via-[#242424] to-[#0a0a0a]' },
    { name: 'ملكي', className: 'from-[#1c0a21] via-[#3a1c43] to-[#0e0411]' },
    { name: 'عنابي', className: 'from-[#2a080c] via-[#4c1c24] to-[#150204]' },
    { name: 'بحر كحلي', className: 'from-[#051923] via-[#003554] to-[#001845]' },
    { name: 'توتي', className: 'from-[#200115] via-[#42022b] to-[#14000b]' },
    { name: 'بني شيكولاتة', className: 'from-[#1b1008] via-[#331c0e] to-[#110904]' },
    { name: 'زيتوني', className: 'from-[#141b08] via-[#2a3811] to-[#0b0f04]' },
    { name: 'سماوي كاحل', className: 'from-[#1a252c] via-[#2c3e50] to-[#11171c]' },
    { name: 'غروب هادئ', className: 'from-[#2d1203] via-[#4d2306] to-[#1b0800]' },
    { name: 'خريف ذهبي', className: 'from-[#241a02] via-[#433203] to-[#150f00]' },
    { name: 'أخضر نعناعي', className: 'from-[#021e1a] via-[#053c35] to-[#011210]' },
    { name: 'بنفسج دافئ', className: 'from-[#22072e] via-[#400e57] to-[#13031a]' },
    { name: 'رمادي جليدي', className: 'from-[#1e272c] via-[#34495e] to-[#151c20]' },
    { name: 'سراب صحراوي', className: 'from-[#281b0a] via-[#4d3618] to-[#1b1103]' },
    { name: 'أزرق غسق', className: 'from-[#0a192f] via-[#172a45] to-[#020c1b]' },
    { name: 'عاجي دافئ', className: 'from-[#211d17] via-[#3d362c] to-[#14120e]' },
    { name: 'خوخ داكن', className: 'from-[#2c1313] via-[#522525] to-[#1c0a0a]' },
    { name: 'فيروزي معتم', className: 'from-[#011d24] via-[#023c4a] to-[#001217]' },
    { name: 'أحمر مرجاني', className: 'from-[#2c0b0e] via-[#56191f] to-[#1b0507]' },
    { name: 'وردي باهت', className: 'from-[#2b0f1a] via-[#501e32] to-[#1c0810]' },
    { name: 'ذهبي فاخر', className: 'from-[#241e05] via-[#463b0a] to-[#141101]' },
    { name: 'بنفسجي حالم', className: 'from-[#1a0b2e] via-[#321657] to-[#0f041d]' },
    { name: 'كاميليا', className: 'from-[#2b0b18] via-[#541632] to-[#1a050e]' },
    { name: 'أزرق ياقوتي', className: 'from-[#021128] via-[#052654] to-[#010916]' },
    { name: 'سجّيل', className: 'from-[#1e140f] via-[#3b271d] to-[#120b08]' },
    { name: 'أرجوان فخم', className: 'from-[#260520] via-[#4d0b40] to-[#160213]' },
    { name: 'زمرد مشع', className: 'from-[#002e1c] via-[#005c38] to-[#001c11]' },
    { name: 'أسود كربوني', className: 'from-[#0f0f0f] via-[#1a1a1a] to-[#050505]' }
  ], []);

  // Preset text colors (high-contrast website styles)
  const textColorPresets = useMemo(() => [
    { name: 'أصفر فاقع', value: '#FFEB3B' },
    { name: 'ذهبي فاخر', value: '#D4AF37' },
    { name: 'ذهبي ساطع', value: '#E5C76B' },
    { name: 'أبيض ناصع', value: '#FFFFFF' },
    { name: 'عاجي ناعم', value: '#F5F5F0' },
    { name: 'سكري هادئ', value: '#FFF8DC' },
    { name: 'وردي ناعم', value: '#FFD1DC' },
    { name: 'سماوي بارد', value: '#E0F7FA' },
    { name: 'أخضر فستقي', value: '#E8F5E9' },
    { name: 'برتقالي هادئ', value: '#FFE0B2' }
  ], []);

  // Helper to extract gradient colors for CSS preview background
  const getGradientBackground = (className: string) => {
    const parts = className.split(' ');
    const fromColor = parts.find(p => p.startsWith('from-['))?.slice(6, -1) || '#011B0D';
    const toColor = parts.find(p => p.startsWith('to-['))?.slice(4, -1) || '#001006';
    return `linear-gradient(135deg, ${fromColor}, ${toColor})`;
  };

  // Get unique surahs from the verses database
  const uniqueSurahs = useMemo(() => {
    return Array.from(new Set(QURAN_CARDS_VERSES.map(v => v.surahName)));
  }, []);

  // Filter surahs based on search query
  const filteredSurahs = useMemo(() => {
    const q = surahSearch.trim();
    if (!q) return uniqueSurahs;
    return uniqueSurahs.filter(name => name.includes(q));
  }, [surahSearch, uniqueSurahs]);

  // Filter Adhkar categories based on search query
  const filteredAdhkarCategories = useMemo(() => {
    const cats = Array.from(new Set(CARDS_ADHKAR.map(item => item.category)));
    const q = adhkarSearch.trim();
    if (!q) return cats;
    return cats.filter(c => c.includes(q));
  }, [adhkarSearch]);



  // Copy text handler
  const handleCopy = () => {
    const textToCopy = selectedVerse.ayah 
      ? `﴿ ${selectedVerse.text} ﴾ [سورة ${selectedVerse.surahName} • آية ${selectedVerse.ayah}]` 
      : `${selectedVerse.text} [${selectedVerse.surahName}]`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show a toast message helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Download Card as Image handler
  const handleDownload = () => {
    const node = document.getElementById('quran-card-preview');
    if (!node) return;



    setDownloading(true);

    const targetWidth = downloadQuality === 'saver' ? 720 : downloadQuality === 'standard' ? 1080 : 1440;
    const targetHeight = downloadQuality === 'saver' ? 1280 : downloadQuality === 'standard' ? 1920 : 2560;

    const nodeWidth = node.offsetWidth;
    const nodeHeight = node.offsetHeight;
    
    // Helper to trigger desktop anchor download
    const triggerAnchorDownload = (dataUrl: string) => {
      const link = document.createElement('a');
      link.download = `quran-card-${selectedVerse.id}.png`;
      link.href = dataUrl;
      link.click();
      showToast("تم الحفظ");
      setDownloading(false);
    };

    // Wait a brief moment to ensure all rendering settles before exporting
    setTimeout(() => {
      toPng(node, {
        cacheBust: false,
        width: targetWidth,
        height: targetHeight,
        style: {
          transform: `scale(${targetWidth / nodeWidth})`,
          transformOrigin: 'top left',
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
          direction: 'rtl',
        }
      })
        .then((dataUrl) => {
          const fileName = `quran-card-${selectedVerse.id}-${Date.now()}.png`;

          // 1. Native Android App saving via AndroidHost Java bridge
          if (typeof window !== 'undefined' && (window as any).AndroidHost && (window as any).AndroidHost.saveImageToGallery) {
            try {
              (window as any).AndroidHost.saveImageToGallery(dataUrl, fileName);
              showToast("تم الحفظ في المعرض بنجاح");
              setDownloading(false);
              return;
            } catch (e) {
              console.error('AndroidHost save error:', e);
            }
          }

          const isDesktop = typeof window !== 'undefined' && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

          if (!isDesktop && navigator.share && navigator.canShare) {
            try {
              const dataURLtoFile = (dataurl: string, filename: string) => {
                const arr = dataurl.split(',');
                const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                  u8arr[n] = bstr.charCodeAt(n);
                }
                return new File([u8arr], filename, { type: mime });
              };

              const file = dataURLtoFile(dataUrl, fileName);
              
              if (navigator.canShare({ files: [file] })) {
                navigator.share({
                  files: [file],
                  title: 'بطاقة إسلامية',
                  text: 'تم تصميم هذه البطاقة بواسطة تطبيق حقيبة المسلم'
                })
                  .then(() => {
                    showToast("تم الحفظ");
                    setDownloading(false);
                  })
                  .catch((err) => {
                    console.error('Error sharing image:', err);
                    triggerAnchorDownload(dataUrl);
                  });
              } else {
                triggerAnchorDownload(dataUrl);
              }
            } catch (shareErr) {
              console.error('Sharing failed, falling back to download:', shareErr);
              triggerAnchorDownload(dataUrl);
            }
          } else {
            triggerAnchorDownload(dataUrl);
          }
        })
        .catch((err) => {
          console.error('Failed to download card image:', err);
          showToast("عذراً، فشل تصدير الصورة!");
          setDownloading(false);
        });
    }, 250);
  };

  return (
    <div className="space-y-6 pb-24 text-right" dir="rtl">
      
      {/* 1. EDITOR VIEW */}
      {viewState === 'editor' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-2xl font-black text-white">إنشاء بطاقة إسلامية</h2>
              <p className="text-xs text-gold-accent font-black mt-1">صمم بطاقة قرآنية فاخرة وشاركها كصورة</p>
            </div>
            <span className="px-3 py-1 text-xs font-black bg-gold-accent/10 border border-gold-accent/20 rounded-xl text-gold-accent shrink-0 flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse" />
              مُولِّد البطاقات
            </span>
          </div>

          {/* Top compact editor toolbar (resembling mobile image editors) */}
          <div className="glass-card p-4.5 max-w-[420px] mx-auto flex flex-col gap-4.5 z-20 relative">
            
            {/* Row 1: Text Size Control */}
            <div className="flex items-center justify-between gap-4 w-full">
              {/* Text size slider (Compact) */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="flex items-center gap-2.5 w-full">
                  <Type size={12} className="text-white/40 shrink-0" />
                  <input 
                    type="range"
                    min="16"
                    max="36"
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gold-accent"
                    title={`حجم الخط: ${textSize}px`}
                  />
                </div>
                <span className="text-[10px] text-gold-accent font-black tracking-wide">حجم الخط: {textSize}px (اضغط واسحب النص لتغيير موضعه بحرية داخل البطاقة)</span>
              </div>
            </div>

            {/* Separator line */}
            <div className="w-full h-[1px] bg-white/5" />

            {/* Horizontal Scrollable Background Image Picker */}
            <div className="space-y-1.5 text-right w-full">
              <label className="text-[10px] text-white/40 font-bold block">صور الخلفية ({bgImages.length} صورة)</label>
              <div className="flex gap-2 overflow-x-auto pb-1.5 pr-1 snap-x scrollbar-thin scrollbar-thumb-white/10">
                {bgImages.map((imgName, idx) => {
                  const imgPath = `/images/background/${imgName}`;
                  const isSelected = bgType === 'image' && selectedBgImage === idx;
                  return (
                    <button
                      key={imgName}
                      onClick={() => {
                        setSelectedBgImage(idx);
                        setBgType('image');
                      }}
                      className={cn(
                        "w-12 h-16 rounded-xl overflow-hidden relative shrink-0 border-2 transition-all snap-start cursor-pointer",
                        isSelected ? "border-gold-accent scale-105 shadow-lg shadow-gold-accent/25" : "border-white/10 hover:border-white/30"
                      )}
                    >
                      <img 
                        src={imgPath} 
                        alt={`Background ${idx + 1}`} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-xs font-black text-gold-accent">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horizontal Scrollable Background Preset Picker (30 premium gradients) */}
            <div className="space-y-1.5 text-right w-full">
              <div className="flex justify-between items-center w-full">
                <label className="text-[10px] text-white/40 font-bold block">التدرجات اللونية الفاخرة ({bgPresets.length})</label>
                {/* Custom Bg Color wheel button */}
                <button
                  onClick={() => bgColorInputRef.current?.click()}
                  className="text-[10px] text-gold-accent font-black hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>لون مخصص 🎨</span>
                </button>
                <input 
                  ref={bgColorInputRef}
                  type="color" 
                  value={customBgColor}
                  onChange={(e) => {
                    setCustomBgColor(e.target.value);
                    setBgType('custom');
                  }}
                  className="absolute w-0 h-0 opacity-0 pointer-events-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1.5 pr-1 snap-x scrollbar-thin scrollbar-thumb-white/10">
                {bgPresets.map((preset, idx) => {
                  const isSelected = bgType === 'preset' && selectedBgPreset === idx;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setSelectedBgPreset(idx);
                        setBgType('preset');
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full shrink-0 border-2 transition-all snap-start cursor-pointer flex items-center justify-center relative shadow-md",
                        isSelected ? "border-gold-accent scale-105 shadow-lg shadow-gold-accent/25" : "border-white/10 hover:border-white/30"
                      )}
                      style={{
                        background: getGradientBackground(preset.className)
                      }}
                      title={preset.name}
                    >
                      {isSelected && (
                        <span className="text-[9px] font-black text-gold-accent drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horizontal Scrollable Text Color Picker */}
            <div className="space-y-1.5 text-right w-full">
              <div className="flex justify-between items-center w-full">
                <label className="text-[10px] text-white/40 font-bold block">لون الخط والكتابة</label>
                {/* Custom Color Wheel Button */}
                <button
                  onClick={() => textColorInputRef.current?.click()}
                  className="text-[10px] text-gold-accent font-black hover:underline cursor-pointer flex items-center gap-1"
                  title="اختر لون نص حر"
                >
                  <span>لون مخصص 🎨</span>
                </button>
                <input 
                  ref={textColorInputRef}
                  type="color" 
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="absolute w-0 h-0 opacity-0 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {textColorPresets.map((preset) => {
                  const isSelected = textColor.toLowerCase() === preset.value.toLowerCase();
                  return (
                    <button
                      key={preset.value}
                      onClick={() => setTextColor(preset.value)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 shrink-0 transition-all cursor-pointer flex items-center justify-center shadow-sm",
                        isSelected ? "border-gold-accent scale-105 shadow-md shadow-gold-accent/20" : "border-white/10 hover:border-white/30"
                      )}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    >
                      {isSelected && (
                        <span className="text-[10px] font-black text-emerald-950">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verse Selector navigation button (takes to full-screen picker) */}
            <button
              onClick={() => {
                setViewState(pickerTab === 'quran' ? 'surahs' : 'adhkar_categories');
              }}
              className="w-full py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all cursor-pointer shadow-md"
            >
              <span>تغيير الكلمات 📖</span>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Large Preview Card ( Instagram Portrait Style 4:5 ) */}
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-[420px] space-y-5 relative">
              
              <div 
                ref={previewRef}
                id="quran-card-preview"
                dir="rtl"
                className={cn(
                  "relative w-full aspect-[9/16] max-w-[320px] mx-auto overflow-hidden rounded-[2.5rem] border-2 border-gold-accent/30 shadow-2xl flex flex-col p-9 transition-all bg-no-repeat bg-cover bg-center",
                  bgType === 'preset' ? `bg-gradient-to-br ${bgPresets[selectedBgPreset].className}` : ''
                )}
                style={
                  bgType === 'custom' 
                    ? { backgroundColor: customBgColor, backgroundImage: 'none' } 
                    : bgType === 'image'
                    ? { backgroundImage: `url("/images/background/${bgImages[selectedBgImage]}")` }
                    : undefined
                }
              >
                {/* Overlay for background image legibility */}
                {bgType === 'image' && (
                  <div className="absolute inset-0 bg-black/45 z-0 pointer-events-none" />
                )}

                {/* Islamic Frames */}
                <div className="absolute inset-4 border border-gold-accent/20 rounded-[2rem] pointer-events-none z-10" />
                <div className="absolute inset-5 border border-gold-accent/10 rounded-[1.75rem] pointer-events-none z-10" />

                {/* Corner Decorative Borders */}
                <div className="absolute top-6 right-6 text-gold-accent/30 pointer-events-none z-10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M4 4h8M4 4v8" />
                  </svg>
                </div>
                <div className="absolute top-6 left-6 text-gold-accent/30 pointer-events-none z-10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M20 4h-8M20 4v8" />
                  </svg>
                </div>
                <div className="absolute bottom-6 right-6 text-gold-accent/30 pointer-events-none z-10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M4 20h8M4 20v-8" />
                  </svg>
                </div>
                <div className="absolute bottom-6 left-6 text-gold-accent/30 pointer-events-none z-10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M20 20h-8M20 20v-8" />
                  </svg>
                </div>

                {/* Rotating Islamic Watermark Pattern */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-10">
                  <svg width="320" height="320" viewBox="0 0 24 24" fill="currentColor" className="text-gold-accent animate-spin-slow">
                    <path d="M12 2l2.5 3.5 4 .5-1.5 4 2.5 3.5-3.5 2.5-.5 4-4-1.5-3.5 2.5-2.5-3.5-4-.5 1.5-4L2 9.5l3.5-2.5.5-4 4 1.5z" />
                  </svg>
                </div>

                {/* App Signature Watermark (Slightly smaller & shifted inward to bottom-8 right-8 so it never touches card borders or frame flourishes) */}
                <img 
                  src="/icon/amdaa.webp" 
                  alt="App Signature" 
                  className="absolute bottom-8 right-8 w-[58px] h-auto pointer-events-none z-20 select-none opacity-85" 
                />

                {/* Content Holder with Draggable Text Container */}
                <div className="w-full h-full flex items-center justify-center relative z-10 pointer-events-none">
                  <motion.div 
                    ref={textRef}
                    drag
                    dragConstraints={previewRef}
                    dragElastic={0.05}
                    dragMomentum={false}
                    className="cursor-grab active:cursor-grabbing select-none w-full px-6 py-4 pointer-events-auto"
                  >
                    <div className="text-center space-y-5 pointer-events-none">
                      {/* Quranic Verse wrapped in elegant brackets or Dhikr/Dua text */}
                      <p 
                        className="quran-font text-center drop-shadow-[0_2.5px_10px_rgba(0,0,0,0.9)] break-words max-w-[95%] mx-auto"
                        style={{ color: textColor, fontSize: `${textSize}px`, lineHeight: 1.8 }}
                      >
                        {normalizeArabicText(selectedVerse.text)}
                      </p>

                      {/* Surah Name & Verse citation below or Dhikr category title */}
                      <p 
                        className="arabic-text-sans text-sm font-extrabold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-widest uppercase"
                        style={{ color: textColor.toLowerCase() === '#ffffff' ? '#D4AF37' : textColor }}
                      >
                        {selectedVerse.ayah 
                          ? `سورة ${selectedVerse.surahName} • الآية ${selectedVerse.ayah}` 
                          : selectedVerse.surahName
                        }
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Quality Selection bar */}
              <div className="space-y-1.5 w-full max-w-[320px] mx-auto">
                <label className="text-[10px] text-white/40 font-bold block text-right">دقة تحميل الصورة</label>
                <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                  {[
                    { id: 'saver', label: 'توفير البيانات' },
                    { id: 'standard', label: '⭐ قياسية' },
                    { id: 'high', label: '💎 عالية' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setDownloadQuality(item.id as any)}
                      className={cn(
                        "py-1.5 px-0.5 text-[9px] font-black rounded-lg transition-all cursor-pointer text-center",
                        downloadQuality === item.id 
                          ? "bg-gold-accent text-[#031B10] font-black shadow-md" 
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Download & Copy side by side */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-[320px] mx-auto">
                <button 
                  onClick={handleDownload}
                  disabled={downloading}
                  className="py-4 rounded-2xl bg-gold-accent hover:bg-gold-bright text-[#031B10] transition-all text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/10 disabled:opacity-50"
                >
                  {downloading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#031B10] border-t-transparent rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      تحميل كصورة
                    </>
                  )}
                </button>
                <button 
                  onClick={handleCopy}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:text-gold-accent transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/10"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      تم النسخ!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      نسخ النص
                    </>
                  )}
                </button>
              </div>

              {/* Help Tip */}
              <div className="p-4 rounded-2xl bg-gold-accent/5 border border-gold-accent/15 text-center w-full max-w-[320px] mx-auto">
                <p className="text-[10px] text-white/50 leading-relaxed font-bold">
                  💡 تلميح: يمكنك اختيار دقة تحميل الصورة، ثم الضغط على "تحميل كصورة" لحفظها مباشرة بالاستوديو.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PICKER SCREENS (Surahs, Verses, Adhkar Categories, Adhkar Items) */}
      {viewState !== 'editor' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-xl font-black text-white">
                {viewState === 'surahs' && "اختر السورة الكريمة"}
                {viewState === 'verses' && `سورة ${selectedSurah}`}
                {viewState === 'adhkar_categories' && "اختر تصنيف الأذكار والأدعية"}
                {viewState === 'adhkar_items' && selectedAdhkarCategory}
              </h2>
              <p className="text-xs text-white/40 mt-1">
                {(viewState === 'surahs' || viewState === 'verses') && "تصفح السور والآيات الكريمة لإضافتها بالبطاقة"}
                {(viewState === 'adhkar_categories' || viewState === 'adhkar_items') && "تصفح الأدعية والأذكار المأثورة للبطاقة"}
              </p>
            </div>
            
            {/* Back Button */}
            <button 
              onClick={() => {
                if (viewState === 'verses') {
                  setViewState('surahs');
                } else if (viewState === 'adhkar_items') {
                  setViewState('adhkar_categories');
                } else {
                  setViewState('editor');
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60 hover:text-white flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <ChevronLeft size={12} className="rotate-180" />
              {viewState === 'verses' && "رجوع للسور"}
              {viewState === 'adhkar_items' && "رجوع للتصنيفات"}
              {(viewState === 'surahs' || viewState === 'adhkar_categories') && "إلغاء"}
            </button>
          </div>

          {/* Sliding Tabs Indicator */}
          <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
            <button
              onClick={() => {
                setPickerTab('quran');
                setViewState(selectedSurah ? 'verses' : 'surahs');
              }}
              className={cn(
                "flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer",
                (viewState === 'surahs' || viewState === 'verses')
                  ? "bg-gold-accent text-neutral-950 shadow-md font-bold" 
                  : "text-white/40 hover:text-white"
              )}
            >
              القرآن الكريم
            </button>
            <button
              onClick={() => {
                setPickerTab('adhkar');
                setViewState(selectedAdhkarCategory ? 'adhkar_items' : 'adhkar_categories');
              }}
              className={cn(
                "flex-1 py-3 text-xs font-black rounded-xl transition-all cursor-pointer",
                (viewState === 'adhkar_categories' || viewState === 'adhkar_items')
                  ? "bg-gold-accent text-neutral-950 shadow-md font-bold" 
                  : "text-white/40 hover:text-white"
              )}
            >
              الأدعية والأذكار
            </button>
          </div>

          {/* SUB-VIEWS */}
          
          {/* Subview A: Surahs */}
          {viewState === 'surahs' && (
            <div className="space-y-6">
              {/* Search Box */}
              <div className="relative group">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="ابحث عن السورة..." 
                  value={surahSearch}
                  onChange={(e) => setSurahSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pr-10 pl-4 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right text-sm font-bold text-white"
                />
              </div>

              {/* Grid Layout of Surahs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredSurahs.map((surahName) => {
                  const count = QURAN_CARDS_VERSES.filter(v => v.surahName === surahName).length;
                  return (
                    <button
                      key={surahName}
                      onClick={() => {
                        setSelectedSurah(surahName);
                        setViewState('verses');
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

          {/* Subview B: Verses */}
          {viewState === 'verses' && (
            <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1 divide-y divide-white/5">
              {QURAN_CARDS_VERSES.filter(v => v.surahName === selectedSurah).map((verse) => (
                <button
                  key={verse.id}
                  onClick={() => {
                    setSelectedVerse(verse);
                    setViewState('editor');
                  }}
                  className={cn(
                    "w-full py-4.5 px-3 text-right block transition-all cursor-pointer border-b border-white/5",
                    selectedVerse.id === verse.id && selectedVerse.ayah
                      ? "bg-gold-accent/10 text-gold-accent font-bold" 
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="arabic-text text-lg flex-1 leading-loose">{normalizeArabicText(verse.text)}</span>
                    <span className="text-xs text-white/30 shrink-0 font-mono mt-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-bold">آية {verse.ayah}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Subview C: Adhkar Categories */}
          {viewState === 'adhkar_categories' && (
            <div className="space-y-6">
              {/* Search Box */}
              <div className="relative group">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="ابحث عن أذكار أو أدعية..." 
                  value={adhkarSearch}
                  onChange={(e) => setAdhkarSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pr-10 pl-4 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right text-sm font-bold text-white"
                />
              </div>

              {/* Grid of Adhkar Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredAdhkarCategories.map((catName) => {
                  const count = CARDS_ADHKAR.filter(v => v.category === catName).length;
                  return (
                    <button
                      key={catName}
                      onClick={() => {
                        setSelectedAdhkarCategory(catName);
                        setViewState('adhkar_items');
                      }}
                      className="p-4.5 rounded-2xl bg-white/5 border border-white/10 hover:border-gold-accent/40 text-right flex justify-between items-center transition-all group cursor-pointer hover:bg-white/[0.07]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl border border-gold-accent/20 bg-gold-accent/5 flex items-center justify-center text-[10px] font-mono text-gold-accent font-black">
                          ✨
                        </div>
                        <span className="font-bold text-white group-hover:text-gold-accent transition-colors text-sm">{catName}</span>
                      </div>
                      <span className="text-[10px] text-gold-accent/80 font-bold bg-gold-accent/5 border border-gold-accent/10 px-2.5 py-1 rounded-lg">
                        {count} ذكر
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subview D: Adhkar Items */}
          {viewState === 'adhkar_items' && selectedAdhkarCategory && (
            <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1 divide-y divide-white/5">
              {CARDS_ADHKAR.filter(v => v.category === selectedAdhkarCategory).map((dhikr) => (
                <button
                  key={dhikr.id}
                  onClick={() => {
                    setSelectedVerse({
                      id: dhikr.id,
                      text: dhikr.text,
                      surahName: dhikr.category,
                      ayah: "" // Empty string flags it as Adhkar/Dua
                    });
                    setViewState('editor');
                  }}
                  className={cn(
                    "w-full py-4.5 px-3 text-right block transition-all cursor-pointer border-b border-white/5",
                    selectedVerse.id === dhikr.id && !selectedVerse.ayah
                      ? "bg-gold-accent/10 text-gold-accent font-bold" 
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="arabic-text text-lg flex-1 leading-loose">{normalizeArabicText(dhikr.text)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-28 left-4 right-4 max-w-xs mx-auto z-50 bg-emerald-950/95 border border-gold-accent/40 backdrop-blur-md px-5 py-3 rounded-2xl flex items-center justify-center shadow-2xl text-center"
          >
            <p className="text-xs font-black text-white tracking-wide">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
