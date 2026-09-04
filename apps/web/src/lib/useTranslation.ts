'use client';

import { useGame } from './gameState';
import { t, type Locale } from './translations';

export function useTranslation() {
  const { language } = useGame();

  const tl = (key: keyof typeof import('./translations').translations) =>
    t(language as Locale, key);

  return { tl, language: language as Locale };
}
