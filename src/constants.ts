export const HIGHWAY_INTERCHANGE_MAP: Record<string, string[]> = {
  '國道1號': ['豐原交流道', '大雅系統', '大雅交流道', '台中交流道', '南屯交流道', '王田交流道'],
  '國道3號': ['彰化系統', '和美交流道'],
  '國道4號': ['后豐交流道', '豐勢交流道', '潭子交流道', '潭子系統']
};

export const HIGHWAYS = Object.keys(HIGHWAY_INTERCHANGE_MAP);

/** 各國道主線里程限制（單位：公尺）。起點里程 = 最小允許值，終點里程 = 最大允許值
 *  請依實際管轄路段調整此設定 */
export const HIGHWAY_MILEAGE_LIMITS: Record<string, { min: number; max: number }> = {
  '國道1號': { min: 166427, max: 192000 }, // 166k+427 ~ 192k+000
  '國道3號': { min: 183587, max: 198217 }, // 183k+587 ~ 198k+217
  '國道4號': { min: 10982,  max: 27321  }, // 10k+982  ~ 27k+321
};
