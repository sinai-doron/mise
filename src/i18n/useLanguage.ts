import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type UILanguage = 'en' | 'he';

const RTL_LANGUAGES: UILanguage[] = ['he'];

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
    languages: ['en', 'he'] as UILanguage[],
  };
}
