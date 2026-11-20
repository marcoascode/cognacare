import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['pt', 'en', 'es'],
    
    // Simplifique o fallback para testar. Se não achar inglês, usa pt.
    fallbackLng: { 
      'pt': ['en'], 
      'default': ['en'] 
    },
    
    // Oculta os logs e avisos de missingKey no console
    debug: false, 
    
    interpolation: {
      escapeValue: false,
    },
    
    // ADICIONE ISSO PARA EVITAR ECRÃ BRANCO/ERROS DE SUSPENSE
    react: {
      useSuspense: false, 
    }
  });

export default i18n;