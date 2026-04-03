import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fr, en, mg, de } from './translations';

type Language = 'fr' | 'en' | 'mg' | 'de';

interface I18nContextType {
  t: (key: string, options?: any) => string;
  locale: Language;
  setLocale: (lang: Language) => void;
  isReady: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const i18n = new I18n({ fr, en, mg, de });
i18n.enableFallback = true;
i18n.defaultLocale = 'fr';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Language>('fr');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const saved = await AsyncStorage.getItem('user-language');
        if (saved && (['fr', 'en', 'mg', 'de'].includes(saved))) {
          i18n.locale = saved;
          setLocaleState(saved as Language);
        } else {
          // Detect device language
          const deviceLanguage = Localization.getLocales()[0].languageCode;
          const defaultLang = deviceLanguage === 'fr' ? 'fr' : 'en';
          i18n.locale = defaultLang;
          setLocaleState(defaultLang);
        }
      } catch (e) {
        i18n.locale = 'fr';
      } finally {
        setIsReady(true);
      }
    };
    loadLocale();
  }, []);

  const setLocale = (lang: Language) => {
    i18n.locale = lang;
    setLocaleState(lang);
    AsyncStorage.setItem('user-language', lang).catch(e => {
       console.error('Failed to save language', e);
    });
  };

  const t = (key: string, options?: any) => i18n.t(key, options);

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, isReady }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
