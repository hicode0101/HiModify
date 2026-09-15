import { urlMatches } from '@/utils/matching';
import { STATUS_TEXT } from '@/utils/constants';

/**
 * MAIN 世界注入钩子（document_start，先于页面脚本执行）：
 * - 重写 window.fetch / window.XMLHttpRequest，命中 Mock 规则时返回模拟响应；
 * - 开启录制时，透传真实请求并把响应上报给隔离世界桥接脚本。
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  allFrames: true,
  main() {
    const w = window as any;
    if (w.__HIMODIFY_HOOK__) return;
    w.__HIMODIFY_HOOK__ = true;

    const HOOK_SRC = 'HiModifyHook';
    const BRIDGE_SRC = 'HiModifyBridge';
    const MAX_RESP_BODY = 200_000;
    const MAX_REQ_BODY = 65_536;

    interface HookRule {
      enabled: boolean;
      pattern: string;
      method: string;
      status: number;
      delay: number;
      contentType: string;
      body: string;
    }
    interface HookConfig {
      masterEnabled: boolean;
      recordingEnabled: boolean;
      rules: HookRule[];
    }

    // 配置由隔离世界桥接脚本通过 postMessage 下发；未到达前保持透传，保证零侵入
    let config: HookConfig = { masterEnabled: false, recordingEnabled: false, rules: [] };
    let configReceived = false;

    const onWindowMessage = (e: MessageEvent) => {
      if (e.source !== window) return;
      const d: any = e.data;
      if (d && d.source === BRIDGE_SRC && d.type === 'config' && d.data) {
        config = d.data;
        configReceived = true;
      }
    };
    window.addEventListener('message', onWindowMessage);

    const post = (msg: unknown) => {
      try {
        window.postMessage(msg, '*');
      } catch {
        /* ignore */
      }
    };
    post({ source: HOOK_SRC, type: 'ready' });
    let tries = 0;
    const askTimer = window.setInterval(() => {
      if (configReceived || ++tries > 30) {
        window.clearInterval(askTimer);
        return;
      }
      post({ source: HOOK_SRC, type: 'ready' });
    }, 100);

    function findMockRule(url: string, method: string): HookRule | null {
      if (!config.masterEnabled) return null;
      for (const r of config.rules) {
        if (!r.enabled) continue;
        const m = String(r.method ?? 'ANY').toUpperCase();
        if (m !== 'ANY' && m !== method) continue;
        if (urlMatches(String(r.pattern ?? ''), url)) return r;
      }
      return null;
    }

    function record(data: Record<string, unknown>) {
      post({ source: HOOK_SRC, type: 'record', data });
    }

    function headersToObject(input: any): Record<string, string> {
      const out: Record<string, string> = {};
      if (!input) return out;
      try {
        if (typeof Headers !== 'undefined' && input instanceof Headers) {
          input.forEach((v, k) => {
            out[k] = v;
          });
        } else if (Array.isArray(input)) {
          for (const pair of input) out[String(pair[0])] = String(pair[1]);
        } else if (typeof input === 'object') {
          for (const k of Object.keys(input)) out[k] = String(input[k]);
        }
      } catch {
        /* ignore */
      }
      return out;
    }

    function parseRawHeaders(raw: string): Record<string, string> {
      const out: Record<string, string> = {};
      if (!raw) return out;
      for (const line of raw.split('\r\n')) {
        const i = line.indexOf(':');
        if (i > 0) out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
      }
      return out;
    }

    // ============================== fetch ==============================
    const nativeFetch: typeof fetch | null = window.fetch ? window.fetch.bind(window) : null;

    window.fetch = (async (input: any, init?: any) => {
      let url = '';
      try {
        if (typeof input === 'string') url = new URL(input, location.href).href;
        else if (input && typeof input.url === 'string') url = input.url;
        else url = String(input ?? '');
      } catch {
        url = String(input ?? '');
      }
      let method = 'GET';
      try {
        method = String(init?.method ?? input?.method ?? 'GET').toUpperCase();
      } catch {
        /* ignore */
      }

      const rule = findMockRule(url, method);
      if (rule) {
        const rawStatus = Number(rule.status) || 200;
        const delay = Math.max(0, Number(rule.delay) || 0);
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        record({
          url,
          method,
          mocked: true,
          timestamp: Date.now(),
          status: rawStatus,
          statusText: STATUS_TEXT[rawStatus] ?? '',
          requestHeaders: headersToObject(init?.headers),
          requestBody: typeof init?.body === 'string' ? init.body.slice(0, MAX_REQ_BODY) : undefined,
          responseHeaders: rule.contentType ? { 'content-type': rule.contentType } : {},
          responseBody: String(rule.body ?? '').slice(0, MAX_RESP_BODY),
        });
        if (rawStatus === 0) throw new TypeError('Failed to fetch (HiModify mock)');
        const headers: Record<string, string> = {};
        if (rule.contentType) headers['content-type'] = rule.contentType;
        try {
          return new Response(String(rule.body ?? ''), {
            status: Math.min(599, Math.max(200, rawStatus)),
            statusText: STATUS_TEXT[rawStatus] ?? '',
            headers,
          });
        } catch {
          return new Response(String(rule.body ?? ''), { status: 200, headers });
        }
      }

      if (!nativeFetch) throw new TypeError('fetch is not available');
      const response = await nativeFetch(input, init);
      if (config.recordingEnabled) {
        try {
          const clone = response.clone();
          clone
            .text()
            .then((text) => {
              const rh: Record<string, string> = {};
              try {
                clone.headers.forEach((v, k) => {
                  rh[k] = v;
                });
              } catch {
                /* ignore */
              }
              record({
                url,
                method,
                mocked: false,
                timestamp: Date.now(),
                status: response.status,
                statusText: response.statusText,
                requestHeaders: headersToObject(init?.headers),
                requestBody: typeof init?.body === 'string' ? init.body.slice(0, MAX_REQ_BODY) : undefined,
                responseHeaders: rh,
                responseBody: text.slice(0, MAX_RESP_BODY),
              });
            })
            .catch(() => {});
        } catch {
          /* ignore */
        }
      }
      return response;
    }) as typeof fetch;

    // ============================== XMLHttpRequest ==============================
    const NativeXHR = window.XMLHttpRequest;

    const PROXY_EVENTS = ['readystatechange', 'loadstart', 'progress', 'abort', 'error', 'timeout', 'load', 'loadend'];

    class HiModifyXHR extends EventTarget {
      static UNSENT = 0;
      static OPENED = 1;
      static HEADERS_RECEIVED = 2;
      static LOADING = 3;
      static DONE = 4;

      _real: XMLHttpRequest;
      _method = 'GET';
      _url = '';
      _async = true;
      _reqHeaders: Record<string, string> = {};
      _sentBody: string | undefined = undefined;
      _responseType = '';
      _mockRule: HookRule | null = null;
      _mocked = false;
      _errorMock = false;
      _mockStatus = 200;
      _mockBody = '';
      _mockHeaders: Record<string, string> = {};
      _mockTimer: ReturnType<typeof setTimeout> | null = null;
      _timeout = 0;
      _realWired = false;
      _handlers: Record<string, any> = {};

      constructor() {
        super();
        this._real = new NativeXHR();
      }

      get UNSENT() {
        return 0;
      }
      get OPENED() {
        return 1;
      }
      get HEADERS_RECEIVED() {
        return 2;
      }
      get LOADING() {
        return 3;
      }
      get DONE() {
        return 4;
      }

      get onreadystatechange(): any {
        return this._handlers.onreadystatechange ?? null;
      }
      set onreadystatechange(v: any) {
        this._handlers.onreadystatechange = v;
      }
      get onloadstart(): any {
        return this._handlers.onloadstart ?? null;
      }
      set onloadstart(v: any) {
        this._handlers.onloadstart = v;
      }
      get onprogress(): any {
        return this._handlers.onprogress ?? null;
      }
      set onprogress(v: any) {
        this._handlers.onprogress = v;
      }
      get onabort(): any {
        return this._handlers.onabort ?? null;
      }
      set onabort(v: any) {
        this._handlers.onabort = v;
      }
      get onerror(): any {
        return this._handlers.onerror ?? null;
      }
      set onerror(v: any) {
        this._handlers.onerror = v;
      }
      get ontimeout(): any {
        return this._handlers.ontimeout ?? null;
      }
      set ontimeout(v: any) {
        this._handlers.ontimeout = v;
      }
      get onload(): any {
        return this._handlers.onload ?? null;
      }
      set onload(v: any) {
        this._handlers.onload = v;
      }
      get onloadend(): any {
        return this._handlers.onloadend ?? null;
      }
      set onloadend(v: any) {
        this._handlers.onloadend = v;
      }

      get readyState() {
        return this._mocked ? 4 : this._real.readyState;
      }
      get response(): any {
        if (!this._mocked) return this._real.response;
        if (this._responseType === 'json') {
          try {
            return JSON.parse(this._mockBody);
          } catch {
            return null;
          }
        }
        return this._mockBody;
      }
      get responseText() {
        return this._mocked ? this._mockBody : this._real.responseText;
      }
      get responseType() {
        return this._responseType;
      }
      set responseType(v: any) {
        this._responseType = String(v ?? '');
        this._real.responseType = this._responseType as XMLHttpRequestResponseType;
      }
      get responseURL() {
        return this._mocked ? this._url : this._real.responseURL;
      }
      get responseXML() {
        return this._mocked ? null : this._real.responseXML;
      }
      get status() {
        return this._mocked ? (this._errorMock ? 0 : this._mockStatus) : this._real.status;
      }
      get statusText() {
        return this._mocked ? (this._errorMock ? '' : (STATUS_TEXT[this._mockStatus] ?? '')) : this._real.statusText;
      }
      get timeout() {
        return this._timeout;
      }
      set timeout(v: any) {
        this._timeout = Number(v) || 0;
        this._real.timeout = Number(v) || 0;
      }
      get withCredentials() {
        return this._real.withCredentials;
      }
      set withCredentials(v: any) {
        this._real.withCredentials = !!v;
      }
      get upload() {
        return this._real.upload;
      }

      open(method: string, url: string, async = true, username?: string | null, password?: string | null) {
        this._method = String(method ?? 'GET').toUpperCase();
        try {
          this._url = new URL(String(url), location.href).href;
        } catch {
          this._url = String(url ?? '');
        }
        this._async = async !== false;
        this._real.open(method, url, async !== false, username ?? undefined, password ?? undefined);
      }

      setRequestHeader(name: string, value: string) {
        this._reqHeaders[String(name)] = String(value);
        this._real.setRequestHeader(name, value);
      }

      getResponseHeader(name: string): string | null {
        if (this._mocked) {
          const key = String(name).toLowerCase();
          for (const [k, v] of Object.entries(this._mockHeaders)) {
            if (k.toLowerCase() === key) return v;
          }
          return null;
        }
        return this._real.getResponseHeader(name);
      }

      getAllResponseHeaders(): string {
        if (this._mocked) {
          const entries = Object.entries(this._mockHeaders);
          if (!entries.length) return '';
          return entries.map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n';
        }
        return this._real.getAllResponseHeaders();
      }

      overrideMimeType(mime: string) {
        this._real.overrideMimeType(mime);
      }

      abort() {
        if (this._mockTimer !== null) {
          clearTimeout(this._mockTimer);
          this._mockTimer = null;
        }
        if (this._mockRule) {
          this._mockRule = null;
          this._mocked = false;
          this._fire('abort');
          this._fire('loadend');
          return;
        }
        this._real.abort();
      }

      send(body?: any) {
        this._sentBody = typeof body === 'string' ? body.slice(0, MAX_REQ_BODY) : undefined;
        const rule = this._async ? findMockRule(this._url, this._method) : null;
        // 二进制/文档类型响应无法用文本模拟，透传真实请求
        if (rule && ['blob', 'arraybuffer', 'document'].indexOf(this._responseType) === -1) {
          this._startMock(rule);
          return;
        }
        if (!this._realWired) {
          this._realWired = true;
          this._wireNative();
          this._real.addEventListener('load', () => this._recordReal());
        }
        this._real.send(body);
      }

      _wireNative() {
        for (const type of PROXY_EVENTS) {
          this._real.addEventListener(type, (ev: any) => {
            if (this._mocked) return;
            let e: any;
            if (type === 'progress' || type === 'loadstart' || type === 'loadend') {
              try {
                e = new ProgressEvent(type, { loaded: ev.loaded ?? 0, total: ev.total ?? 0, lengthComputable: !!ev.lengthComputable });
              } catch {
                e = new Event(type);
              }
            } else {
              e = new Event(type);
            }
            try {
              this.dispatchEvent(e);
            } catch {
              /* ignore */
            }
            const h = this._handlers['on' + type];
            if (typeof h === 'function') {
              try {
                h.call(this, e);
              } catch (err) {
                console.error('[HiModify]', err);
              }
            }
          });
        }
      }

      _fire(type: string, progress?: { loaded: number; total: number }) {
        let e: any;
        try {
          e = progress ? new ProgressEvent(type, progress) : new Event(type);
        } catch {
          e = { type };
        }
        try {
          this.dispatchEvent(e);
        } catch {
          /* ignore */
        }
        const h = this._handlers['on' + type];
        if (typeof h === 'function') {
          try {
            h.call(this, e);
          } catch (err) {
            console.error('[HiModify]', err);
          }
        }
      }

      _startMock(rule: HookRule) {
        this._mockRule = rule;
        const delay = Math.max(0, Number(rule.delay) || 0);
        const rawStatus = Number(rule.status) || 200;
        this._mockHeaders = {};
        if (rule.contentType) this._mockHeaders['content-type'] = rule.contentType;
        // 模拟超时：规则延迟 >= xhr.timeout 时触发 ontimeout 而不是返回响应
        const timeoutExceeded = this._timeout > 0 && delay >= this._timeout;
        this._mockTimer = setTimeout(() => {
          this._mockTimer = null;
          if (!this._mockRule) return; // 已被 abort
          this._mocked = true;
          if (timeoutExceeded || rawStatus === 0) {
            this._errorMock = true;
            this._fire('readystatechange');
            if (timeoutExceeded) this._fire('timeout');
            else this._fire('error');
            this._fire('loadend');
            record({
              url: this._url,
              method: this._method,
              mocked: true,
              timestamp: Date.now(),
              status: 0,
              statusText: '',
              requestHeaders: { ...this._reqHeaders },
              requestBody: this._sentBody,
              responseHeaders: {},
              responseBody: '',
            });
            return;
          }
          this._mockStatus = Math.min(599, Math.max(200, rawStatus));
          this._mockBody = String(rule.body ?? '');
          const size = this._mockBody.length;
          this._fire('readystatechange');
          this._fire('progress', { loaded: size, total: size });
          this._fire('load');
          this._fire('loadend');
          record({
            url: this._url,
            method: this._method,
            mocked: true,
            timestamp: Date.now(),
            status: this._mockStatus,
            statusText: STATUS_TEXT[this._mockStatus] ?? '',
            requestHeaders: { ...this._reqHeaders },
            requestBody: this._sentBody,
            responseHeaders: { ...this._mockHeaders },
            responseBody: this._mockBody.slice(0, MAX_RESP_BODY),
          });
        }, delay);
      }

      _recordReal() {
        if (!config.recordingEnabled || this._mocked) return;
        const rt = this._responseType;
        let body = '';
        try {
          if (rt === '' || rt === 'text') body = String(this._real.responseText ?? '');
          else if (rt === 'json') body = JSON.stringify(this._real.response ?? null);
        } catch {
          /* ignore */
        }
        record({
          url: this._url,
          method: this._method,
          mocked: false,
          timestamp: Date.now(),
          status: this._real.status,
          statusText: this._real.statusText,
          requestHeaders: { ...this._reqHeaders },
          requestBody: this._sentBody,
          responseHeaders: parseRawHeaders(this._real.getAllResponseHeaders()),
          responseBody: body.slice(0, MAX_RESP_BODY),
        });
      }
    }

    window.XMLHttpRequest = HiModifyXHR as any;
  },
});
