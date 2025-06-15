import type { Message } from '@shared/schema';

class TranslationManager {
  private userLanguage = 'ja'; // Default language

  setUserLanguage(language: string) {
    console.log(`🛑 Translation disabled: language set to ${language}`);
    this.userLanguage = language;
  }

  getUserLanguage(): string {
    return this.userLanguage;
  }

  get currentUserLanguage() {
    return this.userLanguage;
  }

  resetAuthenticationStatus() {
    console.log(`🛑 Translation disabled: authentication reset`);
  }

  translateMessage(
    message: Message, 
    targetLanguage: string, 
    priority: 'high' | 'normal' | 'low' = 'normal',
    callback: (result: string) => void
  ): void {
    // Translation completely disabled to prevent infinite loop
    const text = message.originalText || '';
    callback(text);
  }
}

export const translationManager = new TranslationManager();