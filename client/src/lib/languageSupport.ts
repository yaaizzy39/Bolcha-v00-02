import type { Language } from './i18n';

// Language code mappings for Google Translate API
export const LANGUAGE_CODES: Record<Language, string> = {
  'en': 'en',    // English
  'ja': 'ja',    // Japanese
  'es': 'es',    // Spanish
  'fr': 'fr',    // French
  'de': 'de',    // German
  'zh': 'zh-cn', // Chinese (Simplified)
  'ko': 'ko',    // Korean
  'pt': 'pt',    // Portuguese
  'ru': 'ru',    // Russian
  'ar': 'ar',    // Arabic
  'hi': 'hi',    // Hindi
  'it': 'it',    // Italian
  'nl': 'nl',    // Dutch
  'th': 'th',    // Thai
  'vi': 'vi',    // Vietnamese
};

// Language names for display
export const LANGUAGE_NAMES: Record<Language, { en: string; native: string }> = {
  'en': { en: 'English', native: 'English' },
  'ja': { en: 'Japanese', native: '日本語' },
  'es': { en: 'Spanish', native: 'Español' },
  'fr': { en: 'French', native: 'Français' },
  'de': { en: 'German', native: 'Deutsch' },
  'zh': { en: 'Chinese (Simplified)', native: '简体中文' },
  'ko': { en: 'Korean', native: '한국어' },
  'pt': { en: 'Portuguese', native: 'Português' },
  'ru': { en: 'Russian', native: 'Русский' },
  'ar': { en: 'Arabic', native: 'العربية' },
  'hi': { en: 'Hindi', native: 'हिन्दी' },
  'it': { en: 'Italian', native: 'Italiano' },
  'nl': { en: 'Dutch', native: 'Nederlands' },
  'th': { en: 'Thai', native: 'ไทย' },
  'vi': { en: 'Vietnamese', native: 'Tiếng Việt' },
};

// Enhanced language detection patterns
export const LANGUAGE_PATTERNS: Record<Language, RegExp> = {
  'ja': /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,  // Hiragana, Katakana, Kanji
  'ko': /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,  // Hangul
  'zh': /[\u4E00-\u9FFF]/,                              // Chinese characters
  'ar': /[\u0600-\u06FF\u0750-\u077F]/,                // Arabic
  'hi': /[\u0900-\u097F]/,                             // Devanagari
  'th': /[\u0E00-\u0E7F]/,                             // Thai
  'vi': /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i,
  'ru': /[\u0400-\u04FF]/,                             // Cyrillic
  'en': /^[a-zA-Z\s\d\.,!?\-'"()]+$/,                  // Latin basic
  'es': /[ñáéíóúü]/i,                                  // Spanish accents
  'fr': /[àâäçéèêëïîôùûüÿ]/i,                          // French accents
  'de': /[äöüßÄÖÜ]/,                                   // German umlauts
  'pt': /[ãâáàçêéíôóõúü]/i,                            // Portuguese accents
  'it': /[àèéìíîòóù]/i,                                // Italian accents
  'nl': /[äëïöüÄËÏÖÜ]/,                                // Dutch accents
};

// Detect language from text
export function detectLanguage(text: string): Language {
  // Check for non-Latin scripts first (they have unique character sets)
  if (LANGUAGE_PATTERNS.ja.test(text)) return 'ja';
  if (LANGUAGE_PATTERNS.ko.test(text)) return 'ko';
  if (LANGUAGE_PATTERNS.zh.test(text)) return 'zh';
  if (LANGUAGE_PATTERNS.ar.test(text)) return 'ar';
  if (LANGUAGE_PATTERNS.hi.test(text)) return 'hi';
  if (LANGUAGE_PATTERNS.th.test(text)) return 'th';
  if (LANGUAGE_PATTERNS.ru.test(text)) return 'ru';
  
  // Check for Latin-based languages with specific accents/characters
  if (LANGUAGE_PATTERNS.vi.test(text)) return 'vi';
  if (LANGUAGE_PATTERNS.de.test(text)) return 'de';
  if (LANGUAGE_PATTERNS.es.test(text)) return 'es';
  if (LANGUAGE_PATTERNS.fr.test(text)) return 'fr';
  if (LANGUAGE_PATTERNS.pt.test(text)) return 'pt';
  if (LANGUAGE_PATTERNS.it.test(text)) return 'it';
  if (LANGUAGE_PATTERNS.nl.test(text)) return 'nl';
  
  // Default to English for basic Latin text
  return 'en';
}

// Get supported languages for dropdowns
export function getSupportedLanguages(): Array<{ code: Language; name: string; nativeName: string }> {
  return Object.entries(LANGUAGE_NAMES).map(([code, names]) => ({
    code: code as Language,
    name: names.en,
    nativeName: names.native,
  }));
}