<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import FluentToggle from './FluentToggle.vue';
import type { HeaderRule } from '@/types';
import { validatePattern } from '@/utils/matching';
import { uid } from '@/utils/misc';
import { t } from '@/i18n';

const props = defineProps<{ rule: HeaderRule }>();
const emit = defineEmits<{ remove: [] }>();

const expanded = ref(true);
const patternsText = ref(props.rule.patterns.join('\n'));

watch(patternsText, () => {
  props.rule.patterns = patternsText.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
});

const patternErrors = computed(() =>
  patternsText.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => ({ line: l, error: validatePattern(l) }))
    .filter((x) => x.error)
);

function addModification() {
  props.rule.modifications.push({ id: uid(), target: 'request', action: 'set', name: '', value: '' });
}
function removeModification(id: string) {
  props.rule.modifications = props.rule.modifications.filter((m) => m.id !== id);
}
</script>

<template>
  <div class="rule-card" :class="{ disabled: !rule.enabled }">
    <div class="rule-head" @click="expanded = !expanded">
      <FluentToggle v-model="rule.enabled" @click.stop />
      <input v-model="rule.name" class="rule-name input" :placeholder="t('headers.ruleNamePh')" @click.stop />
      <span class="rule-summary">
        {{ rule.patterns.length ? rule.patterns[0] : t('headers.noPattern') }}
        <template v-if="rule.patterns.length > 1">{{ t('headers.andMore', { n: rule.patterns.length }) }}</template>
      </span>
      <span class="mod-count">{{ t('headers.modCount', { n: rule.modifications.length }) }}</span>
      <button class="chevron" :class="{ open: expanded }" :aria-label="t('common.toggle')" :title="t('common.toggle')" @click.stop="expanded = !expanded">▾</button>
      <button class="del-btn" :title="t('common.delete')" @click.stop="emit('remove')">✕</button>
    </div>

    <div v-show="expanded" class="rule-body">
      <div class="field">
        <label class="field-label">{{ t('headers.patternsLabel') }}</label>
        <textarea v-model="patternsText" class="textarea code" rows="3" placeholder="*://*.example.com/*"></textarea>
        <div v-if="patternErrors.length" class="error-text">
          <div v-for="pe in patternErrors" :key="pe.line">✕ {{ pe.error }}</div>
        </div>
      </div>

      <div class="mods">
        <div class="mods-head">
          <span>{{ t('headers.colTarget') }}</span>
          <span>{{ t('headers.colAction') }}</span>
          <span>{{ t('headers.colName') }}</span>
          <span>{{ t('headers.colValue') }}</span>
          <span></span>
        </div>
        <div v-for="mod in rule.modifications" :key="mod.id" class="mods-row">
          <select v-model="mod.target" class="select">
            <option value="request">{{ t('headers.targetRequest') }}</option>
            <option value="response">{{ t('headers.targetResponse') }}</option>
          </select>
          <select v-model="mod.action" class="select">
            <option value="set">{{ t('headers.actionSet') }}</option>
            <option value="append">{{ t('headers.actionAppend') }}</option>
            <option value="remove">{{ t('headers.actionRemove') }}</option>
          </select>
          <input v-model="mod.name" class="input code" :placeholder="t('headers.namePh')" />
          <input v-model="mod.value" class="input code" :placeholder="t('headers.valuePh')" :disabled="mod.action === 'remove'" />
          <button class="del-btn" :title="t('common.delete')" @click="removeModification(mod.id)">✕</button>
        </div>
        <button class="btn btn-sm add-mod" @click="addModification">{{ t('headers.addMod') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rule-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
  margin-bottom: 12px;
  transition: box-shadow 0.15s ease;
}
.rule-card:hover {
  box-shadow: 0 2px 10px rgba(18, 28, 45, 0.07);
}
.rule-card.disabled {
  background: #fafbfc;
}
.rule-card.disabled .rule-name,
.rule-card.disabled .rule-summary {
  color: var(--text-3);
}
.rule-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 14px;
  cursor: pointer;
}
.rule-name {
  font-weight: 600;
  max-width: 240px;
  width: 240px;
}
.rule-summary {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: var(--text-2);
  font-family: var(--mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mod-count {
  font-size: 12px;
  color: var(--text-3);
  flex: none;
}
.chevron,
.del-btn {
  border: 0;
  background: none;
  cursor: pointer;
  padding: 4px 7px;
  border-radius: 4px;
  flex: none;
}
.chevron {
  color: var(--text-3);
  font-size: 12px;
  transition: transform 0.15s ease;
}
.chevron.open {
  transform: rotate(180deg);
}
.del-btn {
  color: var(--text-3);
  font-size: 13px;
}
.del-btn:hover {
  color: var(--danger);
  background: var(--danger-bg);
}
.rule-body {
  border-top: 1px solid var(--border);
  padding: 14px;
}
.field {
  margin-bottom: 14px;
}
.field-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 6px;
}
.mods {
  border-top: 1px dashed var(--border);
  padding-top: 12px;
}
.mods-head,
.mods-row {
  display: grid;
  grid-template-columns: 92px 108px 1fr 1fr 30px;
  gap: 8px;
  align-items: center;
}
.mods-head {
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 6px;
  padding: 0 2px;
}
.mods-row {
  margin-bottom: 8px;
}
.mods-row .select {
  width: 100%;
}
.add-mod {
  margin-top: 2px;
}
</style>
