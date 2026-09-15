const PATTERN_RE = /^(\*|https?|wss?):\/\/([^/]*)(\/.*)$/i;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 将 Match Pattern 转换为正则（用于 DNR regexFilter 与页面内 Mock 匹配）。
 * 非法 pattern 抛出异常；空字符串返回 null。
 */
export function matchPatternToRegex(pattern: string): RegExp | null {
  const p = pattern.trim();
  if (!p) return null;
  const m = PATTERN_RE.exec(p);
  if (!m || !m[1] || !m[2] || !m[3]) throw new Error(`无法解析的匹配规则：${p}`);
  const scheme = m[1].toLowerCase();
  const host = m[2];
  const path = m[3];
  if (!host) throw new Error(`匹配规则缺少主机：${p}`);
  const schemeRe = scheme === '*' ? 'https?' : scheme;
  let hostRe: string;
  if (host === '*') hostRe = '[^/]+';
  else if (host.startsWith('*.')) hostRe = '(?:[^/]+\\.)?' + escapeRegex(host.slice(2));
  else hostRe = escapeRegex(host);
  const pathRe = escapeRegex(path).replace(/\\\*/g, '.*');
  return new RegExp(`^${schemeRe}://${hostRe}${pathRe}$`, 'i');
}

/** 校验 pattern，合法返回 null，非法返回错误信息 */
export function validatePattern(pattern: string): string | null {
  if (!pattern.trim()) return null;
  try {
    matchPatternToRegex(pattern);
    return null;
  } catch (e: any) {
    return e?.message ?? String(e);
  }
}

/**
 * URL 匹配：
 * - 含 "://" 时按 Match Pattern 精确匹配
 * - 否则按纯文本包含匹配（忽略大小写）
 */
export function urlMatches(pattern: string, url: string): boolean {
  const p = pattern.trim();
  if (!p) return false;
  if (p.includes('://')) {
    try {
      return matchPatternToRegex(p)!.test(url);
    } catch {
      return false;
    }
  }
  return url.toLowerCase().includes(p.toLowerCase());
}
