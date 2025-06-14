import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateText = useCallback(async (text: string, source: string, target: string): Promise<string> => {
    console.log(`🔄 useTranslation.translateText called:`, { text, source, target });
    
    if (!text.trim() || source === target) {
      console.log(`⏭️ Translation skipped: empty text or same language`);
      return text;
    }

    setIsTranslating(true);
    try {
      console.log(`📡 Making API request to /api/translate`);
      const response = await apiRequest('POST', '/api/translate', {
        text,
        source,
        target
      });
      
      console.log(`📨 API response status:`, response.status);
      const data = await response.json();
      console.log(`📄 API response data:`, data);
      
      let translatedText = data.translatedText || text;
      
      // If translatedText is a JSON string, parse it
      try {
        const parsedResult = JSON.parse(translatedText);
        if (parsedResult.code === 200 && parsedResult.text) {
          translatedText = parsedResult.text;
        } else if (parsedResult.text) {
          translatedText = parsedResult.text;
        }
      } catch (parseError) {
        // If it's not JSON, use the text as-is
      }
      
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
