import { ref, watch, type Ref } from 'vue';
import { browser } from '#imports';
import { debounce } from '@/utils/misc';

const registry = new Map<string, Ref<any>>();

/**
 * 基于 chrome.storage.local 的响应式存储。
 * 同 key 的多个调用方共享同一实例；storage 变化（含其他上下文）自动同步。
 */
export function useStoredRef<T>(key: string, initial: T): Ref<T> {
  const existing = registry.get(key);
  if (existing) return existing as Ref<T>;

  const data = ref(JSON.parse(JSON.stringify(initial))) as Ref<T>;
  let hydrated = false;

  const persist = debounce(() => {
    void browser.storage.local.set({ [key]: JSON.parse(JSON.stringify(data.value)) });
  }, 250);

  void browser.storage.local
    .get(key)
    .then((res: any) => {
      if (res && res[key] !== undefined && res[key] !== null) data.value = res[key];
    })
    .catch(() => {
      /* ignore */
    })
    .finally(() => {
      hydrated = true;
    });

  browser.storage.onChanged.addListener((changes: any, area: string) => {
    if (area !== 'local' || !changes[key]) return;
    const incoming = changes[key].newValue;
    if (JSON.stringify(incoming) === JSON.stringify(data.value)) return;
    data.value = incoming;
  });

  watch(
    data,
    () => {
      if (!hydrated) return;
      persist();
    },
    { deep: true }
  );

  registry.set(key, data);
  return data;
}
