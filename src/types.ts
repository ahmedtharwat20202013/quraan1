export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  startPage?: number;
  pdfUrl?: string;
}

export interface Dua {
  id: string;
  category: 'Morning' | 'Evening' | 'Sleep' | 'General';
  title: string;
  arabic: string;
  translation: string;
  audioUrl?: string;
}

export interface Bookmark {
  surahNumber: number;
  pageNumber: number;
  timestamp: number;
}

export interface DailyVerse {
  surahName: string;
  text: string;
  reference: string;
}



export interface Moshaf {
  id: number;
  name: string;
  server: string;
  surah_list: string;
}

export interface Reciter {
  id: number;
  name: string;
  letter: string;
  moshaf: Moshaf[];
}

export interface APISurah {
  id: number;
  name: string;
  start_page: number;
  end_page: number;
  makkia: number; // 1 for Meccan, 0 for Medinan
  type: number;
}

export interface AppState {
  lastRead: Bookmark | null;
  bookmarks: Bookmark[];
  favorites: string[]; // Dua IDs
  darkMode: boolean;
  fontSize: number;
  dailyVerse?: DailyVerse;
}
