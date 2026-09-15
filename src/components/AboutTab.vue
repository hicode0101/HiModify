<script setup lang="ts">
import { ref } from 'vue';
import { browser } from '#imports';
import LanguageSelect from './LanguageSelect.vue';
import { useStoredRef } from '@/composables/useStoredRef';
import { toast } from '@/composables/useToast';
import {
  AUTHOR,
  DEFAULT_HEADER_SETTINGS,
  DEFAULT_MOCK_SETTINGS,
  PROJECT_URL,
  type HeaderSettings,
  type MockSettings,
} from '@/types';
import { t, getBrowserLangTag } from '@/i18n';

const headerSettings = useStoredRef<HeaderSettings>('headerSettings', DEFAULT_HEADER_SETTINGS);
const mockSettings = useStoredRef<MockSettings>('mockSettings', DEFAULT_MOCK_SETTINGS);

let version = '';
try {
  version = browser.runtime.getManifest().version;
} catch {
  version = '';
}

const fileInput = ref<HTMLInputElement | null>(null);

function exportConfig() {
  const payload = {
    app: 'HiModify',
    version,
    exportedAt: new Date().toISOString(),
    headerSettings: headerSettings.value,
    mockSettings: mockSettings.value,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `himodify-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(t('toast.exported'), 'success');
}

async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.headerSettings && Array.isArray(data.headerSettings.rules)) {
      headerSettings.value = {
        masterEnabled: !!data.headerSettings.masterEnabled,
        rules: data.headerSettings.rules,
      };
    }
    if (data.mockSettings && Array.isArray(data.mockSettings.rules)) {
      mockSettings.value = {
        masterEnabled: !!data.mockSettings.masterEnabled,
        recordingEnabled: !!data.mockSettings.recordingEnabled,
        rules: data.mockSettings.rules,
      };
    }
    toast(t('toast.imported'), 'success');
  } catch (err: any) {
    toast(t('toast.importFail', { msg: err?.message ?? String(err) }), 'error');
  } finally {
    input.value = '';
  }
}
</script>

<template>
  <div class="about-wrap">
    <table class="about-table">
      <tbody>
        <tr>
          <th>{{ t('about.project') }}</th>
          <td>
            <a :href="PROJECT_URL" target="_blank" rel="noreferrer">{{ PROJECT_URL }}</a>
          </td>
        </tr>
        <tr>
          <th>{{ t('about.version') }}</th>
          <td>v{{ version }}</td>
        </tr>
        <tr>
          <th>{{ t('about.author') }}</th>
          <td>{{ AUTHOR }}</td>
        </tr>
        <tr>
          <th>{{ t('about.browserLang') }}</th>
          <td>
            <div class="row-flex">
              <code class="lang-tag">{{ getBrowserLangTag() }}</code>
              <span class="row-hint">{{ t('about.browserLangHint') }}</span>
            </div>
          </td>
        </tr>
        <tr>
          <th>{{ t('about.uiLang') }}</th>
          <td>
            <div class="row-flex">
              <LanguageSelect />
              <span class="row-hint">{{ t('about.uiLangHint') }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="about-actions">
      <button class="btn" @click="exportConfig">{{ t('about.export') }}</button>
      <button class="btn" @click="fileInput?.click()">{{ t('about.import') }}</button>
      <input ref="fileInput" type="file" accept="application/json,.json" style="display: none" @change="onImportFile" />
    </div>
  </div>
</template>

<style scoped>
.about-wrap {
  max-width: 860px;
}
.about-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.row-flex {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.lang-tag {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--text-1);
  background: #f1f3f8;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
}
.row-hint {
  font-size: 12.5px;
  color: var(--text-2);
}
</style>
