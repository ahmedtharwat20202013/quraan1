export interface JsonAya {
  index: number;
  text: string;
}

export interface JsonSurah {
  index: number;
  name: string;
  ayas: JsonAya[];
}

export interface QuranJsonData {
  quran: JsonSurah[];
}

export interface RawPageSurahSection {
  id: number;
  name: string;
  fromAyah: number;
  toAyah: number;
  startsHere: boolean;
  endsHere: boolean;
}

export interface RawQuranPageV3 {
  page: number;
  surahs: RawPageSurahSection[];
}

export interface QuranPagesV3Data {
  pages: RawQuranPageV3[];
}

export interface ProcessedAyah {
  index: number;
  text: string;
}

export interface ProcessedSurahSection {
  id: number;
  name: string;
  fromAyah: number;
  toAyah: number;
  startsHere: boolean;
  endsHere: boolean;
  ayas: ProcessedAyah[];
}

export interface ProcessedPageData {
  pageNumber: number;
  sections: ProcessedSurahSection[];
  primarySurahId: number;
  primarySurahName: string;
}

let cachedQuranData: JsonSurah[] | null = null;
let fetchQuranPromise: Promise<JsonSurah[]> | null = null;

let cachedPagesV3Data: RawQuranPageV3[] | null = null;
let fetchPagesV3Promise: Promise<RawQuranPageV3[]> | null = null;

// Pre-computed surah start pages mapping (1..114 -> pageNumber)
const surahStartPagesMap: Record<number, number> = {};
const processedPageCache = new Map<number, ProcessedPageData>();

export class QuranDataLoader {
  /**
   * Fetches and parses public/quran.json with memory caching.
   */
  static async getQuranData(): Promise<JsonSurah[]> {
    if (cachedQuranData) return cachedQuranData;
    if (fetchQuranPromise) return fetchQuranPromise;

    // Check localStorage cache first for instant offline startup
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('quran_json_cache_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedQuranData = parsed;
            return parsed;
          }
        }
      }
    } catch {}

    fetchQuranPromise = (async () => {
      try {
        const fetchUrl = typeof window !== 'undefined'
          ? new URL('/quran.json', window.location.origin).toString()
          : '/quran.json';

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status} when loading quran.json`);

        const rawData: QuranJsonData = await response.json();
        if (!rawData || !Array.isArray(rawData.quran) || rawData.quran.length === 0) {
          throw new Error('Invalid or empty quran.json structure');
        }

        const validSurahs = rawData.quran.map(surah => ({
          index: Number(surah.index),
          name: String(surah.name || '').trim(),
          ayas: (surah.ayas || []).map(aya => ({
            index: Number(aya.index),
            text: String(aya.text || '').trim()
          }))
        }));

        cachedQuranData = validSurahs;
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('quran_json_cache_v1', JSON.stringify(validSurahs));
          }
        } catch {}

        return validSurahs;
      } catch (err) {
        console.error('QuranDataLoader getQuranData error:', err);
        fetchQuranPromise = null;
        if (cachedQuranData) return cachedQuranData;
        throw err;
      }
    })();

    return fetchQuranPromise;
  }

  /**
   * Fetches and parses public/quran_pages_v3.json as the Single Source of Truth for 604 Mushaf pages.
   */
  static async getPagesV3Data(): Promise<RawQuranPageV3[]> {
    if (cachedPagesV3Data) return cachedPagesV3Data;
    if (fetchPagesV3Promise) return fetchPagesV3Promise;

    // Check localStorage cache first
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('quran_pages_v3_cache_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedPagesV3Data = parsed;
            parsed.forEach((p: RawQuranPageV3) => {
              p.surahs.forEach((s: RawPageSurahSection) => {
                if (s.startsHere) {
                  surahStartPagesMap[s.id] = p.page;
                } else if (surahStartPagesMap[s.id] === undefined) {
                  surahStartPagesMap[s.id] = p.page;
                }
              });
            });
            return parsed;
          }
        }
      }
    } catch {}

    fetchPagesV3Promise = (async () => {
      try {
        const fetchUrl = typeof window !== 'undefined'
          ? new URL('/quran_pages_v3.json', window.location.origin).toString()
          : '/quran_pages_v3.json';

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status} when loading quran_pages_v3.json`);

        const rawData: QuranPagesV3Data = await response.json();
        if (!rawData || !Array.isArray(rawData.pages) || rawData.pages.length === 0) {
          throw new Error('Invalid or empty quran_pages_v3.json structure');
        }

        cachedPagesV3Data = rawData.pages;

        // Build surahStartPagesMap strictly assigning the exact page where startsHere === true
        rawData.pages.forEach(p => {
          p.surahs.forEach(s => {
            if (s.startsHere) {
              surahStartPagesMap[s.id] = p.page;
            } else if (surahStartPagesMap[s.id] === undefined) {
              surahStartPagesMap[s.id] = p.page;
            }
          });
        });

        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('quran_pages_v3_cache_v1', JSON.stringify(rawData.pages));
          }
        } catch {}

        return rawData.pages;
      } catch (err) {
        console.error('QuranDataLoader getPagesV3Data error:', err);
        fetchPagesV3Promise = null;
        if (cachedPagesV3Data) return cachedPagesV3Data;
        throw err;
      }
    })();

    return fetchPagesV3Promise;
  }

  /**
   * Gets full processed page data for a page number (1..604) from quran_pages_v3.json + quran.json
   * Utilizes in-memory processedPageCache for 0ms instant page turns.
   */
  static async getMushafPage(pageNumber: number): Promise<ProcessedPageData | null> {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const targetPageNum = Math.max(1, Math.min(604, pageNumber));

    // 1. Memory Cache Hit (0ms)
    if (processedPageCache.has(targetPageNum)) {
      const cached = processedPageCache.get(targetPageNum)!;
      if (t0 > 0) {
        const t1 = performance.now();
        console.debug('[Mushaf performance]', {
          page: targetPageNum,
          source: 'memory-cache',
          durationMs: Math.round((t1 - t0) * 100) / 100
        });
      }
      return cached;
    }

    // 2. Build ProcessedPageData from raw JSON
    const pages = await this.getPagesV3Data();
    const quranData = await this.getQuranData();

    const pageRaw = pages.find(p => p.page === targetPageNum);
    if (!pageRaw) return null;

    const sections: ProcessedSurahSection[] = pageRaw.surahs.map(section => {
      const surahData = quranData.find(s => s.index === section.id);
      const allAyas = surahData ? surahData.ayas : [];
      const sectionAyas = allAyas.filter(a => a.index >= section.fromAyah && a.index <= section.toAyah);

      return {
        id: section.id,
        name: section.name || (surahData ? surahData.name : ''),
        fromAyah: section.fromAyah,
        toAyah: section.toAyah,
        startsHere: section.startsHere,
        endsHere: section.endsHere,
        ayas: sectionAyas
      };
    });

    const primarySection = sections[0];
    const pageDataResult: ProcessedPageData = {
      pageNumber: targetPageNum,
      sections,
      primarySurahId: primarySection ? primarySection.id : 1,
      primarySurahName: primarySection ? primarySection.name : 'الفاتحة'
    };

    processedPageCache.set(targetPageNum, pageDataResult);

    if (t0 > 0) {
      const t1 = performance.now();
      console.debug('[Mushaf performance]', {
        page: targetPageNum,
        source: 'json-build',
        durationMs: Math.round((t1 - t0) * 100) / 100
      });
    }

    return pageDataResult;
  }

  /**
   * Gets the start page number (1..604) in the Mushaf for a given surahId (1..114).
   */
  static async getPageForSurah(surahId: number): Promise<number> {
    const pages = await this.getPagesV3Data();
    // Check map or find in pages
    if (surahStartPagesMap[surahId]) return surahStartPagesMap[surahId];

    const foundPage = pages.find(p => p.surahs.some(s => s.id === surahId && s.startsHere))
      || pages.find(p => p.surahs.some(s => s.id === surahId));

    return foundPage ? foundPage.page : 1;
  }

  /**
   * Gets the page number (1..604) in the Mushaf for a given surahId and ayaIndex.
   */
  static async getPageForAyah(surahId: number, ayaIndex: number): Promise<number> {
    const pages = await this.getPagesV3Data();
    const foundPage = pages.find(p => 
      p.surahs.some(s => s.id === surahId && ayaIndex >= s.fromAyah && ayaIndex <= s.toAyah)
    );
    if (foundPage) return foundPage.page;
    return this.getPageForSurah(surahId);
  }

  /**
   * Synchronously gets surah start page if pre-cached, otherwise returns fallback.
   */
  static getCachedSurahStartPage(surahId: number): number {
    return surahStartPagesMap[surahId] || 1;
  }

  /**
   * Gets the start and end page bounds (1..604) in the Mushaf for a given surahId (1..114).
   */
  static async getSurahBounds(surahId: number): Promise<{ startPage: number; endPage: number }> {
    const pages = await this.getPagesV3Data();
    const surahPages = pages.filter(p => p.surahs.some(s => s.id === surahId));
    if (surahPages.length > 0) {
      const startPage = surahPages[0].page;
      const endPage = surahPages[surahPages.length - 1].page;
      return { startPage, endPage };
    }
    return { startPage: 1, endPage: 604 };
  }

  /**
   * Gets a specific surah by index (1..114).
   */
  static async getSurah(surahId: number): Promise<JsonSurah | null> {
    const data = await this.getQuranData();
    return data.find(s => s.index === surahId) || null;
  }
}
