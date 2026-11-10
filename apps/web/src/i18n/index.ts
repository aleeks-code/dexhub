import { useAppStore } from '@/core/store/app.store'
import { en } from './en'
import { it } from './it'

export type Language = 'en' | 'it'
export const LANG_STORAGE_KEY = 'dexhub-language'

export function useT() {
  const lang = useAppStore((s) => s.language)
  return lang === 'it' ? it : en
}
