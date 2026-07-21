import type { RampSegment } from '../types';

/**
 * 取得匝道的群組識別碼，優先順序：rampId > rampName > id
 * 統一管理，避免各處重複定義邏輯不一致
 */
export const getRampGroupId = (r: Pick<RampSegment, 'rampId' | 'rampName' | 'id'>): string =>
  r.rampId || r.rampName || r.id;

/**
 * 產生唯一 ID，使用 crypto.randomUUID()（若不支援則 fallback）
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 9);
  }
  return Math.random().toString(36).substring(2, 11);
};
