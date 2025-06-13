export const translations = {
  en: {
    // Landing Page
    'landing.title': 'Welcome to Multi-Language Chat',
    'landing.subtitle': 'Connect with people around the world in your preferred language',
    'landing.signIn': 'Sign in with Google',
    
    // Navigation
    'nav.title': 'Multi-Language Chat',
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
    'settings.showOriginal': 'Show original text with translations',
    'settings.autoTranslate': 'Enable automatic translation',
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
  },
  ja: {
    // Landing Page
    'landing.title': '多言語対応チャットへようこそ',
    'landing.subtitle': '世界中の人々とあなたの好きな言語でつながりましょう',
    'landing.signIn': 'Googleでサインイン',
    
    // Navigation
    'nav.title': '多言語対応チャット',
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
    'settings.showOriginal': '翻訳と一緒に原文を表示',
    'settings.autoTranslate': '自動翻訳を有効にする',
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
  }
};

export type Language = 'en' | 'ja';
export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, language: Language = 'en'): string {
  return translations[language][key] || translations.en[key] || key;
}