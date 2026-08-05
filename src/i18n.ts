import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import mlTranslation from './locales/ml/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ml: { translation: mlTranslation },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ml'],
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    detection: {
      // Order of language detection: localStorage first, then browser language
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
