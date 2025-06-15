import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { translationCache } from '@/lib/translationCache';

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateText = useCallback(async (text: string, source: string, target: string): Promise<string> => {
    if (!text.trim() || source === target) {
      return text;
    }

    // Check cache first
    const cachedTranslation = translationCache.get(text, source, target);
    if (cachedTranslation) {
      return cachedTranslation;
    }

    setIsTranslating(true);
    try {
      const response = await apiRequest('POST', '/api/translate', {
        text,
        source,
        target
      });
      
      const data = await response.json();
      let translatedText = data.translatedText || text;
      
      // If translatedText is a JSON string, parse it
      try {
        const parsedResult = JSON.parse(translatedText);
        if (parsedResult && typeof parsedResult === 'object' && parsedResult.text) {
          translatedText = parsedResult.text;
        }
      } catch (parseError) {
        // If it's not JSON, use the text as-is
      }
      
      // Cache the successful translation
      translationCache.set(text, translatedText, source, target);
      
      return translatedText;
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