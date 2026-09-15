<script setup lang="ts">
import { t } from '@/i18n';
import PencilLogo from './PencilLogo.vue';

defineProps<{ compact?: boolean }>();
</script>

<template>
  <header class="brand" :class="{ compact }">
    <PencilLogo :size="compact ? 34 : 54" />
    <div class="brand-text">
      <h1>HiModify</h1>
      <p>{{ t('app.subtitle') }}</p>
    </div>
  </header>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 8px 20px;
  flex: 1;
  min-width: 0;
}
.brand.compact {
  gap: 12px;
  padding: 0 4px 12px;
}
.brand-text h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1.2;
}
.brand.compact h1 {
  font-size: 20px;
}
.brand-text p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brand.compact p {
  font-size: 12px;
}
</style>
