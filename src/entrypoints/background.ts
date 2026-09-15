import { browser, defineBackground } from '#imports';
import {
  DEFAULT_HEADER_SETTINGS,
  HISTORY_LIMIT,
  type HeaderSettings,
  type RecordedRequest,
} from '@/types';
import { syncHeaderRules } from '@/utils/dnr';
import { debounce, uid } from '@/utils/misc';

const HEADER_KEY = 'headerSettings';
const HISTORY_KEY = 'recordedRequests';

const MAX_RESP_BODY = 200_000;
const MAX_REQ_BODY = 65_536;

async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const res: any = await browser.storage.local.get(key);
    return res?.[key] ?? fallback;
  } catch {
    return fallback;
  }
}

async function updateBadge() {
  const s = await getJson<HeaderSettings>(HEADER_KEY, DEFAULT_HEADER_SETTINGS);
  const count = s?.masterEnabled ? (s.rules ?? []).filter((r) => r.enabled).length : 0;
  try {
    await browser.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    await browser.action.setBadgeBackgroundColor({ color: '#0067c0' });
  } catch {
    /* ignore */
  }
}

function sanitizeHeaders(obj: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      out[String(k).slice(0, 128)] = String(v).slice(0, 4096);
    }
  }
  return out;
}

/** 来自页面世界的数据不可信任，逐字段规范化并限制大小 */
function sanitizeRecord(raw: any): RecordedRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const url = String(raw.url ?? '');
  if (!/^https?:/i.test(url)) return null;
  return {
    id: uid(),
    url: url.slice(0, 4096),
    method: String(raw.method ?? 'GET').toUpperCase().slice(0, 16),
    status: Number(raw.status) || 0,
    statusText: String(raw.statusText ?? '').slice(0, 128),
    requestHeaders: sanitizeHeaders(raw.requestHeaders),
    requestBody: typeof raw.requestBody === 'string' ? raw.requestBody.slice(0, MAX_REQ_BODY) : undefined,
    responseHeaders: sanitizeHeaders(raw.responseHeaders),
    responseBody: String(raw.responseBody ?? '').slice(0, MAX_RESP_BODY),
    mocked: !!raw.mocked,
    timestamp: Number(raw.timestamp) || Date.now(),
  };
}

let pendingAdds: RecordedRequest[] = [];
const flushAdds = debounce(async () => {
  const adds = pendingAdds;
  pendingAdds = [];
  if (!adds.length) return;
  const cur = await getJson<RecordedRequest[]>(HISTORY_KEY, []);
  const next = [...adds, ...cur].slice(0, HISTORY_LIMIT);
  try {
    await browser.storage.local.set({ [HISTORY_KEY]: next });
  } catch {
    /* 存储满等情况忽略 */
  }
}, 600);

async function replayRequest(id: string): Promise<RecordedRequest> {
  const list = await getJson<RecordedRequest[]>(HISTORY_KEY, []);
  const rec = list.find((r) => r.id === id);
  const idx = rec ? list.indexOf(rec) : -1;
  if (idx < 0 || !rec) throw new Error('记录不存在');

  const headers: Record<string, string> = {};
  const skip = new Set(['host', 'content-length', 'connection']);
  for (const [k, v] of Object.entries(rec.requestHeaders ?? {})) {
    if (!skip.has(k.toLowerCase())) headers[k] = v;
  }
  const init: any = { method: rec.method, headers, cache: 'no-store' };
  if (!['GET', 'HEAD'].includes(rec.method) && rec.requestBody) init.body = rec.requestBody;

  const res = await fetch(rec.url, init);
  const text = await res.text();
  const responseHeaders: Record<string, string> = {};
  try {
    res.headers.forEach((v, k) => {
      responseHeaders[k] = v;
    });
  } catch {
    /* ignore */
  }
  const updated: RecordedRequest = {
    ...rec,
    status: res.status,
    statusText: res.statusText,
    responseHeaders,
    responseBody: text.slice(0, MAX_RESP_BODY),
    mocked: false,
    timestamp: Date.now(),
  };
  list[idx] = updated;
  await browser.storage.local.set({ [HISTORY_KEY]: list });
  return updated;
}

async function handleMessage(msg: any): Promise<any> {
  if (!msg || typeof msg !== 'object') return null;
  switch (msg.type) {
    case 'himock:record': {
      const rec = sanitizeRecord(msg.payload);
      if (rec) {
        pendingAdds.push(rec);
        flushAdds();
      }
      return null;
    }
    case 'himock:replay': {
      return await replayRequest(String(msg.id));
    }
    default:
      return null;
  }
}

export default defineBackground(() => {
  void (async () => {
    await syncHeaderRules(await getJson<HeaderSettings>(HEADER_KEY, DEFAULT_HEADER_SETTINGS));
    await updateBadge();
  })();

  browser.storage.onChanged.addListener((changes: any, area: string) => {
    if (area !== 'local') return;
    if (changes[HEADER_KEY]) {
      void syncHeaderRules(changes[HEADER_KEY].newValue ?? DEFAULT_HEADER_SETTINGS).then((res) => {
        if (!res.ok) console.warn('[HiModify] 同步请求头规则失败：', res.error);
        return updateBadge();
      });
    }
  });

  browser.runtime.onMessage.addListener((msg: any, _sender: any, sendResponse: (r: any) => void) => {
    void handleMessage(msg)
      .then((r) => sendResponse({ ok: true, data: r }))
      .catch((e) => sendResponse({ ok: false, error: e?.message ?? String(e) }));
    return true; // 保持消息通道开启以异步响应
  });
});
