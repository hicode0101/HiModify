<script setup lang="ts">
import { computed } from 'vue';
import { uiLanguage, t, type UiLanguage } from '@/i18n';

const options = computed(() => [
  { value: 'auto' as UiLanguage, label: t('lang.auto') },
  { value: 'en' as UiLanguage, label: 'English' },
  { value: 'zh-CN' as UiLanguage, label: '简体中文' },
]);
</script>

<template>
  <select v-model="uiLanguage" class="select lang-select" :aria-label="t('lang.label')" :title="t('lang.label')">
    <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
  </select>
</template>

<style scoped>
.lang-select {
  width: 200px;
  box-shadow: 0 1px 1px rgba(18, 28, 45, 0.04);
}
</style>
