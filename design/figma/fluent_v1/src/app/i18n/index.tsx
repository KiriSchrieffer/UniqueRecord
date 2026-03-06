import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getRuntimeSettings } from '../lib/api';

export type AppLanguage = 'zh-CN' | 'en-US';

const DEFAULT_LANGUAGE: AppLanguage = 'zh-CN';

export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (typeof value !== 'string') {
    return DEFAULT_LANGUAGE;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'en' || normalized === 'en-us' || normalized === 'en_us' || normalized === 'english') {
    return 'en-US';
  }
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh_cn' || normalized === 'chinese') {
    return 'zh-CN';
  }
  return DEFAULT_LANGUAGE;
}

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  tr: (zhText: string, enText: string) => string;
  isEnglish: boolean;
  isChinese: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);
  const hasManualLanguageOverrideRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void getRuntimeSettings()
      .then((settings) => {
        if (!mounted) {
          return;
        }
        if (hasManualLanguageOverrideRef.current) {
          return;
        }
        setLanguageState(normalizeAppLanguage(settings?.ui?.language));
      })
      .catch(() => {
        // Keep default language when runtime settings are temporarily unavailable.
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.lang = language === 'en-US' ? 'en' : 'zh-CN';
  }, [language]);

  const setLanguage = useCallback((next: AppLanguage) => {
    hasManualLanguageOverrideRef.current = true;
    setLanguageState(normalizeAppLanguage(next));
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const isEnglish = language === 'en-US';
    return {
      language,
      setLanguage,
      tr: (zhText: string, enText: string) => (isEnglish ? enText : zhText),
      isEnglish,
      isChinese: !isEnglish,
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
