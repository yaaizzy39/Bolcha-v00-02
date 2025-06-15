import type { Message } from '@shared/schema';

class TranslationManager {
  private userLanguage = 'ja'; // Default language

  setUserLanguage(language: string) {
    this.userLanguage = language;
  }

  getUserLanguage(): string {
    return this.userLanguage;
  }

  get currentUserLanguage() {
    return this.userLanguage;
  }

  resetAuthenticationStatus() {
    // Do nothing
  }

  translateMessage(
    message: Message, 
    targetLanguage: string, 
    priority: 'high' | 'normal' | 'low' = 'normal',
    callback: (result: string) => void
  ): void {
    // Translation system completely disabled
    // No callback execution to prevent infinite loops
  }
}

export const translationManager = new TranslationManager();