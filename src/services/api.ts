import { z } from 'zod';
import { Reciter, APISurah } from '../types';
import { SURAHS } from '../constants';

// Define Zod Schemas for Runtime Validation
const MoshafSchema = z.object({
  id: z.number(),
  name: z.string(),
  server: z.string(),
  surah_list: z.string()
});

const ReciterSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(val => Number(val)),
  name: z.string(),
  letter: z.string(),
  moshaf: z.array(MoshafSchema)
});

const RecitersResponseSchema = z.object({
  reciters: z.array(ReciterSchema)
});

const APISurahSchema = z.object({
  id: z.number(),
  name: z.string(),
  start_page: z.number(),
  end_page: z.number(),
  makkia: z.number(),
  type: z.number()
});

const SuwarResponseSchema = z.object({
  suwar: z.array(APISurahSchema)
});

const RECITERS_CACHE_KEY = 'quran_reciters_cache_v2';
const SUWAR_CACHE_KEY = 'quran_suwar_cache_v2';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Static fallback popular reciters when completely offline and no cache is present
const POPULAR_RECITERS: Reciter[] = [
  {
    id: 54,
    name: "محمود خليل الحصري",
    letter: "م",
    moshaf: [
      { id: 104, name: "حفص عن عاصم", server: "https://server13.mp3quran.net/husr/", surah_list: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114" }
    ]
  },
  {
    id: 11,
    name: "عبد الباسط عبد الصمد",
    letter: "ع",
    moshaf: [
      { id: 3, name: "حفص عن عاصم - مرتل", server: "https://server7.mp3quran.net/basit/", surah_list: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114" }
    ]
  },
  {
    id: 88,
    name: "مشاري بن راشد العفاسي",
    letter: "م",
    moshaf: [
      { id: 181, name: "حفص عن عاصم", server: "https://server8.mp3quran.net/afs/", surah_list: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114" }
    ]
  },
  {
    id: 97,
    name: "ماهر المعيقلي",
    letter: "م",
    moshaf: [
      { id: 201, name: "حفص عن عاصم", server: "https://server12.mp3quran.net/maher/", surah_list: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114" }
    ]
  },
  {
    id: 33,
    name: "سعد الغامدي",
    letter: "س",
    moshaf: [
      { id: 54, name: "حفص عن عاصم", server: "https://server7.mp3quran.net/s_gmd/", surah_list: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114" }
    ]
  },
  {
    id: 57,
    name: "عبد الرحمن السديس",
    letter: "ع",
    moshaf: [
      { id: 111, name: "حفص عن عاصم", server: "https://server11.mp3quran.net/sds/", surah_list: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114" }
    ]
  }
];

function compressReciters(reciters: Reciter[]): any[] {
  return reciters.map(r => [
    r.id,
    r.name,
    r.letter,
    r.moshaf.map(m => [
      m.id,
      m.name,
      m.server,
      m.surah_list
    ])
  ]);
}

function decompressReciters(data: any[]): Reciter[] {
  return data.map(item => ({
    id: item[0],
    name: item[1],
    letter: item[2],
    moshaf: item[3].map((m: any) => ({
      id: m[0],
      name: m[1],
      server: m[2],
      surah_list: m[3]
    }))
  }));
}

// Safely gets cache with try-catch & validation
function safeGetCache<T>(key: string): { data: T; timestamp: number } | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    
    // Check structure
    if (!parsed || !parsed.data) {
      return null;
    }
    
    // Check expiry
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
      return null;
    }
    
    // Decompress if needed
    if (key === RECITERS_CACHE_KEY && Array.isArray(parsed.data) && parsed.data.length > 0 && Array.isArray(parsed.data[0])) {
      parsed.data = decompressReciters(parsed.data);
    }
    
    return parsed;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
    return null;
  }
}

export class QuranApiService {
  /**
   * Fetches the audited list of reciters from the MP3 Quran API
   */
  static async getReciters(options?: { signal?: AbortSignal }): Promise<Reciter[]> {
    // If completely offline, return cached reciters instantly (even if expired) or POPULAR_RECITERS
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const fallback = localStorage.getItem(RECITERS_CACHE_KEY);
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (Array.isArray(parsed.data) && parsed.data.length > 0 && Array.isArray(parsed.data[0])) {
            return decompressReciters(parsed.data);
          }
          return parsed.data;
        }
      } catch {}
      return POPULAR_RECITERS;
    }

    // Try localStorage cache first
    const cached = safeGetCache<Reciter[]>(RECITERS_CACHE_KEY);
    if (cached) {
      return cached.data;
    }

    try {
      const response = await fetch('https://www.mp3quran.net/api/v3/reciters?language=ar', {
        signal: options?.signal
      });
      if (!response.ok) {
        throw new Error('فشل جلب قائمة القراء من السيرفر');
      }
      
      const rawData = await response.json();
      
      // Validate schema in runtime via Zod
      const parsed = RecitersResponseSchema.parse(rawData);
      const reciters: Reciter[] = parsed.reciters as unknown as Reciter[];
      
      // Filter out unused payload properties to save memory and RAM
      const cleanedReciters: Reciter[] = reciters.map(r => ({
        id: r.id,
        name: r.name,
        letter: r.letter,
        moshaf: r.moshaf.map(m => ({
          id: m.id,
          name: m.name,
          server: m.server,
          surah_list: m.surah_list
        }))
      }));

      // Save valid compressed data to cache
      try {
        localStorage.setItem(RECITERS_CACHE_KEY, JSON.stringify({
          data: compressReciters(cleanedReciters),
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Error saving reciters to cache', e);
      }

      return cleanedReciters;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error('getReciters error:', error);
      
      // Fallback to expired cache if available or clean return
      try {
        const fallback = localStorage.getItem(RECITERS_CACHE_KEY);
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (Array.isArray(parsed.data) && parsed.data.length > 0 && Array.isArray(parsed.data[0])) {
            return decompressReciters(parsed.data);
          }
          return parsed.data;
        }
      } catch {}
      return POPULAR_RECITERS;
    }
  }

  /**
   * Fetches the 114 suwar details from the MP3 Quran API
   */
  static async getSuwar(options?: { signal?: AbortSignal }): Promise<APISurah[]> {
    const getLocalFallbackSuwar = (): APISurah[] => {
      return SURAHS.map((s, idx) => {
        const nextSurah = SURAHS[idx + 1];
        const endPage = nextSurah ? nextSurah.startPage - 1 : 604;
        return {
          id: s.number,
          name: s.name,
          start_page: s.startPage,
          end_page: endPage,
          makkia: s.revelationType === 'مكية' ? 1 : 0,
          type: 0
        };
      });
    };

    // If completely offline, return cached suwar instantly (even if expired) or local fallback suwar
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const fallback = localStorage.getItem(SUWAR_CACHE_KEY);
        if (fallback) {
          return JSON.parse(fallback).data;
        }
      } catch {}
      return getLocalFallbackSuwar();
    }

    // Try localStorage cache first
    const cached = safeGetCache<APISurah[]>(SUWAR_CACHE_KEY);
    if (cached) {
      return cached.data;
    }

    try {
      const response = await fetch('https://www.mp3quran.net/api/v3/suwar?language=ar', {
        signal: options?.signal
      });
      if (!response.ok) {
        throw new Error('فشل جلب قائمة السور من السيرفر');
      }
      
      const rawData = await response.json();
      
      // Validate schema in runtime via Zod
      const parsed = SuwarResponseSchema.parse(rawData);
      const suwar: APISurah[] = parsed.suwar;
      
      // Save valid data to cache
      try {
        localStorage.setItem(SUWAR_CACHE_KEY, JSON.stringify({
          data: suwar,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Error saving suwar to cache', e);
      }

      return suwar;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error('getSuwar error:', error);
      
      // Fallback to expired cache if available
      try {
        const fallback = localStorage.getItem(SUWAR_CACHE_KEY);
        if (fallback) {
          return JSON.parse(fallback).data;
        }
      } catch {}
      return getLocalFallbackSuwar();
    }
  }
}
