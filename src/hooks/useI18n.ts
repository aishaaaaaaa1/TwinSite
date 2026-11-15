import { useAppStore } from '@/store/useAppStore'
import en from '@/i18n/en.json'
import fr from '@/i18n/fr.json'

type Translations = typeof en

const translations: Record<string, Translations> = { en, fr }

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : path
}

export function useI18n() {
  const lang = useAppStore((s) => s.lang)
  const dict = translations[lang] ?? translations.en

  function t(key: string): string {
    return getNestedValue(dict as unknown as Record<string, unknown>, key)
  }

  return { t, lang }
}
