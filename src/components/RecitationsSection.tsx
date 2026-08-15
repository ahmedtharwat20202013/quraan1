import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  User, 
  HelpCircle, 
  Play, 
  Pause, 
  Square, 
  ChevronLeft, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw,
  Disc,
  Heart,
  Download,
  Trash2,
  Check,
  Loader2,
  BookOpen
} from 'lucide-react';
import { Reciter, APISurah, Moshaf } from '../types';
import { QuranApiService } from '../services/api';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { OfflineAudioService } from '../services/offlineAudio';
import { cn } from '../lib/utils';
import Skeleton from './ui/Skeleton';
import EmptyState from './ui/EmptyState';

export default function RecitationsSection() {
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [suwar, setSuwar] = useState<APISurah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [surahSearchQuery, setSurahSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Selection states
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [selectedMoshaf, setSelectedMoshaf] = useState<Moshaf | null>(null);
  
  // Favorites for reciters
  const [favoriteReciterIds, setFavoriteReciterIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('reciter_favorites_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [filterTab, setFilterTab] = useState<'all' | 'favorites'>('all');
  
  // Custom audio player hook
  const audioPlayer = useAudioPlayer();

  // Offline audio states & subscriptions
  const [offlineState, setOfflineState] = useState(() => OfflineAudioService.getState());
  const [reciterDownloadedSize, setReciterDownloadedSize] = useState<number>(0);
  const [batchDownloading, setBatchDownloading] = useState(false);

  // Scroll to top on list/view transition
  useEffect(() => {
    const doScroll = () => {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTo({ top: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, behavior: 'instant' });
    };

    doScroll();
    const timer = setTimeout(doScroll, 80);
    return () => clearTimeout(timer);
  }, [selectedReciter, selectedMoshaf, filterTab]);

  useEffect(() => {
    const unsubscribe = OfflineAudioService.subscribe((state) => {
      setOfflineState(state);
    });
    return unsubscribe;
  }, []);

  // Helper to construct Surah Audio URL
  const getSurahUrl = useCallback((surahId: number) => {
    if (!selectedMoshaf) return '';
    let serverUrl = selectedMoshaf.server;
    if (serverUrl.startsWith('http://')) {
      serverUrl = serverUrl.replace('http://', 'https://');
    }
    const baseUrl = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
    const paddedNum = String(surahId).padStart(3, '0');
    return `${baseUrl}${paddedNum}.mp3`;
  }, [selectedMoshaf]);

  // Available suwar strictly filtered for the currently selected Sheikh & Moshaf
  const reciterAvailableSuwar = useMemo(() => {
    if (!selectedMoshaf || !selectedMoshaf.surah_list) return suwar;
    const availableIds = new Set(
      selectedMoshaf.surah_list
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(id => !isNaN(id))
    );
    return suwar.filter(s => availableIds.has(s.id));
  }, [selectedMoshaf, suwar]);

  // Filter available suwar by local search query inside the Sheikh view
  const displayedSuwar = useMemo(() => {
    if (!surahSearchQuery.trim()) return reciterAvailableSuwar;
    const query = surahSearchQuery.trim().toLowerCase();
    return reciterAvailableSuwar.filter(s => 
      s.name.includes(query) || String(s.id).includes(query)
    );
  }, [reciterAvailableSuwar, surahSearchQuery]);

  // Feed available suwar list to audio service for seamless auto-advance through existing surahs only
  useEffect(() => {
    if (selectedReciter && reciterAvailableSuwar.length > 0) {
      audioPlayer.setSuwarList(reciterAvailableSuwar);
    }
  }, [selectedReciter, reciterAvailableSuwar]);

  // Track the total downloaded size on the device for this specific Qari'
  useEffect(() => {
    if (!selectedReciter) return;
    
    let isMounted = true;
    const fetchDownloadedSize = async () => {
      const all = await OfflineAudioService.getAllDownloads();
      const filtered = all.filter(d => d.reciterName === selectedReciter.name);
      const totalSize = filtered.reduce((acc, curr) => acc + curr.size, 0);
      if (isMounted) {
        setReciterDownloadedSize(totalSize);
      }
    };
    
    fetchDownloadedSize();
    
    return () => {
      isMounted = false;
    };
  }, [selectedReciter, offlineState.downloadedUrls]);

  // Action: Download single Surah
  const handleDownloadSurah = async (surah: APISurah, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent playing track when clicking download
    if (!selectedReciter || !selectedMoshaf) return;
    const url = getSurahUrl(surah.id);
    if (!url) return;
    
    await OfflineAudioService.downloadSurah(
      url,
      surah,
      selectedReciter.name,
      selectedMoshaf.name
    );
  };

  // Action: Delete offline Surah
  const handleDeleteDownload = async (surahId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent playing
    const url = getSurahUrl(surahId);
    if (!url) return;
    await OfflineAudioService.deleteDownload(url);
  };

  // Action: Download all available Suras for this Qari'
  const handleDownloadAll = async () => {
    if (!selectedReciter || !selectedMoshaf || batchDownloading) return;
    
    // Filter available suwar that aren't already downloaded
    const toDownload = reciterAvailableSuwar.filter(s => {
      const url = getSurahUrl(s.id);
      return url && !offlineState.downloadedUrls.has(url);
    });

    if (toDownload.length === 0) {
      alert('جميع السور المتاحة لهذا القارئ محملة بالفعل على جهازك!');
      return;
    }

    setBatchDownloading(true);
    
    const batchItems = toDownload.map(surah => ({
      url: getSurahUrl(surah.id),
      surah,
      reciterName: selectedReciter.name,
      moshafName: selectedMoshaf.name
    }));

    try {
      await OfflineAudioService.downloadBatch(batchItems);
    } catch (err) {
      console.error('Batch download failed:', err);
    } finally {
      setBatchDownloading(false);
    }
  };

  // Calculate statistics for this Qari'
  const reciterStats = useMemo(() => {
    if (!selectedReciter || !selectedMoshaf) return { total: 0, downloaded: 0, percentage: 0 };
    
    const total = reciterAvailableSuwar.length;
    const downloaded = reciterAvailableSuwar.filter(s => {
      const url = getSurahUrl(s.id);
      return url && offlineState.downloadedUrls.has(url);
    }).length;
    
    const percentage = total > 0 ? Math.round((downloaded / total) * 100) : 0;
    
    return { total, downloaded, percentage };
  }, [selectedReciter, selectedMoshaf, reciterAvailableSuwar, offlineState.downloadedUrls, getSurahUrl]);

  // Calculate remaining size in MB
  const remainingSizeInMB = useMemo(() => {
    if (!selectedReciter || !selectedMoshaf) return 0;
    
    const toDownload = reciterAvailableSuwar.filter(s => {
      const url = getSurahUrl(s.id);
      return url && !offlineState.downloadedUrls.has(url);
    });

    const sum = toDownload.reduce((acc, s) => {
      const pages = Math.max(1, s.end_page - s.start_page + 1);
      return acc + (pages * 1.1);
    }, 0);
    
    return sum;
  }, [selectedReciter, selectedMoshaf, reciterAvailableSuwar, offlineState.downloadedUrls, getSurahUrl]);

  const toggleFavoriteReciter = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const strId = String(id);
    let updated: string[];
    if (favoriteReciterIds.includes(strId)) {
      updated = favoriteReciterIds.filter(x => x !== strId);
    } else {
      updated = [...favoriteReciterIds, strId];
    }
    setFavoriteReciterIds(updated);
    localStorage.setItem('reciter_favorites_list', JSON.stringify(updated));
  };

  // Load Reciters & Suwar on Mount
  useEffect(() => {
    loadData();
    (window as any).isListeningTab = true;
    return () => {
      (window as any).isListeningTab = false;
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel loading for maximum speed
      const [recitersData, suwarData] = await Promise.all([
        QuranApiService.getReciters(),
        QuranApiService.getSuwar(),
      ]);

      // Sort reciters alphabetically
      let sortedReciters = [...recitersData].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

      // Check downloaded Qaris in local storage and add them if missing
      try {
        const downloads = await OfflineAudioService.getAllDownloads();
        const downloadedQaris = new Map<string, string>();
        downloads.forEach(d => {
          if (d.reciterName) {
            downloadedQaris.set(d.reciterName, d.moshafName || 'حفص عن عاصم');
          }
        });

        downloadedQaris.forEach((moshafName, reciterName) => {
          const exists = sortedReciters.some(r => r.name === reciterName);
          if (!exists) {
            sortedReciters.push({
              id: Math.floor(Math.random() * 100000) + 5000,
              name: reciterName,
              letter: reciterName.charAt(0),
              moshaf: [
                {
                  id: Math.floor(Math.random() * 100000) + 5000,
                  name: moshafName,
                  server: '',
                  surah_list: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114'
                }
              ]
            });
          }
        });

        sortedReciters = sortedReciters.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      } catch (e) {
        console.error('Error loading offline downloads:', e);
      }

      setReciters(sortedReciters);
      
      // Sort suwar by ID
      const sortedSuwar = [...suwarData].sort((a, b) => a.id - b.id);
      setSuwar(sortedSuwar);
      
      // Feed suwar list to audio service for auto-advance
      audioPlayer.setSuwarList(sortedSuwar);
    } catch (err: any) {
      console.error(err);
      setError('تعذر جلب البيانات من السيرفر. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  // Filter Reciters by Search Query and Favorites
  const filteredReciters = useMemo(() => {
    let list = reciters;
    
    // Filter by tab
    if (filterTab === 'favorites') {
      list = list.filter(r => favoriteReciterIds.includes(String(r.id)));
    }
    
    if (!searchQuery.trim()) return list;
    const query = searchQuery.trim().toLowerCase();
    return list.filter(r => 
      r.name.includes(query) || 
      (r.moshaf && r.moshaf.some(m => m.name.toLowerCase().includes(query)))
    );
  }, [reciters, searchQuery, filterTab, favoriteReciterIds]);

  // Handle Reciter Choice
  const handleSelectReciter = (reciter: Reciter) => {
    setSelectedReciter(reciter);
    setSurahSearchQuery('');
    // Auto-select standard Hafs recitation if available, or fall back to the first available moshaf
    if (reciter.moshaf && reciter.moshaf.length > 0) {
      const hafsMoshaf = reciter.moshaf.find(m => m.name.includes("حفص") || m.name.includes("Hafs") || m.name.includes("حفص عن عاصم"));
      setSelectedMoshaf(hafsMoshaf || reciter.moshaf[0]);
    } else {
      setSelectedMoshaf(null);
    }
  };

  // Format second counts to MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Handle playing a surah
  const handlePlaySurah = (surah: APISurah) => {
    if (!selectedReciter || !selectedMoshaf) return;
    
    audioPlayer.playSurah(
      surah,
      selectedMoshaf.server,
      selectedReciter.name,
      selectedMoshaf.name
    );
  };

  return (
    <div className="space-y-6 pb-36">
      {/* Offline Mode Banner */}
      {typeof navigator !== 'undefined' && !navigator.onLine && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-950/40 border border-emerald-500/25 rounded-2xl p-4 flex items-center justify-between text-right text-xs font-black text-emerald-400"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>وضع التشغيل بدون إنترنت: تم جلب أسماء الشيوخ والسور محلياً، ويمكنك تشغيل السور المحملة مسبقاً بنجاح.</span>
          </div>
        </motion.div>
      )}

      {/* Header */}
      {!selectedReciter && (
        <header className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-4xl font-black tracking-tight mb-2">إذاعة التلاوات</h2>
              <p className="text-gold-accent text-xs font-bold">بث مباشر لأجود وأعذب قراءات القرآن الكريم بمختلف الروايات</p>
            </div>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
              className="w-12 h-12 rounded-full border border-gold-accent/20 flex items-center justify-center text-gold-accent hidden sm:flex shrink-0 bg-white/5"
            >
              <Sparkles size={20} />
            </motion.div>
          </div>

          {/* Search bar */}
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="ابحث باسم القارئ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[1.8rem] py-4 pr-12 pl-6 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right font-bold text-sm"
            />
          </div>

          {/* Favorites/All Filter Tabs */}
          <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
            <button
              onClick={() => setFilterTab('all')}
              className={cn(
                "flex-1 py-3 text-xs font-black rounded-xl transition-all relative",
                filterTab === 'all' 
                  ? "bg-gold-accent text-neutral-950 shadow-md font-bold" 
                  : "text-white/40 hover:text-white"
              )}
            >
              كل القراء
            </button>
            <button
              onClick={() => setFilterTab('favorites')}
              className={cn(
                "flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 relative",
                filterTab === 'favorites' 
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/25 shadow-md font-bold" 
                  : "text-white/40 hover:text-white"
              )}
            >
              <Heart size={14} className={cn(filterTab === 'favorites' ? "fill-current text-rose-400" : "text-white/40")} />
              المفضلة ({favoriteReciterIds.length})
            </button>
          </div>
        </header>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton variant="card" count={6} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-8 text-center space-y-6 bg-rose-500/5 rounded-[2rem] border border-rose-500/20 max-w-sm mx-auto shadow-lg">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <AlertTriangle size={32} aria-hidden="true" />
          </div>
          <p className="text-white/80 text-sm font-bold leading-relaxed">{error}</p>
          <button 
            onClick={loadData}
            role="button"
            aria-label="إعادة محاولة تحميل قائمة القراء"
            className="px-6 py-3 bg-white text-emerald-950 font-black text-xs rounded-xl flex items-center gap-2 mx-auto shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw size={14} aria-hidden="true" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Reciters List Section */}
      {!loading && !error && !selectedReciter && (
        <>
          {filteredReciters.length === 0 ? (
            <EmptyState
              icon={filterTab === 'favorites' ? <Heart size={32} className="text-rose-500 animate-pulse" aria-hidden="true" /> : <HelpCircle size={32} aria-hidden="true" />}
              title={filterTab === 'favorites' ? "لا توجد شيوخ مفضلة" : "لم نعثر على نتائج"}
              description={
                filterTab === 'favorites' 
                  ? "قائمة الشيوخ المفضلة فارغة حالياً. أضف الشيوخ المفضلين لديك بالضغط على زر القلب ❤️ بجوار اسم الشيخ." 
                  : `لم نجد أي قارئ يطابق البحث عن "${searchQuery}". يرجى تجربة اسم قارئ آخر.`
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
              <AnimatePresence>
                {filteredReciters.map((reciter) => {
                  const preferredMoshaf = reciter.moshaf && (
                    reciter.moshaf.find(m => m.name.includes("حفص") || m.name.includes("Hafs") || m.name.includes("حفص عن عاصم")) || 
                    reciter.moshaf[0]
                  );
                  const isFav = favoriteReciterIds.includes(String(reciter.id));
                  return (
                    <motion.div
                      key={reciter.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectReciter(reciter)}
                      role="listitem"
                      aria-label={`القارئ ${reciter.name}. اضغط لتصفح السور المتاحة`}
                      className="glass-card p-5 flex items-center justify-between cursor-pointer group hover:bg-white/10 transition-all shadow-md relative overflow-hidden"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-gold-accent/10 transition-all font-black text-gold-accent shadow-inner">
                          <User size={18} aria-hidden="true" />
                        </div>
                        <div className="text-right">
                          <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight mb-1 group-hover:text-gold-accent transition-colors">
                            {reciter.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            {preferredMoshaf && (
                              <span className="text-xs text-white/50 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-black">
                                {preferredMoshaf.name.replace("المصحف المرتل", "مرتل")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 relative z-20">
                        <button
                          onClick={(e) => toggleFavoriteReciter(reciter.id, e)}
                          role="button"
                          aria-label={isFav ? `إزالة الشيخ ${reciter.name} من المفضلة` : `إضافة الشيخ ${reciter.name} إلى المفضلة`}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/10 text-white/30 hover:text-rose-400 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                        >
                          <Heart size={16} className={cn(isFav ? "fill-rose-500 text-rose-500" : "")} aria-hidden="true" />
                        </button>
                        <ChevronLeft size={16} className="text-white/20 group-hover:text-gold-accent transition-all rotate-180" aria-hidden="true" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Drill-down Surah List for Selected Reciter */}
      {!loading && !error && selectedReciter && (
        <div className="space-y-6">
          {/* Back button and profile header */}
          <div className="space-y-4">
            <button 
              onClick={() => setSelectedReciter(null)}
              className="flex items-center gap-2 text-white/55 hover:text-gold-accent font-black text-xs transition-colors py-2"
            >
              <ChevronLeft size={16} />
              <span>العودة لقائمة القراء</span>
            </button>

            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card-accent p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2">
                <span className="inline-flex px-3 py-1 bg-gold-accent/25 text-gold-bright rounded-full text-[9px] font-black uppercase tracking-wider">
                  القارئ المختار
                </span>
                <h3 className="text-2xl font-black text-white">{selectedReciter.name}</h3>
                
                {/* Multiple Moshafs / Recitations Switcher */}
                {selectedReciter.moshaf && selectedReciter.moshaf.length > 1 ? (
                  <div className="pt-2">
                    <p className="text-xs text-white/50 font-bold mb-2">اختر الرواية / التسجيل:</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedReciter.moshaf.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMoshaf(m)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border",
                            selectedMoshaf?.id === m.id
                              ? "bg-gold-accent text-emerald-950 border-gold-accent shadow-md"
                              : "bg-white/5 text-white/60 border-white/10 hover:border-gold-accent/30 hover:text-white"
                          )}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/50 font-bold flex items-center gap-1.5 pt-1">
                    <span>المصحف:</span>
                    <span className="text-gold-accent">{selectedMoshaf?.name || 'حفص عن عاصم'}</span>
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 border border-white/10 rounded-[2rem] space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-extrabold text-white text-sm">الاستماع بدون اتصال بالإنترنت (أوفلاين)</h4>
                <p className="text-white/40 text-[11px] font-bold mt-1">
                  قم بتحميل السور المفضلة لديك لتشغيلها مباشرة في أي وقت دون استهلاك باقة الإنترنت.
                </p>
              </div>
              
              <button
                onClick={handleDownloadAll}
                disabled={batchDownloading || reciterStats.downloaded === reciterStats.total}
                className={cn(
                  "px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md shrink-0 w-full sm:w-auto justify-center",
                  batchDownloading 
                    ? "bg-white/10 text-white/50 cursor-not-allowed"
                    : reciterStats.downloaded === reciterStats.total
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 cursor-default"
                      : "bg-gold-accent text-emerald-950 hover:scale-[1.02] active:scale-95 cursor-pointer"
                )}
              >
                {batchDownloading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>جاري تحميل الكل...</span>
                  </>
                ) : reciterStats.downloaded === reciterStats.total ? (
                  <>
                    <Check size={14} />
                    <span>تم تحميل كل السور المتاحة</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>تنزيل جميع السور المتاحة ({reciterStats.total - reciterStats.downloaded}) • حوالي {Math.round(remainingSizeInMB)} ميجا</span>
                  </>
                )}
              </button>
            </div>

            {/* Stats & Progress Bar */}
            <div className="pt-2 border-t border-white/5 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold text-white/60">
                <span className="flex items-center gap-1.5">
                  <span>السور المحملة أوفلاين:</span>
                  <span className="text-gold-accent">{reciterStats.downloaded} سورة من أصل {reciterStats.total} سورة متاحة</span>
                </span>
                {reciterDownloadedSize > 0 && (
                  <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                    الحجم الإجمالي: {OfflineAudioService.formatSize(reciterDownloadedSize)}
                  </span>
                )}
              </div>

              {reciterStats.total > 0 && (
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-l from-gold-bright to-gold-accent h-full rounded-full transition-all duration-500"
                    style={{ width: `${reciterStats.percentage}%` }}
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Surah List Header and Search */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-extrabold text-white text-lg pr-1 flex items-center gap-2">
                  <span>السور المتاحة بصوت الشيخ</span>
                  <span className="text-xs bg-gold-accent/20 text-gold-accent px-2.5 py-0.5 rounded-full font-black">
                    {reciterAvailableSuwar.length} سورة
                  </span>
                </h4>
                <p className="text-white/40 text-xs font-bold pr-1 mt-0.5">
                  تم عرض السور المسجلة المتوفرة فقط بصوت {selectedReciter.name}.
                </p>
              </div>
            </div>

            {/* Local Surah Search Bar */}
            {reciterAvailableSuwar.length > 5 && (
              <div className="relative group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="ابحث باسم السورة أو رقمها لدى القارئ..." 
                  value={surahSearchQuery}
                  onChange={(e) => setSurahSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-11 pl-4 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right font-bold text-xs"
                />
              </div>
            )}
          </div>

          {/* Surah list */}
          {displayedSuwar.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={32} aria-hidden="true" />}
              title="لم نعثر على نتائج"
              description={`لم نجد أي سورة تطابق البحث عن "${surahSearchQuery}" لدى الشيخ ${selectedReciter.name}.`}
            />
          ) : (
            <div className="space-y-3">
              {displayedSuwar.map((surah) => {
                const isCurrent = audioPlayer.currentSurahNumber === surah.id && 
                                  audioPlayer.currentReciterName === selectedReciter.name;
                const surahUrl = getSurahUrl(surah.id);
                const isDownloaded = offlineState.downloadedUrls.has(surahUrl);
                const downloadProgress = offlineState.downloadProgress.get(surahUrl);
                
                return (
                  <motion.div
                    key={surah.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "glass-card p-4 flex items-center justify-between transition-all relative overflow-hidden cursor-pointer group hover:bg-white/10",
                      isCurrent ? "border-gold-accent/40 bg-gold-accent/5" : ""
                    )}
                    onClick={() => handlePlaySurah(surah)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Surah ID number layout */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors",
                        isCurrent ? "bg-gold-accent text-emerald-950 shadow-md" : "bg-white/5 text-white/30 group-hover:bg-gold-accent/10 group-hover:text-gold-accent"
                      )}>
                        {surah.id}
                      </div>

                      <div className="text-right">
                        <h4 className={cn(
                          "font-extrabold text-base transition-colors",
                          isCurrent ? "text-gold-accent" : "text-white group-hover:text-gold-accent"
                        )}>
                          سورة {surah.name}
                        </h4>
                        <p className="text-[10px] text-white/30 font-bold mt-0.5">
                          {surah.makkia === 1 ? 'مكية' : 'مدنية'} • صفحة البدء {surah.start_page}
                        </p>
                      </div>
                    </div>

                    {/* Actions (Play & Download/Offline States) */}
                    <div className="flex items-center gap-4 relative z-20">
                      {/* Offline Cache state indicators */}
                      <div className="flex items-center gap-2">
                        {downloadProgress?.isDownloading ? (
                          <div className="flex flex-col items-center justify-center min-w-[70px]">
                            <div className="flex items-center gap-1 text-[10px] text-gold-accent font-black animate-pulse">
                              <Loader2 size={12} className="animate-spin text-gold-accent" />
                              <span>{downloadProgress.progress}%</span>
                            </div>
                            <span className="text-[8px] text-white/30 font-bold mt-0.5">
                              {OfflineAudioService.formatSize(downloadProgress.loaded)}
                            </span>
                          </div>
                        ) : isDownloaded ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                              <Check size={10} strokeWidth={3} />
                              <span>محملة</span>
                            </span>
                            <button
                              onClick={(e) => handleDeleteDownload(surah.id, e)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 text-white/20 transition-all cursor-pointer"
                              title="حذف السورة من الجهاز"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleDownloadSurah(surah, e)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-gold-accent hover:text-emerald-950 text-white/30 transition-all cursor-pointer"
                            title="تحميل السورة للتشغيل أوفلاين"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </div>

                      {/* Play Button State */}
                      <div>
                        {isCurrent ? (
                          audioPlayer.isPlaying ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-accent/20 rounded-full text-gold-accent text-[9px] font-black">
                              <span className="w-2 h-2 rounded-full bg-gold-accent animate-ping" />
                              <span>جاري التشغيل</span>
                            </div>
                          ) : (
                            <div className="text-white/40 group-hover:text-gold-accent">
                              <Play size={18} fill="currentColor" />
                            </div>
                          )
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-gold-accent group-hover:text-emerald-950 transition-all">
                            <Play size={12} fill="currentColor" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Global Audio Player Controller Sheet */}
      <AnimatePresence>
        {audioPlayer.audioUrl && (
          <motion.div 
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            className="fixed bottom-[96px] left-4 right-4 max-w-sm mx-auto z-40"
          >
            <div className="bg-emerald-950/95 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gold-accent/5 pointer-events-none" />
              
              {/* Spinning/pulsating Disc & Reciter header */}
              <div className="flex items-center gap-4 mb-4">
                <motion.div 
                  animate={audioPlayer.isPlaying ? { rotate: 360 } : {}}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className={cn(
                    "w-12 h-12 rounded-full bg-gradient-to-br from-gold-bright to-gold-accent flex items-center justify-center text-emerald-950 shadow-lg shrink-0 border-2 border-emerald-900",
                    audioPlayer.isBuffering ? "animate-pulse" : ""
                  )}
                >
                  <Disc size={20} />
                </motion.div>

                <div className="text-right flex-1 min-w-0">
                  <span className="text-[8px] font-black tracking-widest text-gold-accent uppercase">
                    {audioPlayer.currentMoshafName?.replace("المصحف المرتل - ", "") || "رواية حفص عن عاصم"}
                  </span>
                  <h5 className="text-white font-extrabold text-sm truncate leading-snug">
                    سورة {audioPlayer.currentSurah?.name || `رقم ${audioPlayer.currentSurahNumber}`}
                  </h5>
                  <p className="text-[10px] text-white/50 truncate font-bold">
                    {audioPlayer.currentReciterName || "قارئ غير معروف"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => audioPlayer.stop()}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-rose-500 transition-all outline-none cursor-pointer"
                    title="إيقاف"
                  >
                    <Square size={12} fill="currentColor" />
                  </button>
                </div>
              </div>

              {/* Error Alert Bar */}
              {audioPlayer.error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold p-2.5 rounded-xl text-center mb-3 leading-relaxed">
                  {audioPlayer.error}
                </div>
              )}

              {/* Progress Slider Bar */}
              <div className="space-y-1">
                <input 
                  type="range"
                  min="0"
                  max={audioPlayer.duration || 100}
                  value={audioPlayer.currentTime || 0}
                  onChange={(e) => audioPlayer.seek(parseFloat(e.target.value))}
                  className="w-full accent-gold-accent bg-white/15 h-1 rounded-lg cursor-pointer transition-all"
                />
                
                <div className="flex justify-between items-center text-[9px] font-bold text-white/40">
                  <span>{formatTime(audioPlayer.currentTime)}</span>
                  {audioPlayer.isBuffering ? (
                    <span className="text-gold-accent animate-pulse">جاري التخزين المؤقت...</span>
                  ) : (
                    <span>القارئ التالي آلياً</span>
                  )}
                  <span>{formatTime(audioPlayer.duration)}</span>
                </div>
              </div>

              {/* Play / pause buttons bar */}
              <div className="flex justify-center items-center gap-6 mt-4">
                <button
                  onClick={() => audioPlayer.togglePlay()}
                  className="w-12 h-12 bg-white text-emerald-950 hover:bg-gold-accent hover:text-emerald-950 transition-all rounded-full flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
                >
                  {audioPlayer.isPlaying ? (
                    <Pause size={20} fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Play size={20} fill="currentColor" strokeWidth={0} className="translate-x-[1px]" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-28 left-4 right-4 max-w-sm mx-auto z-[100] bg-emerald-950/95 border border-gold-accent/40 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-center justify-center"
          >
            <div className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-gold-accent shrink-0">
              <AlertTriangle size={14} />
            </div>
            <p className="text-xs font-bold text-white tracking-wide">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
