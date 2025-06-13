import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateText = useCallback(async (text: string, source: string, target: string): Promise<string> => {
    if (!text.trim() || source === target) {
      return text;
    }

    setIsTranslating(true);
    try {
      const response = await apiRequest('POST', '/api/translate', {
        text,
        source,
        target
      });
      
      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Return original text on error
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const detectLanguage = useCallback((text: string): string => {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(text) ? 'ja' : 'en';
  }, []);

  return {
    translateText,
    detectLanguage,
    isTranslating,
  };
}
