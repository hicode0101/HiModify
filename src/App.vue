<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import BrandHeader from '@/components/BrandHeader.vue';
import HeaderRulesTab from '@/components/HeaderRulesTab.vue';
import MockTab from '@/components/MockTab.vue';
import AboutTab from '@/components/AboutTab.vue';
import Toasts from '@/components/Toasts.vue';
import { useStoredRef } from '@/composables/useStoredRef';
import { toast } from '@/composables/useToast';
import { DEFAULT_HEADER_SETTINGS, type HeaderSettings } from '@/types';
import { syncHeaderRules } from '@/utils/dnr';
import { t, locale } from '@/i18n';

const props = defineProps<{ compact?: boolean }>();

type TabId = 'headers' | 'mock' | 'about';
const tabs = computed<{ id: TabId; label: string }[]>(() => [
  { id: 'headers', label: t('tab.headers') },
  { id: 'mock', label: t('tab.mock') },
  { id: 'about', label: t('tab.about') },
]);
const activeTab = ref<TabId>('headers');

// 语言切换时同步页面标题与 <html lang>
watchEffect(() => {
  document.title = props.compact ? 'HiModify' : t('app.optionsTitle');
  document.documentElement.lang = locale.value;
});

const headerSettings = useStoredRef<HeaderSettings>('headerSettings', DEFAULT_HEADER_SETTINGS);

// 规则变化后同步 declarativeNetRequest 动态规则（防抖避免输入时频繁重建）
let syncTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  headerSettings,
  () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const res = await syncHeaderRules(headerSettings.value);
      if (!res.ok) toast(t('headers.syncFail', { msg: res.error ?? '' }), 'error');
    }, 400);
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="page" :class="{ compact }">
    <BrandHeader :compact="compact" />
    <main class="card">
      <nav class="tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          role="tab"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
      <section class="panel">
        <HeaderRulesTab v-show="activeTab === 'headers'" />
        <MockTab v-show="activeTab === 'mock'" />
        <AboutTab v-if="activeTab === 'about'" />
      </section>
    </main>
    <footer v-if="!compact" class="footer">
      Copyright by
      <a href="https://github.com/hicode0101" target="_blank" rel="noreferrer">hicode0101</a>
    </footer>
    <Toasts />
  </div>
</template>
