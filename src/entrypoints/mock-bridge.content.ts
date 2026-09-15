import { browser, defineContentScript } from '#imports';
import { DEFAULT_MOCK_SETTINGS, type MockSettings } from '@/types';

/**
 * 隔离世界桥接脚本：
 * 1. 从 storage 读取 Mock 配置，通过 window.postMessage 下发给 MAIN 世界钩子；
 * 2. 接收钩子上报的录制数据，转发给 background。
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  main() {
    const BRIDGE_SRC = 'HiModifyBridge';
    const HOOK_SRC = 'HiModifyHook';

    async function broadcast() {
      let settings: MockSettings = DEFAULT_MOCK_SETTINGS;
      try {
        const res: any = await browser.storage.local.get('mockSettings');
        settings = res?.mockSettings ?? DEFAULT_MOCK_SETTINGS;
      } catch {
        /* ignore */
      }
      const payload = {
        masterEnabled: !!settings.masterEnabled,
        recordingEnabled: !!settings.recordingEnabled,
        rules: (settings.rules ?? []).map((r) => ({
          enabled: !!r.enabled,
          pattern: String(r.pattern ?? ''),
          method: String(r.method ?? 'ANY'),
          status: Number(r.status) || 200,
          delay: Number(r.delay) || 0,
          contentType: String(r.contentType ?? ''),
          body: String(r.body ?? ''),
        })),
      };
      try {
        window.postMessage({ source: BRIDGE_SRC, type: 'config', data: payload }, '*');
      } catch {
        /* ignore */
      }
    }

    window.addEventListener('message', (e: MessageEvent) => {
      if (e.source !== window) return;
      const d: any = e.data;
      if (!d || d.source !== HOOK_SRC) return;
      if (d.type === 'ready') {
        void broadcast();
        return;
      }
      if (d.type === 'record' && d.data) {
        try {
          void browser.runtime.sendMessage({ type: 'himock:record', payload: d.data }).catch(() => {});
        } catch {
          /* 扩展上下文失效（如重载后）忽略 */
        }
      }
    });

    try {
      browser.storage.onChanged.addListener((changes: any, area: string) => {
        if (area === 'local' && changes.mockSettings) void broadcast();
      });
    } catch {
      /* ignore */
    }

    void broadcast();
  },
});
