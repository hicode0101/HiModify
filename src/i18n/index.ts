import { computed } from 'vue';
import { browser } from '#imports';
import { useStoredRef } from '@/composables/useStoredRef';
import en from '@/locales/en';
import zhCN from '@/locales/zh-CN';

export type UiLanguage = 'auto' | 'en' | 'zh-CN';
export type Locale = 'en' | 'zh-CN';

const messages: Record<Locale, Record<string, string>> = { en, 'zh-CN': zhCN };

/** 用户选择：auto = 跟随浏览器语言；持久化到 storage */
export const uiLanguage = useStoredRef<UiLanguage>('uiLanguage', 'auto');

let cachedTag: string | null = null;
/** 浏览器 UI 语言原始标签（如 zh-CN / en-US），用于「关于」页展示 */
export function getBrowserLangTag(): string {
  if (cachedTag) return cachedTag;
  let lang = '';
  try {
    lang = browser.i18n?.getUILanguage?.() || '';
  } catch {
    lang = '';
  }
  if (!lang) lang = typeof navigator !== 'undefined' ? navigator.language : '';
  cachedTag = lang || 'en';
  return cachedTag;
}

let cachedBrowserLang: string | null = null;
function browserLang(): string {
  if (cachedBrowserLang !== null) return cachedBrowserLang;
  cachedBrowserLang = getBrowserLangTag().toLowerCase();
  return cachedBrowserLang;
}

/** 最终生效语言：匹配不到时回退英语 */
export const locale = computed<Locale>(() => {
  if (uiLanguage.value === 'auto') {
    return browserLang().startsWith('zh') ? 'zh-CN' : 'en';
  }
  return uiLanguage.value as Locale;
});

/** 翻译函数：在模板中直接调用即可随语言切换响应式更新 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = messages[locale.value] || messages.en;
  let s = dict[key] ?? messages.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}
