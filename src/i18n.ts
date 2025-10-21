import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import heTranslation from './locales/he.json';

const resources = {
  en: {
    translation: enTranslation
  },
  he: {
    translation: heTranslation
  }
};

// Custom path language detector
const pathLanguageDetector = {
  name: 'pathLanguage',
  lookup() {
    const path = window.location.pathname;
    const langMatch = path.match(/^\/(he|en)(\/|$)/);
    return langMatch ? langMatch[1] : null;
  },
  cacheUserLanguage(lng: string) {
    localStorage.setItem('i18nextLng', lng);
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: true,
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['pathLanguage', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupFromPathIndex: 0
    }
  });

// Add custom detector
i18n.services.languageDetector.addDetector(pathLanguageDetector);

export default i18n;
