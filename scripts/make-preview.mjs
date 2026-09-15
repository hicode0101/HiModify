/**
 * 本地预览辅助：把构建产物 dist/ 用静态服务器跑起来，
 * 并生成注入了 chrome API 桩（stub）的 options-preview.html / popup-preview.html，
 * 便于在普通浏览器标签页中预览扩展 UI（无需加载扩展）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, '.output', 'chrome-mv3');

const sampleHeaderSettings = {
  masterEnabled: true,
  rules: [
    {
      id: 'demo-1',
      name: '测试环境 Token',
      enabled: true,
      patterns: ['*://*.example.com/*'],
      modifications: [
        { id: 'm1', target: 'request', action: 'set', name: 'Authorization', value: 'Bearer demo-token-123' },
        { id: 'm2', target: 'request', action: 'set', name: 'X-Env', value: 'test' },
      ],
      createdAt: Date.now(),
    },
    {
      id: 'demo-2',
      name: '移除响应安全限制（调试用）',
      enabled: true,
      patterns: ['https://dev.example.com/*'],
      modifications: [{ id: 'm3', target: 'response', action: 'remove', name: 'X-Frame-Options', value: '' }],
      createdAt: Date.now(),
    },
  ],
};

const sampleMockSettings = {
  masterEnabled: true,
  recordingEnabled: true,
  rules: [
    {
      id: 'demo-m1',
      name: 'Mock 用户信息',
      enabled: true,
      pattern: 'https://api.example.com/v1/user',
      method: 'GET',
      status: 200,
      delay: 300,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: { id: 1, name: 'HiModify' } }, null, 2),
      createdAt: Date.now(),
    },
  ],
};

const now = Date.now();
const sampleHistory = [
  {
    id: 'r1',
    url: 'https://api.example.com/v1/user?id=1',
    method: 'GET',
    status: 200,
    statusText: 'OK',
    requestHeaders: { accept: 'application/json' },
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: JSON.stringify({ code: 0, data: { id: 1, name: 'Alice' } }),
    mocked: false,
    timestamp: now - 60_000,
  },
  {
    id: 'r2',
    url: 'https://api.example.com/v1/order',
    method: 'POST',
    status: 201,
    statusText: 'Created',
    requestHeaders: { 'content-type': 'application/json' },
    requestBody: '{"sku":"A001","count":2}',
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '{"code":0,"data":{"orderId":"SO-1001"}}',
    mocked: false,
    timestamp: now - 300_000,
  },
  {
    id: 'r3',
    url: 'https://api.example.com/v1/report',
    method: 'GET',
    status: 500,
    statusText: 'Internal Server Error',
    requestHeaders: {},
    responseHeaders: { 'content-type': 'text/html' },
    responseBody: '<html><body>500 Internal Server Error</body></html>',
    mocked: false,
    timestamp: now - 900_000,
  },
];

const stub = `(function () {
  var store = {
    headerSettings: ${JSON.stringify(sampleHeaderSettings)},
    mockSettings: ${JSON.stringify(sampleMockSettings)},
    recordedRequests: ${JSON.stringify(sampleHistory)}
  };
  var listeners = [];
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  window.chrome = {
    runtime: {
      id: 'preview-extension',
      getManifest: function () { return { version: '4.0.3', name: 'HiModify' }; },
      openOptionsPage: function () {},
      sendMessage: function (msg) {
        if (msg && msg.type === 'himock:replay') {
          return Promise.resolve({ ok: false, error: '预览环境不支持重放，请在扩展中试用' });
        }
        return Promise.resolve({ ok: true, data: null });
      },
      onMessage: { addListener: function () {}, removeListener: function () {} },
      getURL: function (p) { return p; }
    },
    i18n: {
      getUILanguage: function () { return 'zh-CN'; }
    },
    storage: {
      local: {
        get: function (key) {
          if (typeof key === 'string') {
            var out = {};
            if (store[key] !== undefined) out[key] = clone(store[key]);
            return Promise.resolve(out);
          }
          return Promise.resolve(clone(store));
        },
        set: function (obj) {
          for (var k in obj) {
            store[k] = clone(obj[k]);
            listeners.forEach(function (l) {
              try { l((function (kk, vv) { var c = {}; c[kk] = { newValue: vv }; return c; })(k, clone(obj[k])), 'local'); } catch (e) {}
            });
          }
          return Promise.resolve();
        },
        remove: function () { return Promise.resolve(); },
        clear: function () { return Promise.resolve(); }
      },
      onChanged: {
        addListener: function (l) { listeners.push(l); },
        removeListener: function (l) { var i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); }
      }
    },
    declarativeNetRequest: {
      getDynamicRules: function () { return Promise.resolve({ rules: [] }); },
      updateDynamicRules: function () { return Promise.resolve(); }
    },
    action: {
      setBadgeText: function () { return Promise.resolve(); },
      setBadgeBackgroundColor: function () { return Promise.resolve(); }
    }
  };
})();
`;

writeFileSync(join(dist, 'preview-stub.js'), stub);

for (const name of ['options.html', 'popup.html']) {
  let html = readFileSync(join(dist, name), 'utf-8');
  html = html.replace('<head>', '<head>\n    <script src="./preview-stub.js"></script>');
  writeFileSync(join(dist, name.replace('.html', '-preview.html')), html);
}
console.log('preview files generated: dist/options-preview.html, dist/popup-preview.html');
