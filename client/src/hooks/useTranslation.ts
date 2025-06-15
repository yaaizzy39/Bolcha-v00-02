import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { translationCache } from '@/lib/translationCache';

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateText = useCallback(async (text: string, source: string, target: string): Promise<string> => {
    if (source === target || !text.trim()) {
      return text;
    }

    setIsTranslating(true);
    try {
      const response = await apiRequest('POST', '/api/translate', {
        text: text.trim(),
        source,
        target,
      }) as any;
      
      return response.translatedText || text;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Return original text on failure
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const detectLanguage = useCallback((text: string): string => {
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
    
    return 'en'; // Default to English
  }, []);

  return {
    translateText,
    detectLanguage,
    isTranslating,
  };
}