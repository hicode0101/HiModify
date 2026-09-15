import { browser } from '#imports';
import type { HeaderSettings } from '@/types';
import { matchPatternToRegex } from './matching';

const RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
];

export interface SyncResult {
  ok: boolean;
  error?: string;
  ruleCount: number;
}

/**
 * 将 Header 规则整体同步到 declarativeNetRequest 动态规则。
 * 每条规则的每个 pattern 生成一条 DNR 规则（regexFilter 精确匹配）。
 */
export async function syncHeaderRules(settings: HeaderSettings): Promise<SyncResult> {
  const addRules: any[] = [];
  let nextId = 1;

  if (settings?.masterEnabled) {
    for (const rule of settings.rules ?? []) {
      if (!rule.enabled) continue;
      const reqMods = (rule.modifications ?? []).filter((m) => m.target === 'request' && m.name.trim());
      const resMods = (rule.modifications ?? []).filter((m) => m.target === 'response' && m.name.trim());
      if (!reqMods.length && !resMods.length) continue;

      for (const pattern of rule.patterns ?? []) {
        let regex: RegExp | null = null;
        try {
          regex = matchPatternToRegex(pattern);
        } catch {
          regex = null;
        }
        if (!regex || regex.source.length > 2000) continue;
        addRules.push({
          id: nextId++,
          priority: 1,
          condition: {
            regexFilter: regex.source,
            isUrlFilterCaseSensitive: false,
            resourceTypes: RESOURCE_TYPES,
          },
          action: {
            type: 'modifyHeaders',
            // Chrome 不允许 requestHeaders / responseHeaders 为空数组，仅在有修改项时携带
            ...(reqMods.length
              ? {
                  requestHeaders: reqMods.map((m) => ({
                    header: m.name.trim(),
                    operation: m.action,
                    ...(m.action === 'remove' ? {} : { value: m.value }),
                  })),
                }
              : {}),
            ...(resMods.length
              ? {
                  responseHeaders: resMods.map((m) => ({
                    header: m.name.trim(),
                    operation: m.action,
                    ...(m.action === 'remove' ? {} : { value: m.value }),
                  })),
                }
              : {}),
          },
        });
      }
    }
  }

  try {
    const existing = await browser.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((r: any) => r.id);
    await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
    return { ok: true, ruleCount: addRules.length };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e), ruleCount: 0 };
  }
}
