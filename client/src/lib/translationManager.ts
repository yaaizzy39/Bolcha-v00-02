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
  private isDisabled = true; // Completely disable to prevent infinite loops

  constructor() {
    console.log('🛑 TranslationManager initialized in disabled mode to prevent infinite loops');
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
    // Translation system completely disabled to prevent infinite loop
    if (this.isDisabled) {
      console.log(`🛑 Translation disabled to prevent infinite loop: "${message.originalText}"`);
      callback(message.originalText || '');
      return;
    }

    // This code path should never be reached while disabled
    callback(message.originalText || '');
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