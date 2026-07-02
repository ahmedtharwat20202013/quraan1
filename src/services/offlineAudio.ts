import { APISurah } from '../types';

export interface DownloadProgress {
  url: string;
  progress: number;
  loaded: number;
  total: number;
  isDownloading: boolean;
  error?: string;
}

export interface OfflineMetadata {
  url: string;
  surahId: number;
  surahName: string;
  reciterName: string;
  moshafName: string;
  size: number;
  addedAt: number;
}

export interface OfflineCacheState {
  downloadedUrls: Set<string>;
  downloadProgress: Map<string, DownloadProgress>;
}

type OfflineCacheListener = (state: OfflineCacheState) => void;

class OfflineAudioServiceImpl {
  private dbName = 'quran_audio_offline';
  private storeName = 'downloads';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  
  private downloadedUrls: Set<string> = new Set();
  private downloadProgress: Map<string, DownloadProgress> = new Map();
  private listeners: Set<OfflineCacheListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB().then(() => {
        this.loadDownloadedUrls();
      }).catch(err => {
        console.error('Failed to initialize offline audio DB:', err);
      });
    }
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.initDB();
  }

  // Load all currently downloaded URLs from IndexedDB
  private async loadDownloadedUrls() {
    try {
      const db = await this.getDB();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        this.downloadedUrls = new Set(keys);
        this.notifyListeners();
      };
    } catch (err) {
      console.error('Failed to load downloaded keys:', err);
    }
  }

  // Helper to format bytes to MB
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} ميجابايت`;
  }

  // Get all metadata of offline downloaded Suras
  async getAllDownloads(): Promise<OfflineMetadata[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.openCursor();
        const results: OfflineMetadata[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            const data = cursor.value;
            results.push({
              url: cursor.key as string,
              surahId: data.surahId,
              surahName: data.surahName,
              reciterName: data.reciterName,
              moshafName: data.moshafName,
              size: data.size || (data.blob ? data.blob.size : 0),
              addedAt: data.addedAt || Date.now()
            });
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to get all downloads:', err);
      return [];
    }
  }

  // Check if a URL is downloaded
  isDownloaded(url: string): boolean {
    return this.downloadedUrls.has(url);
  }

  // Retrieve local audio blob URL or fallback to the remote URL
  async getAudioUrl(url: string): Promise<string> {
    if (!this.isDownloaded(url)) {
      return url;
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(url);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.blob) {
            const blobUrl = URL.createObjectURL(result.blob);
            resolve(blobUrl);
          } else {
            resolve(url); // Fallback
          }
        };

        request.onerror = () => {
          resolve(url); // Fallback
        };
      });
    } catch (err) {
      console.error('Error fetching offline blob:', err);
      return url;
    }
  }

  // Delete a downloaded Surah
  async deleteDownload(url: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(url);

        request.onsuccess = () => {
          this.downloadedUrls.delete(url);
          this.notifyListeners();
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to delete offline surah:', err);
    }
  }

  // Clear all downloads
  async clearAllDownloads(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          this.downloadedUrls.clear();
          this.notifyListeners();
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to clear all downloads:', err);
    }
  }

  // Download a Surah in the background
  async downloadSurah(
    url: string,
    surah: APISurah,
    reciterName: string,
    moshafName: string
  ): Promise<void> {
    if (this.isDownloaded(url)) return;

    // Check if already downloading
    const existingProgress = this.downloadProgress.get(url);
    if (existingProgress && existingProgress.isDownloading) return;

    // Set initial progress
    this.updateProgress(url, {
      url,
      progress: 0,
      loaded: 0,
      total: 0,
      isDownloading: true
    });

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`تعذر التحميل (كود الاستجابة: ${response.status})`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      let blob: Blob;

      if (response.body) {
        const reader = response.body.getReader();
        let loaded = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            this.updateProgress(url, {
              url,
              progress: total > 0 ? Math.round((loaded / total) * 100) : 0,
              loaded,
              total,
              isDownloading: true
            });
          }
        }
        blob = new Blob(chunks, { type: 'audio/mp3' });
      } else {
        // Fallback if reader/body not supported
        blob = await response.blob();
      }

      // Save to IndexedDB
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const data = {
          blob,
          size: blob.size,
          surahId: surah.id,
          surahName: surah.name,
          reciterName,
          moshafName,
          addedAt: Date.now()
        };
        const request = store.put(data, url);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Mark as downloaded
      this.downloadedUrls.add(url);
      
      // Update progress to 100% and not downloading
      this.updateProgress(url, {
        url,
        progress: 100,
        loaded: blob.size,
        total: blob.size,
        isDownloading: false
      });

      // Clear progress after a short delay so the UI shows success
      setTimeout(() => {
        this.downloadProgress.delete(url);
        this.notifyListeners();
      }, 3000);

    } catch (err: any) {
      console.error('Download surah failed:', err);
      this.updateProgress(url, {
        url,
        progress: 0,
        loaded: 0,
        total: 0,
        isDownloading: false,
        error: err.message || 'فشل تحميل الملف'
      });
      
      // Keep error visible for a bit then clear
      setTimeout(() => {
        this.downloadProgress.delete(url);
        this.notifyListeners();
      }, 6000);
    }
  }

  // Download multiple Suras in parallel or sequential batch
  async downloadBatch(
    items: { url: string; surah: APISurah; reciterName: string; moshafName: string }[]
  ): Promise<void> {
    // Only download those not already downloaded
    const toDownload = items.filter(item => !this.isDownloaded(item.url));
    if (toDownload.length === 0) return;

    // Run in chunks or sequential to avoid overwhelming the browser network
    // Downloading sequentially is safer for network stability, especially on mobile networks
    for (const item of toDownload) {
      try {
        await this.downloadSurah(item.url, item.surah, item.reciterName, item.moshafName);
      } catch (err) {
        console.error(`Failed during batch download of Sura ${item.surah.name}:`, err);
      }
    }
  }

  private updateProgress(url: string, progress: DownloadProgress) {
    this.downloadProgress.set(url, progress);
    this.notifyListeners();
  }

  // Reactive Subscription
  getState(): OfflineCacheState {
    return {
      downloadedUrls: new Set(this.downloadedUrls),
      downloadProgress: new Map(this.downloadProgress)
    };
  }

  subscribe(listener: OfflineCacheListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('OfflineAudioService listener error:', err);
      }
    });
  }
}

export const OfflineAudioService = new OfflineAudioServiceImpl();
export default OfflineAudioService;
