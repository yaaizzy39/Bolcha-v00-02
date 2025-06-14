export const translations = {
  en: {
    // Landing Page
    'landing.title': 'Welcome to Bolcha',
    'landing.subtitle': 'Borderless chat connecting people around the world',
    'landing.signIn': 'Sign in with Google',
    
    // Navigation
    'nav.title': 'Bolcha (borderless chat)',
    'nav.online': 'Online',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign Out',
    
    // Chat
    'chat.title': 'Global Chat Room',
    'chat.autoTranslate': 'Auto-translate',
    'chat.on': 'ON',
    'chat.off': 'OFF',
    'chat.settings': 'Settings',
    'chat.disconnected': 'Disconnected - Attempting to reconnect...',
    'chat.placeholder': 'Type your message...',
    'chat.detected': 'Detected',
    'chat.willTranslateTo': 'Will translate to',
    'chat.original': 'Original',
    
    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.displayName': 'Display Name',
    'settings.languagePreferences': 'Language Preferences',
    'settings.interfaceLanguage': 'Interface Language',
    'settings.messageLanguage': 'Preferred Message Language',
    'settings.translationSettings': 'Translation Settings',
    'settings.translationPreferences': 'Translation Preferences',
    'settings.showOriginal': 'Show original text with translations',
    'settings.showOriginalText': 'Show original text with translations',
    'settings.showOriginalTextDescription': 'Display both original and translated text',
    'settings.autoTranslate': 'Enable automatic translation',
    'settings.autoTranslateDescription': 'Automatically translate messages to your preferred language',
    'settings.account': 'Account',
    'settings.save': 'Save',
    'settings.saving': 'Saving...',
    'settings.cancel': 'Cancel',
    'settings.saved': 'Settings saved',
    'settings.savedDesc': 'Your preferences have been updated successfully.',
    'settings.error': 'Error',
    'settings.errorDesc': 'Failed to save settings. Please try again.',
    
    // Languages
    'language.english': 'English',
    'language.japanese': 'Japanese',
    'language.spanish': 'Spanish',
    'language.french': 'French',
    'language.german': 'German',
    'language.chinese': 'Chinese (Simplified)',
    'language.korean': 'Korean',
    'language.portuguese': 'Portuguese',
    'language.russian': 'Russian',
    'language.arabic': 'Arabic',
    'language.hindi': 'Hindi',
    'language.italian': 'Italian',
    'language.dutch': 'Dutch',
    'language.thai': 'Thai',
    'language.vietnamese': 'Vietnamese',
  },
  ja: {
    // Landing Page
    'landing.title': 'Bolchaへようこそ',
    'landing.subtitle': 'ボーダーレスチャットで世界中の人々とつながりましょう',
    'landing.signIn': 'Googleでサインイン',
    
    // Navigation
    'nav.title': 'Bolcha (borderless chat)',
    'nav.online': 'オンライン',
    'nav.settings': '設定',
    'nav.signOut': 'サインアウト',
    
    // Chat
    'chat.title': 'グローバルチャットルーム',
    'chat.autoTranslate': '自動翻訳',
    'chat.on': 'オン',
    'chat.off': 'オフ',
    'chat.settings': '設定',
    'chat.disconnected': '切断されました - 再接続中...',
    'chat.placeholder': 'メッセージを入力してください...',
    'chat.detected': '検出された言語',
    'chat.willTranslateTo': '翻訳先',
    'chat.original': '原文',
    
    // Settings
    'settings.title': '設定',
    'settings.profile': 'プロフィール',
    'settings.displayName': '表示名',
    'settings.languagePreferences': '言語設定',
    'settings.interfaceLanguage': 'インターフェース言語',
    'settings.messageLanguage': 'メッセージの優先言語',
    'settings.translationSettings': '翻訳設定',
    'settings.translationPreferences': '翻訳設定',
    'settings.showOriginal': '翻訳と一緒に原文を表示',
    'settings.showOriginalText': '翻訳と一緒に原文を表示',
    'settings.showOriginalTextDescription': '原文と翻訳の両方を表示する',
    'settings.autoTranslate': '自動翻訳を有効にする',
    'settings.autoTranslateDescription': 'メッセージを自動的に優先言語に翻訳する',
    'settings.account': 'アカウント',
    'settings.save': '保存',
    'settings.saving': '保存中...',
    'settings.cancel': 'キャンセル',
    'settings.saved': '設定を保存しました',
    'settings.savedDesc': '設定が正常に更新されました。',
    'settings.error': 'エラー',
    'settings.errorDesc': '設定の保存に失敗しました。もう一度お試しください。',
    
    // Languages
    'language.english': '英語',
    'language.japanese': '日本語',
    'language.spanish': 'スペイン語',
    'language.french': 'フランス語',
    'language.german': 'ドイツ語',
    'language.chinese': '中国語（簡体字）',
    'language.korean': '韓国語',
    'language.portuguese': 'ポルトガル語',
    'language.russian': 'ロシア語',
    'language.arabic': 'アラビア語',
    'language.hindi': 'ヒンディー語',
    'language.italian': 'イタリア語',
    'language.dutch': 'オランダ語',
    'language.thai': 'タイ語',
    'language.vietnamese': 'ベトナム語',
  }
};

export type Language = 'en' | 'ja' | 'es' | 'fr' | 'de' | 'zh' | 'ko' | 'pt' | 'ru' | 'ar' | 'hi' | 'it' | 'nl' | 'th' | 'vi';
export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, language: Language = 'en'): string {
  // Only use translations that exist (en and ja for now)
  const supportedLang = language === 'ja' ? 'ja' : 'en';
  return (translations[supportedLang] as any)[key] || (translations.en as any)[key] || key;
}