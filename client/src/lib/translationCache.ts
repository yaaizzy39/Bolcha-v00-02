// Translation cache utility for storing and retrieving translated messages
interface CachedTranslation {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
}

class TranslationCache {
  private cache: Map<string, CachedTranslation> = new Map();
  private readonly CACHE_KEY = 'bolcha_translation_cache';
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_EXPIRY_DAYS = 30;

  constructor() {
    this.loadFromStorage();
  }

  private generateKey(text: string, source: string, target: string): string {
    return `${source}-${target}-${text.trim().toLowerCase()}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.CACHE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        const expiryTime = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        // Filter out expired entries
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (now - value.timestamp < expiryTime) {
            this.cache.set(key, value);
          }
        });

        console.log(`📦 Loaded ${this.cache.size} cached translations from storage`);
      }
    } catch (error) {
      console.warn('Failed to load translation cache:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<string, CachedTranslation> = {};
      this.cache.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save translation cache:', error);
    }
  }

  get(text: string, source: string, target: string): string | null {
    const key = this.generateKey(text, source, target);
    const cached = this.cache.get(key);
    
    if (cached) {
      console.log(`💾 Cache hit for: "${text}" (${source} -> ${target})`);
      return cached.translatedText;
    }
    
    return null;
  }

  set(text: string, translatedText: string, source: string, target: string): void {
    const key = this.generateKey(text, source, target);
    const translation: CachedTranslation = {
      originalText: text,
      translatedText,
      sourceLanguage: source,
      targetLanguage: target,
      timestamp: Date.now()
    };

    this.cache.set(key, translation);
    console.log(`💾 Cached translation: "${text}" -> "${translatedText}" (${source} -> ${target})`);

    // Cleanup old entries if cache is too large
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 10% of entries
      const toRemove = Math.floor(this.MAX_CACHE_SIZE * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
      console.log(`🧹 Cleaned up ${toRemove} old cache entries`);
    }

    this.saveToStorage();
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.CACHE_KEY);
    console.log('🗑️ Translation cache cleared');
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheStats(): { size: number; oldestEntry: Date | null; newestEntry: Date | null } {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntry: null, newestEntry: null };
    }

    const timestamps = Array.from(this.cache.values()).map(c => c.timestamp);
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);

    return {
      size: this.cache.size,
      oldestEntry: new Date(oldest),
      newestEntry: new Date(newest)
    };
  }
}

// Create singleton instance
export const translationCache = new TranslationCache();