export type HeaderTarget = 'request' | 'response';
export type HeaderAction = 'set' | 'append' | 'remove';

export interface HeaderModification {
  id: string;
  target: HeaderTarget;
  action: HeaderAction;
  name: string;
  value: string;
}

export interface HeaderRule {
  id: string;
  name: string;
  enabled: boolean;
  /** Match Pattern 列表，例如 "*://*.example.com/*" */
  patterns: string[];
  modifications: HeaderModification[];
  createdAt: number;
}

export interface HeaderSettings {
  masterEnabled: boolean;
  rules: HeaderRule[];
}

export type MockMethod = 'ANY' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const METHOD_OPTIONS: MockMethod[] = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export interface MockRule {
  id: string;
  name: string;
  enabled: boolean;
  /** URL 匹配：Match Pattern / 完整 URL / 纯文本包含匹配 */
  pattern: string;
  method: MockMethod;
  /** 0 表示模拟网络错误 */
  status: number;
  /** 响应延迟（毫秒） */
  delay: number;
  contentType: string;
  body: string;
  createdAt: number;
}

export interface MockSettings {
  masterEnabled: boolean;
  recordingEnabled: boolean;
  rules: MockRule[];
}

export interface RecordedRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseHeaders: Record<string, string>;
  responseBody: string;
  /** 该响应是否来自 Mock */
  mocked: boolean;
  timestamp: number;
}

export const DEFAULT_HEADER_SETTINGS: HeaderSettings = { masterEnabled: true, rules: [] };
export const DEFAULT_MOCK_SETTINGS: MockSettings = { masterEnabled: false, recordingEnabled: false, rules: [] };

export const HISTORY_LIMIT = 100;

export const AUTHOR = 'hicode0101';
export const PROJECT_URL = 'https://github.com/hicode0101/HiTools';
