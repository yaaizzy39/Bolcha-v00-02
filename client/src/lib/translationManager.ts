import type { Message } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

// Simple translation cache in localStorage
const CACHE_KEY = 'bolcha_translations';

interface CacheEntry {
  text: string;
  source: string;
  target: string;
  translatedText: string;
  timestamp: number;
}

class TranslationManager {
  private userLanguage = 'ja';
  private cache: Map<string, CacheEntry> = new Map();
  private isProcessing = false;
  private isDisabled = false; // Enable manual translation only

  constructor() {
    console.log('TranslationManager initialized - manual translation only');
    this.loadCache();
  }

  setUserLanguage(language: string) {
    this.userLanguage = language;
  }

  getUserLanguage(): string {
    return this.userLanguage;
  }

  get currentUserLanguage() {
    return this.userLanguage;
  }

  resetAuthenticationStatus() {
    // Clear cache on auth reset
    this.cache.clear();
    this.saveCache();
  }

  private loadCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const entries = JSON.parse(cached);
        this.cache = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load translation cache:', error);
      this.cache.clear();
    }
  }

  private saveCache() {
    try {
      const entries = Array.from(this.cache.entries());
      localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save translation cache:', error);
    }
  }

  private getCacheKey(text: string, source: string, target: string): string {
    return `${source}-${target}-${text}`;
  }

  async translateMessage(
    message: Message, 
    targetLanguage: string, 
    priority: 'high' | 'normal' | 'low' = 'normal',
    callback: (result: string) => void
  ): Promise<void> {
    // Only allow manual translation with high priority
    if (priority !== 'high') {
      callback(message.originalText || '');
      return;
    }

    const text = message.originalText;
    if (!text || !text.trim()) {
      callback(text);
      return;
    }

    const sourceLanguage = this.detectLanguage(text);
    
    if (sourceLanguage === targetLanguage) {
      callback(text);
      return;
    }

    const cacheKey = this.getCacheKey(text, sourceLanguage, targetLanguage);
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      callback(cached.translatedText);
      return;
    }

    if (this.isProcessing) {
      callback(text);
      return;
    }

    this.isProcessing = true;
    console.log(`Manual translation: "${text}" (${sourceLanguage} -> ${targetLanguage})`);

    try {
      const response = await apiRequest('POST', '/api/translate', {
        text: text.trim(),
        source: sourceLanguage,
        target: targetLanguage,
      }) as any;

      const translatedText = response.translatedText || text;
      
      this.cache.set(cacheKey, {
        text,
        source: sourceLanguage,
        target: targetLanguage,
        translatedText,
        timestamp: Date.now()
      });
      
      this.saveCache();
      callback(translatedText);
    } catch (error) {
      console.error('Translation failed:', error);
      callback(text);
    } finally {
      this.isProcessing = false;
    }
  }

  private detectLanguage(text: string): string {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    const chineseRegex = /[\u4E00-\u9FFF]/;
    const koreanRegex = /[\uAC00-\uD7AF]/;
    const arabicRegex = /[\u0600-\u06FF]/;
    const thaiRegex = /[\u0E00-\u0E7F]/;
    const hindiRegex = /[\u0900-\u097F]/;
    
    if (japaneseRegex.test(text)) return 'ja';
    if (chineseRegex.test(text)) return 'zh';
    if (koreanRegex.test(text)) return 'ko';
    if (arabicRegex.test(text)) return 'ar';
    if (thaiRegex.test(text)) return 'th';
    if (hindiRegex.test(text)) return 'hi';
    
    return 'en';
  }
}

export const translationManager = new TranslationManager();