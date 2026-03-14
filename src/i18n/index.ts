import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import he from './locales/he.json';
import ar from './locales/ar.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import sv from './locales/sv.json';
import ru from './locales/ru.json';

const resources = {
  en: { translation: en },
  he: { translation: he },
  ar: { translation: ar },
  fr: { translation: fr },
  de: { translation: de },
  es: { translation: es },
  it: { translation: it },
  pt: { translation: pt },
  nl: { translation: nl },
  pl: { translation: pl },
  sv: { translation: sv },
  ru: { translation: ru },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'he', 'ar', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'sv', 'ru'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'prepd-language',
    },
  });

export default i18n;
