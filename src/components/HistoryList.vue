<script setup lang="ts">
import { computed, ref } from 'vue';
import { browser } from '#imports';
import { useStoredRef } from '@/composables/useStoredRef';
import { toast } from '@/composables/useToast';
import { DEFAULT_MOCK_SETTINGS, METHOD_OPTIONS, type MockMethod, type MockSettings, type RecordedRequest } from '@/types';
import { timeAgo, uid } from '@/utils/misc';
import { t, locale } from '@/i18n';

const history = useStoredRef<RecordedRequest[]>('recordedRequests', []);
const mockSettings = useStoredRef<MockSettings>('mockSettings', DEFAULT_MOCK_SETTINGS);

const expandedRecs = ref(new Set<string>());
const replayingId = ref('');

const displayHistory = computed(() => history.value.slice(0, 50));
const localeTag = computed(() => (locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'));

function statusClass(status: number): string {
  if (!status) return 's-err';
  if (status < 300) return 's-2xx';
  if (status < 400) return 's-3xx';
  if (status < 500) return 's-4xx';
  return 's-5xx';
}

function toggleRec(id: string) {
  const set = new Set(expandedRecs.value);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  expandedRecs.value = set;
}

function removeRecord(id: string) {
  history.value = history.value.filter((r) => r.id !== id);
}

function clearHistory() {
  history.value = [];
  expandedRecs.value = new Set();
  toast(t('toast.cleared'), 'success');
}

function saveAsMock(rec: RecordedRequest) {
  let name = rec.url;
  try {
    name = new URL(rec.url).pathname;
  } catch {
    /* ignore */
  }
  const method = (METHOD_OPTIONS as readonly string[]).includes(rec.method) ? (rec.method as MockMethod) : 'ANY';
  mockSettings.value.rules.push({
    id: uid(),
    name: `Mock ${name}`.slice(0, 60),
    enabled: true,
    pattern: rec.url,
    method,
    status: rec.status || 200,
    delay: 0,
    contentType: rec.responseHeaders['content-type'] ?? 'application/json',
    body: rec.responseBody,
    createdAt: Date.now(),
  });
  if (!mockSettings.value.masterEnabled) toast(t('toast.savedMockOff'));
  else toast(t('toast.savedMock'), 'success');
}

async function replay(id: string) {
  replayingId.value = id;
  try {
    const res: any = await browser.runtime.sendMessage({ type: 'himock:replay', id });
    if (res?.ok) toast(t('toast.replayDone', { status: res.data?.status ?? '-' }), 'success');
    else throw new Error(res?.error || 'replay failed');
  } catch (e: any) {
    toast(t('toast.replayFail', { msg: e?.message ?? String(e) }), 'error');
  } finally {
    replayingId.value = '';
  }
}
</script>

<template>
  <section class="history">
    <div class="history-head">
      <div class="history-title">
        <h2>{{ t('history.title') }}</h2>
        <span class="count-chip">{{ history.length }}</span>
      </div>
      <p class="history-hint">{{ t('history.hint') }}</p>
      <button class="btn btn-sm btn-danger" :disabled="!history.length" @click="clearHistory">{{ t('history.clear') }}</button>
    </div>

    <div v-if="!displayHistory.length" class="empty small">
      <div class="empty-title">{{ t('history.emptyTitle') }}</div>
      <div class="empty-desc">{{ t('history.emptyDesc') }}</div>
    </div>
    <div v-else class="history-list">
      <div v-for="rec in displayHistory" :key="rec.id" class="h-item">
        <div class="h-row" @click="toggleRec(rec.id)">
          <span class="chip" :class="'m-' + rec.method.toLowerCase()">{{ rec.method }}</span>
          <span class="h-url" :title="rec.url">{{ rec.url }}</span>
          <span v-if="rec.mocked" class="pill mock">Mock</span>
          <span class="pill" :class="statusClass(rec.status)">{{ rec.status === 0 ? 'ERR' : rec.status }}</span>
          <span class="h-time">{{ timeAgo(rec.timestamp, t, localeTag) }}</span>
          <span class="h-actions">
            <button class="btn btn-sm" @click.stop="toggleRec(rec.id)">{{ t('history.view') }}</button>
            <button class="btn btn-sm" @click.stop="saveAsMock(rec)">{{ t('history.saveMock') }}</button>
            <button class="btn btn-sm" :disabled="replayingId === rec.id" @click.stop="replay(rec.id)">
              {{ replayingId === rec.id ? t('history.replaying') : t('history.replay') }}
            </button>
            <button class="del-btn" :title="t('common.delete')" @click.stop="removeRecord(rec.id)">✕</button>
          </span>
        </div>
        <div v-if="expandedRecs.has(rec.id)" class="h-detail">
          <div class="meta-line">
            <span class="meta-k">{{ t('history.fullUrl') }}</span>
            <span class="meta-v code">{{ rec.url }}</span>
          </div>
          <div v-if="rec.requestBody" class="meta-line">
            <span class="meta-k">{{ t('history.reqBody') }}</span>
            <pre class="code pre">{{ rec.requestBody }}</pre>
          </div>
          <div class="meta-k resp-meta">
            {{
              t('history.respBodyMeta', {
                size: rec.responseBody.length,
                extra: rec.responseHeaders['content-type'] ? ' · ' + rec.responseHeaders['content-type'] : '',
              })
            }}
          </div>
          <pre class="code pre">{{ rec.responseBody || t('history.emptyBody') }}</pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.history {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.history-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.history-title h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.history-hint {
  flex: 1;
  min-width: 220px;
  margin: 0;
  font-size: 12px;
  color: var(--text-3);
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 2px;
}
.h-item {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
  overflow: hidden;
}
.h-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
}
.h-url {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-family: var(--mono);
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.h-time {
  font-size: 12px;
  color: var(--text-3);
  flex: none;
  min-width: 76px;
  text-align: right;
}
.h-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}
.h-detail {
  border-top: 1px dashed var(--border);
  padding: 12px;
  background: #fafbfd;
}
.meta-line {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 4px;
}
.meta-k {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  flex: none;
}
.resp-meta {
  display: block;
  margin: 10px 0 4px;
}
.meta-v {
  font-size: 12px;
  color: var(--text-2);
  word-break: break-all;
}
.pre {
  margin: 0;
  padding: 10px 12px;
  background: #f4f6fa;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.55;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.empty.small {
  padding: 26px 16px;
}
</style>
