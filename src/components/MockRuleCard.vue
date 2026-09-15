<script setup lang="ts">
import { ref } from 'vue';
import FluentToggle from './FluentToggle.vue';
import { toast } from '@/composables/useToast';
import type { MockRule } from '@/types';
import { STATUS_TEXT } from '@/utils/constants';
import { t } from '@/i18n';

const props = defineProps<{ rule: MockRule }>();
const emit = defineEmits<{ remove: [] }>();

const expanded = ref(false);

function formatJson() {
  try {
    const parsed = JSON.parse(props.rule.body);
    props.rule.body = JSON.stringify(parsed, null, 2);
    toast(t('toast.jsonOk'), 'success');
  } catch (e: any) {
    toast(t('toast.jsonFail', { msg: e?.message ?? String(e) }), 'error');
  }
}

function statusLabel() {
  if (props.rule.status === 0) return 'ERR';
  return String(props.rule.status);
}
function statusClass() {
  const s = props.rule.status;
  if (!s) return 's-err';
  if (s < 300) return 's-2xx';
  if (s < 400) return 's-3xx';
  if (s < 500) return 's-4xx';
  return 's-5xx';
}
function statusText() {
  const st = STATUS_TEXT[props.rule.status];
  return st ? ` · ${st}` : '';
}
</script>

<template>
  <div class="mock-card" :class="{ disabled: !rule.enabled }">
    <div class="mock-head" @click="expanded = !expanded">
      <FluentToggle v-model="rule.enabled" @click.stop />
      <input v-model="rule.name" class="mock-name input" :placeholder="t('mock.namePh')" @click.stop />
      <span class="chip" :class="'m-' + rule.method.toLowerCase()">{{ rule.method }}</span>
      <span class="pill" :class="statusClass()" :title="statusText()">{{ statusLabel() }}</span>
      <span class="mock-url">{{ rule.pattern || t('mock.noPattern') }}</span>
      <span v-if="rule.delay > 0" class="delay-tag">{{ rule.delay }}ms</span>
      <button class="chevron" :class="{ open: expanded }" :aria-label="t('common.toggle')" :title="t('common.toggle')" @click.stop="expanded = !expanded">▾</button>
      <button class="del-btn" :title="t('common.delete')" @click.stop="emit('remove')">✕</button>
    </div>

    <div v-show="expanded" class="mock-body">
      <div class="grid-row">
        <div class="field grow">
          <label class="field-label">{{ t('mock.patternLabel') }}</label>
          <input v-model="rule.pattern" class="input code" :placeholder="t('mock.patternPh')" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label">{{ t('mock.method') }}</label>
          <select v-model="rule.method" class="select full">
            <option v-for="m in ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">{{ t('mock.statusLabel') }}</label>
          <input v-model.number="rule.status" type="number" min="0" max="599" class="input" />
        </div>
        <div class="field">
          <label class="field-label">{{ t('mock.delayLabel') }}</label>
          <input v-model.number="rule.delay" type="number" min="0" step="50" class="input" />
        </div>
        <div class="field grow">
          <label class="field-label">{{ t('mock.contentType') }}</label>
          <input v-model="rule.contentType" class="input code" placeholder="application/json" />
        </div>
      </div>
      <div class="field">
        <div class="field-label-row">
          <label class="field-label">{{ t('mock.bodyLabel') }}</label>
          <div class="field-actions">
            <span class="body-size">{{ t('mock.sizeChars', { n: rule.body.length }) }}</span>
            <button class="btn btn-sm" @click="formatJson">{{ t('mock.formatJson') }}</button>
          </div>
        </div>
        <textarea v-model="rule.body" class="textarea code" rows="8" placeholder='{"code": 0, "data": {}}'></textarea>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mock-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
  margin-bottom: 12px;
  transition: box-shadow 0.15s ease;
}
.mock-card:hover {
  box-shadow: 0 2px 10px rgba(18, 28, 45, 0.07);
}
.mock-card.disabled {
  background: #fafbfc;
}
.mock-card.disabled .mock-name,
.mock-card.disabled .mock-url {
  color: var(--text-3);
}
.mock-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  cursor: pointer;
}
.mock-name {
  font-weight: 600;
  width: 170px;
  flex: none;
}
.mock-url {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: var(--text-2);
  font-family: var(--mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.delay-tag {
  font-size: 11.5px;
  color: var(--text-2);
  background: #f1f3f8;
  border-radius: 4px;
  padding: 1px 6px;
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
.mock-body {
  border-top: 1px solid var(--border);
  padding: 14px;
}
.field {
  margin-bottom: 12px;
}
.field.grow {
  flex: 1;
}
.field-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 6px;
}
.field-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.field-row .field {
  width: 150px;
  flex: none;
}
.field-row .field.grow {
  width: auto;
  min-width: 200px;
}
.full {
  width: 100%;
}
.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.field-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.body-size {
  font-size: 12px;
  color: var(--text-3);
}
.grid-row {
  display: flex;
  gap: 12px;
}
</style>
