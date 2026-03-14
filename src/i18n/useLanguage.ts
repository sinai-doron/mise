import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type UILanguage = 'en' | 'he' | 'ar' | 'fr' | 'de' | 'es' | 'it' | 'pt' | 'nl' | 'pl' | 'sv' | 'ru';

const RTL_LANGUAGES: UILanguage[] = ['he', 'ar'];

export const LANGUAGE_META: Record<UILanguage, { nativeName: string; flag: string }> = {
  en: { nativeName: 'English', flag: '🇬🇧' },
  he: { nativeName: 'עברית', flag: '🇮🇱' },
  ar: { nativeName: 'العربية', flag: '🇸🇦' },
  fr: { nativeName: 'Français', flag: '🇫🇷' },
  de: { nativeName: 'Deutsch', flag: '🇩🇪' },
  es: { nativeName: 'Español', flag: '🇪🇸' },
  it: { nativeName: 'Italiano', flag: '🇮🇹' },
  pt: { nativeName: 'Português', flag: '🇵🇹' },
  nl: { nativeName: 'Nederlands', flag: '🇳🇱' },
  pl: { nativeName: 'Polski', flag: '🇵🇱' },
  sv: { nativeName: 'Svenska', flag: '🇸🇪' },
  ru: { nativeName: 'Русский', flag: '🇷🇺' },
};

export function useLanguage() {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language as UILanguage;
  const isRTL = RTL_LANGUAGES.includes(currentLanguage);

  const changeLanguage = useCallback((lang: UILanguage) => {
    i18n.changeLanguage(lang);
  }, [i18n]);

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [isRTL, currentLanguage]);

  return {
    currentLanguage,
    isRTL,
    changeLanguage,
    languages: Object.keys(LANGUAGE_META) as UILanguage[],
  };
}
