import { translationCache } from './translationCache';
import { apiRequest } from './queryClient';
import type { Message } from '@shared/schema';

interface TranslationRequest {
  messageId: number;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  priority: 'high' | 'normal' | 'low';
}

interface TranslationResult {
  messageId: number;
  translatedText: string;
}

class TranslationManager {
  private queue: TranslationRequest[] = [];
  private processing = false;
  private callbacks = new Map<number, (result: string) => void>();
  private currentUserLanguage: string = 'en';

  setUserLanguage(language: string) {
    if (this.currentUserLanguage !== language) {
      console.log(`🌐 Language changed from ${this.currentUserLanguage} to ${language}`);
      this.currentUserLanguage = language;
      // Clear queue and restart translations for new language
      this.queue = [];
      this.callbacks.clear();
    }
  }

  translateMessage(
    message: Message, 
    targetLanguage: string, 
    priority: 'high' | 'normal' | 'low' = 'normal',
    callback: (result: string) => void
  ): void {
    const text = message.originalText || '';
    const sourceLanguage = message.originalLanguage || 'ja';
    
    // Skip if same language
    if (sourceLanguage === targetLanguage) {
      callback(text);
      return;
    }

    // Check if this is Japanese text (our main use case)
    const isJapanese = sourceLanguage === 'ja' || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    if (!isJapanese) {
      callback(text);
      return;
    }

    // Check cache first
    const cached = translationCache.get(text, sourceLanguage, targetLanguage);
    if (cached) {
      console.log(`📚 Using cached translation for message ${message.id}: "${cached}"`);
      callback(cached);
      return;
    }

    // Add to translation queue
    const request: TranslationRequest = {
      messageId: message.id,
      text,
      sourceLanguage,
      targetLanguage,
      priority
    };

    // Remove any existing request for this message
    this.queue = this.queue.filter(req => req.messageId !== message.id);
    
    // Add new request and sort by priority
    this.queue.push(request);
    this.sortQueue();
    
    // Store callback
    this.callbacks.set(message.id, callback);
    
    console.log(`📝 Added message ${message.id} to translation queue (priority: ${priority})`);
    
    // Start processing if not already running
    this.processQueue();
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`🔄 Processing translation queue (${this.queue.length} items)`);

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      try {
        console.log(`🔍 Translating message ${request.messageId}: "${request.text}" (${request.sourceLanguage} -> ${request.targetLanguage})`);
        
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            text: request.text,
            source: request.sourceLanguage,
            target: request.targetLanguage
          })
        });

        const result = await response.json();
        const translatedText = result.translatedText || request.text;

        // Cache the result
        if (translatedText !== request.text) {
          translationCache.set(request.text, translatedText, request.sourceLanguage, request.targetLanguage);
          console.log(`💾 Cached translation: "${request.text}" -> "${translatedText}"`);
        }

        // Call callback if still needed
        const callback = this.callbacks.get(request.messageId);
        if (callback) {
          callback(translatedText);
          this.callbacks.delete(request.messageId);
          console.log(`✅ Translation completed for message ${request.messageId}`);
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Translation failed for message ${request.messageId}:`, error);
        
        // Call callback with original text on error
        const callback = this.callbacks.get(request.messageId);
        if (callback) {
          callback(request.text);
          this.callbacks.delete(request.messageId);
        }
      }
    }

    this.processing = false;
    console.log(`✅ Translation queue processing completed`);
  }

  // Get cache stats for debugging
  getCacheStats(): { size: number; oldestEntry: Date | null; newestEntry: Date | null } {
    return translationCache.getCacheStats();
  }

  // Clear all pending translations (useful when language changes)
  clearQueue(): void {
    this.queue = [];
    this.callbacks.clear();
    console.log(`🧹 Translation queue cleared`);
  }
}

export const translationManager = new TranslationManager();