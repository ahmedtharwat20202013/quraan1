import { APISurah } from '../types';
import { OfflineAudioService } from './offlineAudio';

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  currentSurah: APISurah | null;
  currentSurahNumber: number | null; // fallback surah number
  currentReciterName: string | null;
  currentMoshafName: string | null;
  audioUrl: string | null;
  playbackRate: number;
  error: string | null;
}

type AudioListener = (state: AudioPlayerState) => void;

class AudioPlayerServiceImpl {
  private audio: HTMLAudioElement | null = null;
  private listeners: Set<AudioListener> = new Set();
  private updateInterval: any = null;
  private playPromise: Promise<void> | null = null;
  private activeBlobUrl: string | null = null;
  
  // List of all suwar context for auto-advancing
  private suwarList: APISurah[] = [];
  
  private state: AudioPlayerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isBuffering: false,
    currentSurah: null,
    currentSurahNumber: null,
    currentReciterName: null,
    currentMoshafName: null,
    audioUrl: null,
    playbackRate: 1.0,
    error: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.setupAudioListeners();
    }
  }

  private setupAudioListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.state.isBuffering = false;
      this.notifyListeners();
      this.startProgressTimer();
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.notifyListeners();
      this.stopProgressTimer();
    });

    this.audio.addEventListener('waiting', () => {
      this.state.isBuffering = true;
      this.notifyListeners();
    });

    this.audio.addEventListener('playing', () => {
      this.state.isBuffering = false;
      this.state.isPlaying = true;
      this.notifyListeners();
    });

    this.audio.addEventListener('durationchange', () => {
      if (this.audio) {
        this.state.duration = this.audio.duration || 0;
        this.notifyListeners();
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.state.currentTime = this.audio.currentTime || 0;
        // Don't flood notification on every ms, but keep it updated
      }
    });

    this.audio.addEventListener('ended', () => {
      this.state.isPlaying = false;
      this.state.currentTime = 0;
      this.notifyListeners();
      this.stopProgressTimer();
      this.handleAudioEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio element error:', e);
      let errorMsg = 'تعذر تشغيل هذه السورة من المصدر.';
      if (this.audio && this.audio.error) {
        if (this.audio.error.code === 4) {
          errorMsg = 'فشل تشغيل الملف أو الرابط غير مدعوم أو غير متاح حالياً لدى القارئ.';
        } else {
          errorMsg = `فشل تشغيل الصوت (رمز الخطأ: ${this.audio.error.code})`;
        }
      }
      this.state.error = errorMsg;
      this.state.isPlaying = false;
      this.state.isBuffering = false;
      this.notifyListeners();
      this.stopProgressTimer();
    });
  }

  // Set the playlist for auto-advancement
  setSuwarList(suwar: APISurah[]) {
    this.suwarList = suwar;
  }

  getState(): AudioPlayerState {
    return { ...this.state };
  }

  subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    // Initial emission
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }

  private startProgressTimer() {
    this.stopProgressTimer();
    this.updateInterval = setInterval(() => {
      if (this.audio) {
        const timeNow = this.audio.currentTime || 0;
        // Notify listeners if time changed significantly
        if (Math.abs(this.state.currentTime - timeNow) > 0.2) {
          this.state.currentTime = timeNow;
          this.notifyListeners();
        }
      }
    }, 250);
  }

  private stopProgressTimer() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async playSurah(
    surah: APISurah | number,
    serverUrl: string,
    reciterName: string,
    moshafName: string
  ) {
    if (!this.audio) return;

    this.stop();

    let surahObj: APISurah | null = null;
    let surahNum = 1;

    if (typeof surah === 'number') {
      surahNum = surah;
      surahObj = this.suwarList.find((s) => s.id === surah) || null;
    } else {
      surahObj = surah;
      surahNum = surah.id;
    }

    // ServerUrl could be like "https://server10.mp3quran.net/bkr/"
    // Ensure it ends with / and is secure (HTTPS)
    let secureServerUrl = serverUrl;
    if (secureServerUrl.startsWith('http://')) {
      secureServerUrl = secureServerUrl.replace('http://', 'https://');
    }
    const baseUrl = secureServerUrl.endsWith('/') ? secureServerUrl : `${secureServerUrl}/`;
    
    // Surah number must be heavily zero-padded to 3 characters, e.g., "001" or "015" or "114"
    const paddedNum = String(surahNum).padStart(3, '0');
    const finalUrl = `${baseUrl}${paddedNum}.mp3`;

    this.state = {
      ...this.state,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isBuffering: true,
      currentSurah: surahObj,
      currentSurahNumber: surahNum,
      currentReciterName: reciterName,
      currentMoshafName: moshafName,
      audioUrl: finalUrl,
      error: null,
    };

    this.notifyListeners();

    // Check if cached synchronously using in-memory Set
    const isCached = OfflineAudioService.isDownloaded(finalUrl);

    if (!isCached) {
      // PLAY IMMEDIATELY & SYNCHRONOUSLY to preserve the user gesture (especially for iOS Safari)
      try {
        this.audio.src = finalUrl;
        this.audio.playbackRate = this.state.playbackRate;
        this.audio.load();
        const p = this.audio.play();
        if (p !== undefined) {
          this.playPromise = p;
          await p;
        }
      } catch (err: any) {
        if (err && err.name !== 'AbortError') {
          console.error('Playing remote audio failed:', err);
          this.state.error = 'فشل تشغيل السورة من خادم الصوت المباشر. يرجى التحقق من اتصالك بالإنترنت.';
        }
        this.state.isBuffering = false;
        this.state.isPlaying = false;
        this.notifyListeners();
      }
      return;
    }

    // If cached, retrieve from IndexedDB asynchronously
    try {
      const playUrl = await OfflineAudioService.getAudioUrl(finalUrl);
      if (playUrl.startsWith('blob:')) {
        this.activeBlobUrl = playUrl;
      }
      
      this.audio.src = playUrl;
      this.audio.playbackRate = this.state.playbackRate;
      this.audio.load();
      const p = this.audio.play();
      if (p !== undefined) {
        this.playPromise = p;
        await p;
      }
    } catch (err: any) {
      if (err && err.name !== 'AbortError') {
        console.error('Playing cached audio failed:', err);
        this.state.error = 'فشل تشغيل السورة المحملة. قد يكون الملف تالفاً، جرب حذفه وإعادة تحميله.';
      }
      this.state.isBuffering = false;
      this.state.isPlaying = false;
      this.notifyListeners();
    }
  }

  togglePlay() {
    if (!this.audio || !this.state.audioUrl) return;

    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  pause() {
    if (this.audio) {
      try {
        this.audio.pause();
      } catch (e) {}
    }
  }

  play() {
    if (this.audio && this.state.audioUrl && !this.state.isPlaying) {
      try {
        const p = this.audio.play();
        if (p !== undefined) {
          this.playPromise = p;
          p.catch((err: any) => {
            if (err && err.name !== 'AbortError') {
              console.error('Playing audio failed:', err);
            }
          });
        }
      } catch (err) {
        console.error('Play trigger failed:', err);
      }
    }
  }

  stop() {
    if (!this.audio) return;
    try {
      this.audio.pause();
    } catch (e) {}

    // Revoke object URL to prevent memory leaks
    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }

    try {
      this.audio.removeAttribute('src');
      this.audio.load();
    } catch (e) {}

    this.playPromise = null;
    this.state = {
      ...this.state,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isBuffering: false,
      currentSurah: null,
      currentSurahNumber: null,
      audioUrl: null,
    };
    this.notifyListeners();
    this.stopProgressTimer();
  }

  seek(seconds: number) {
    if (!this.audio) return;
    this.audio.currentTime = seconds;
    this.state.currentTime = seconds;
    this.notifyListeners();
  }

  setSpeed(rate: number) {
    this.state.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
    this.notifyListeners();
  }

  private handleAudioEnded() {
    // Standard Auto-Play Next Surah!
    const currentNum = this.state.currentSurahNumber;
    if (currentNum && currentNum < 114) {
      const nextSurahNum = currentNum + 1;
      
      // Let's seek if the current reciter can read this surah (if we have suwarList or moshaf server)
      // Check if we have the active server URL
      const currentUrl = this.state.audioUrl;
      if (currentUrl) {
        // e.g. "https://server10.mp3quran.net/bkr/001.mp3" -> remove the "001.mp3" part
        const parts = currentUrl.split('/');
        parts.pop(); // remove 001.mp3
        const serverPath = parts.join('/') + '/';
        
        console.log(`Auto-advancing to next surah ${nextSurahNum}...`);
        
        // Find if next surah is in our list
        const nextSurah = this.suwarList.find(s => s.id === nextSurahNum);
        
        this.playSurah(
          nextSurah || nextSurahNum,
          serverPath,
          this.state.currentReciterName || 'القارئ',
          this.state.currentMoshafName || 'رواية حفص عن عاصم'
        ).catch(console.error);
      }
    }
  }
}

export const AudioPlayerService = new AudioPlayerServiceImpl();
export default AudioPlayerService;
