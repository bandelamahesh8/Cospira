import { I18n } from 'i18n-js';
import en from './translations/en.json';

// Minimal setup for Expo/RN
const i18n = new I18n({
  en: en,
  // Add other languages here
});

i18n.defaultLocale = 'en';
i18n.locale = 'en'; // Hardcoded for prototype; use expo-localization for real detection

export default i18n;

export const t = (key, options) => i18n.t(key, options);
