import { JsonSurah, QuranDataLoader } from './quranDataLoader';

export interface IndexedAyah {
  surahId: number;
  surahName: string;
  ayaIndex: number;
  text: string;
  normalizedText: string;
}

export interface SearchResult {
  surahId: number;
  surahName: string;
  ayaIndex: number;
  wordIndexInAyah: number; // 0-indexed position of matched word within Ayah
  text: string;
  beforeText: string;
  matchedText: string;
  afterText: string;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
}

/**
 * Normalizes Arabic text by stripping diacritics, unifying Alifs, Ya/Alef Maqsoora, Ta Marbouta, Tatweel, and punctuation.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Remove diacritics and Quranic marks
    .replace(/[\u064B-\u0652\u0670\u0653\u0654\u0655\u06D6-\u06ED\u0610-\u061A]/g, '')
    // Remove Tatweel (ـ)
    .replace(/\u0640/g, '')
    // Normalize Alifs (أ إ آ ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Ya and Alef Maqsoora (ى -> ي)
    .replace(/ى/g, 'ي')
    // Normalize Ta Marbouta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Remove punctuation & brackets
    .replace(/[﴿﴾()[\]{}.,\/#!$%\^&\*;:{}=\-_`~"']/g, '')
    // Normalize multiple spaces into single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a clean, word-boundary safe contextual snippet around matched word.
 */
function createSnippet(text: string, query: string): {
  wordIndexInAyah: number;
  beforeText: string;
  matchedText: string;
  afterText: string;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
} {
  const rawWords = text.split(/\s+/).filter(w => w.length > 0);
  const normWords = rawWords.map(w => normalizeArabicText(w));
  const normQuery = normalizeArabicText(query);

  let matchedWordIdx = -1;

  // 1. Exact or partial word match
  for (let i = 0; i < normWords.length; i++) {
    if (normWords[i].includes(normQuery)) {
      matchedWordIdx = i;
      break;
    }
  }

  // 2. Multi-word phrase match
  if (matchedWordIdx === -1) {
    const queryTokens = normQuery.split(' ');
    for (let i = 0; i <= normWords.length - queryTokens.length; i++) {
      const phrase = normWords.slice(i, i + queryTokens.length).join(' ');
      if (phrase.includes(normQuery)) {
        matchedWordIdx = i;
        break;
      }
    }
  }

  if (matchedWordIdx === -1) matchedWordIdx = 0;

  // Take 3-5 full words before and after
  const startIdx = Math.max(0, matchedWordIdx - 4);
  const endIdx = Math.min(rawWords.length - 1, matchedWordIdx + 4);

  return {
    wordIndexInAyah: matchedWordIdx,
    beforeText: rawWords.slice(startIdx, matchedWordIdx).join(' '),
    matchedText: rawWords[matchedWordIdx] || '',
    afterText: rawWords.slice(matchedWordIdx + 1, endIdx + 1).join(' '),
    hasMoreBefore: startIdx > 0,
    hasMoreAfter: endIdx < rawWords.length - 1
  };
}

let searchIndex: IndexedAyah[] | null = null;
let indexingPromise: Promise<IndexedAyah[]> | null = null;

export class QuranSearchService {
  /**
   * Initializes the search index ONCE in memory.
   */
  static async initIndex(): Promise<IndexedAyah[]> {
    if (searchIndex) return searchIndex;
    if (indexingPromise) return indexingPromise;

    indexingPromise = (async () => {
      try {
        const surahs = await QuranDataLoader.getQuranData();
        const index: IndexedAyah[] = [];

        surahs.forEach(surah => {
          surah.ayas.forEach(aya => {
            let text = aya.text;
            if (surah.index !== 1 && surah.index !== 9 && aya.index === 1) {
              text = text.replace(/^بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ\s*/, '');
            }

            index.push({
              surahId: surah.index,
              surahName: surah.name,
              ayaIndex: aya.index,
              text: text,
              normalizedText: normalizeArabicText(text)
            });
          });
        });

        searchIndex = index;
        return index;
      } catch (err) {
        console.error('QuranSearchService indexing failed:', err);
        indexingPromise = null;
        return [];
      }
    })();

    return indexingPromise;
  }

  /**
   * Searches ONLY within a specific Surah (In-Surah Search).
   */
  static async searchInSurah(surahId: number, query: string): Promise<SearchResult[]> {
    const normalizedQuery = normalizeArabicText(query);
    if (!normalizedQuery || normalizedQuery.length < 2) return [];

    const index = await this.initIndex();
    const surahAyahs = index.filter(item => item.surahId === surahId);
    const results: SearchResult[] = [];

    for (const aya of surahAyahs) {
      if (aya.normalizedText.includes(normalizedQuery)) {
        const snippet = createSnippet(aya.text, query);
        results.push({
          surahId: aya.surahId,
          surahName: aya.surahName,
          ayaIndex: aya.ayaIndex,
          wordIndexInAyah: snippet.wordIndexInAyah,
          text: aya.text,
          beforeText: snippet.beforeText,
          matchedText: snippet.matchedText,
          afterText: snippet.afterText,
          hasMoreBefore: snippet.hasMoreBefore,
          hasMoreAfter: snippet.hasMoreAfter
        });
      }
    }

    return results;
  }

  /**
   * Searches globally across all Surah Names AND all 6,236 Ayahs.
   */
  static async searchGlobal(query: string, limit: number = 40): Promise<{
    surahMatches: { id: number; name: string }[];
    ayahMatches: SearchResult[];
  }> {
    const normalizedQuery = normalizeArabicText(query);
    if (!normalizedQuery) return { surahMatches: [], ayahMatches: [] };

    const index = await this.initIndex();

    // 1. Search Surah Names
    const surahMatches: { id: number; name: string }[] = [];
    const seenSurahIds = new Set<number>();

    index.forEach(item => {
      if (!seenSurahIds.has(item.surahId)) {
        const normName = normalizeArabicText(item.surahName);
        if (normName.includes(normalizedQuery)) {
          seenSurahIds.add(item.surahId);
          surahMatches.push({ id: item.surahId, name: item.surahName });
        }
      }
    });

    // 2. Search Ayahs
    const ayahMatches: SearchResult[] = [];
    if (normalizedQuery.length >= 2) {
      for (const item of index) {
        if (item.normalizedText.includes(normalizedQuery)) {
          const snippet = createSnippet(item.text, query);
          ayahMatches.push({
            surahId: item.surahId,
            surahName: item.surahName,
            ayaIndex: item.ayaIndex,
            wordIndexInAyah: snippet.wordIndexInAyah,
            text: item.text,
            beforeText: snippet.beforeText,
            matchedText: snippet.matchedText,
            afterText: snippet.afterText,
            hasMoreBefore: snippet.hasMoreBefore,
            hasMoreAfter: snippet.hasMoreAfter
          });

          if (ayahMatches.length >= limit) break;
        }
      }
    }

    return { surahMatches, ayahMatches };
  }
}
