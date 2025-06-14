import { useAuth } from './useAuth';
import { t, type Language, type TranslationKey } from '@/lib/i18n';

export function useI18n() {
  const { user } = useAuth();
  const language = ((user as any)?.interfaceLanguage as Language) || 'ja';

  const translate = (key: TranslationKey): string => {
    return t(key, language);
  };

  return {
    language,
    t: translate,
  };
}