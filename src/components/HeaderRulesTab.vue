<script setup lang="ts">
import { computed } from 'vue';
import FluentToggle from './FluentToggle.vue';
import HeaderRuleCard from './HeaderRuleCard.vue';
import { useStoredRef } from '@/composables/useStoredRef';
import { toast } from '@/composables/useToast';
import { DEFAULT_HEADER_SETTINGS, type HeaderRule } from '@/types';
import { uid } from '@/utils/misc';
import { t } from '@/i18n';

const settings = useStoredRef('headerSettings', DEFAULT_HEADER_SETTINGS);
const enabledCount = computed(() => settings.value.rules.filter((r) => r.enabled).length);

function addRule() {
  const rule: HeaderRule = {
    id: uid(),
    name: t('headers.ruleN', { n: settings.value.rules.length + 1 }),
    enabled: true,
    patterns: ['*://*/*'],
    modifications: [{ id: uid(), target: 'request', action: 'set', name: 'X-Custom-Header', value: 'HiModify' }],
    createdAt: Date.now(),
  };
  settings.value.rules.push(rule);
  toast(t('toast.ruleAdded'), 'success');
}

function removeRule(id: string) {
  settings.value.rules = settings.value.rules.filter((r) => r.id !== id);
}
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <FluentToggle v-model="settings.masterEnabled" :label="t('headers.master')" />
        <span class="toolbar-label">{{ t('headers.master') }}</span>
        <span class="count-chip" :class="{ on: settings.masterEnabled }">
          {{ t('headers.enabledCount', { n: enabledCount }) }}
        </span>
      </div>
      <button class="btn btn-primary" @click="addRule">{{ t('headers.addRule') }}</button>
    </div>
    <!-- eslint-disable-next-line vue/no-v-html —— 文案为内置静态内容 -->
    <p class="hint" v-html="t('headers.hint')"></p>

    <template v-if="settings.rules.length">
      <HeaderRuleCard v-for="rule in settings.rules" :key="rule.id" :rule="rule" @remove="removeRule(rule.id)" />
    </template>
    <div v-else class="empty">
      <div class="empty-title">{{ t('headers.emptyTitle') }}</div>
      <div class="empty-desc">{{ t('headers.emptyDesc') }}</div>
      <button class="btn btn-primary" @click="addRule">{{ t('headers.addRule') }}</button>
    </div>
  </div>
</template>
