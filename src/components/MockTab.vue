<script setup lang="ts">
import { computed } from 'vue';
import FluentToggle from './FluentToggle.vue';
import MockRuleCard from './MockRuleCard.vue';
import HistoryList from './HistoryList.vue';
import { useStoredRef } from '@/composables/useStoredRef';
import { toast } from '@/composables/useToast';
import { DEFAULT_MOCK_SETTINGS, type MockRule } from '@/types';
import { uid } from '@/utils/misc';
import { t } from '@/i18n';

const settings = useStoredRef('mockSettings', DEFAULT_MOCK_SETTINGS);
const enabledCount = computed(() => settings.value.rules.filter((r) => r.enabled).length);

function addMock() {
  const rule: MockRule = {
    id: uid(),
    name: t('mock.mockN', { n: settings.value.rules.length + 1 }),
    enabled: true,
    pattern: '',
    method: 'ANY',
    status: 200,
    delay: 0,
    contentType: 'application/json',
    body: '',
    createdAt: Date.now(),
  };
  settings.value.rules.push(rule);
  toast(t('toast.mockAdded'), 'success');
}

function removeRule(id: string) {
  settings.value.rules = settings.value.rules.filter((r) => r.id !== id);
}
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <FluentToggle v-model="settings.masterEnabled" :label="t('mock.master')" />
        <span class="toolbar-label">{{ t('mock.master') }}</span>
        <span class="toolbar-sep"></span>
        <FluentToggle v-model="settings.recordingEnabled" :label="t('mock.recording')" />
        <span class="toolbar-label">{{ t('mock.recording') }}</span>
        <span class="count-chip" :class="{ on: settings.masterEnabled }">
          {{ t('mock.enabledCount', { n: enabledCount }) }}
        </span>
      </div>
      <button class="btn btn-primary" @click="addMock">{{ t('mock.add') }}</button>
    </div>
    <!-- eslint-disable-next-line vue/no-v-html —— 文案为内置静态内容 -->
    <p class="hint" v-html="t('mock.hint')"></p>

    <template v-if="settings.rules.length">
      <MockRuleCard v-for="rule in settings.rules" :key="rule.id" :rule="rule" @remove="removeRule(rule.id)" />
    </template>
    <div v-else class="empty">
      <div class="empty-title">{{ t('mock.emptyTitle') }}</div>
      <div class="empty-desc">{{ t('mock.emptyDesc') }}</div>
      <button class="btn btn-primary" @click="addMock">{{ t('mock.add') }}</button>
    </div>

    <HistoryList class="history-block" />
  </div>
</template>

<style scoped>
.toolbar-sep {
  width: 1px;
  height: 18px;
  background: var(--border-strong);
  margin: 0 4px;
}
.history-block {
  margin-top: 26px;
}
</style>
