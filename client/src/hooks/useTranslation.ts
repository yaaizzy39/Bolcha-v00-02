import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { translationCache } from '@/lib/translationCache';

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateText = useCallback(async (text: string, source: string, target: string): Promise<string> => {
    // Translation completely disabled to prevent infinite loop
    return text;
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