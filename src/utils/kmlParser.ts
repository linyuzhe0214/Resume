/**
 * KML 解析引擎 — 從 route.kml 擷取所有 Point Placemark 並建立查詢索引
 *
 * KML 結構:
 *   Folder(N0010中) → Folder(主線) → Folder(往北/往南) → Placemark(Point)
 *   Folder(N0010中) → Folder(匝道) → Folder(...) → Placemark(Point)
 *
 * 判定主線/匝道:
 *   - schemaUrl 包含 '匝道' → 匝道
 *   - 否則 → 主線
 */

// ── 國道名稱映射 (KML → App) ──────────────────────────────────────
const HIGHWAY_NAME_MAP: Record<string, string> = {
  '國道一號': '國道1號',
  '國道二號': '國道2號',
  '國道三號': '國道3號',
  '國道三甲': '國道3甲',
  '國道四號': '國道4號',
  '國道五號': '國道5號',
  '國道六號': '國道6號',
  '國道八號': '國道8號',
  '國道十號': '國道10號',
};

// ── 方向映射 (KML → App direction state) ──────────────────────────
const DIRECTION_MAP: Record<string, string> = {
  '往南': '南下車道',
  '往北': '北上車道',
  '往東': '東向車道',
  '往西': '西向車道',
};

export const DIRECTION_REVERSE_MAP: Record<string, string> = {
  '南下車道': '往南',
  '北上車道': '往北',
  '東向車道': '往東',
  '西向車道': '往西',
};

// ── 型別定義 ──────────────────────────────────────────────────────

/** 主線測量點 */
export interface KmlMainlinePoint {
  isRamp: false;
  highway: string;       // App 格式: '國道1號'
  direction: string;     // App 格式: '南下車道'
  mileage: number;       // 純數字 (如 166400)
  stakeNo: string;       // 原始樁號 (如 '166K+400')
  roadType: string;      // 道路型式: 路堤/橋梁/隧道
  pavementType: string;  // 鋪面種類: 柔性/剛性
  roadWidth: number;     // 路幅寬
  fullRoadWidth: number; // 全路幅寬
  laneCount: number;     // 車道數
  laneWidths: number[];  // [車道1寬, 車道2寬, ...]
  hasChannelization: boolean; // 槽化區
  channelizationWidth: number;
  hasInnerShoulder: boolean;  // 內路肩
  innerShoulderWidth: number;
  hasOuterShoulder: boolean;  // 外路肩
  outerShoulderWidth: number;
  auxiliaryLanes: { name: string; width: number }[];  // 輔助車道
  hasPullover: boolean;       // 避車彎
  curvatureRadius: number;    // 曲率半徑
  longitudinalSlope: number;  // 縱向坡度
  lateralSlope: number;       // 橫向坡度
  lon: number;
  lat: number;
}

/** 匝道測量點 */
export interface KmlRampPoint {
  isRamp: true;
  highway: string;
  direction: string;
  mileage: number;
  stakeNo: string;
  rampId: string;          // 匝道編號
  rampIdOld: string;       // 匝道編號(舊)
  interchangeName: string; // 交流道名稱
  rampDescription: string; // 匝道中文描述
  entryExit: string;       // 出入國道: 出/入
  pavementType: string;
  distFromRampStart: number; // 與匝道起點距離
  roadWidth: number;
  laneCount: number;
  laneWidths: number[];
  hasChannelization: boolean;
  channelizationWidth: number;
  curvatureRadius: number;
  longitudinalSlope: number;
  lateralSlope: number;
  lon: number;
  lat: number;
}

export type KmlPoint = KmlMainlinePoint | KmlRampPoint;

// ── 輔助工具 ──────────────────────────────────────────────────────

function getSimpleData(schemaData: Element, name: string): string {
  const items = schemaData.getElementsByTagName('SimpleData');
  for (let i = 0; i < items.length; i++) {
    if (items[i].getAttribute('name') === name) {
      return items[i].textContent?.trim() || '';
    }
  }
  return '';
}

function parseNum(val: string): number {
  if (!val || val === 'NULL' || val === 'null') return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function normalizeHighway(kmlName: string): string {
  return HIGHWAY_NAME_MAP[kmlName] || kmlName;
}

function normalizeDirection(kmlDir: string): string {
  return DIRECTION_MAP[kmlDir] || kmlDir;
}

// ── 核心解析 ──────────────────────────────────────────────────────

function parsePlacemark(placemark: Element): KmlPoint | null {
  // 取得 SchemaData
  const schemaDataEl = placemark.getElementsByTagName('SchemaData')[0];
  if (!schemaDataEl) return null;

  const schemaUrl = schemaDataEl.getAttribute('schemaUrl') || '';
  const isRamp = schemaUrl.includes('匝道');

  // 取得座標
  const coordsEl = placemark.getElementsByTagName('coordinates')[0];
  if (!coordsEl?.textContent) return null;
  const [lonStr, latStr] = coordsEl.textContent.trim().split(',');
  const lon = parseFloat(lonStr);
  const lat = parseFloat(latStr);
  if (isNaN(lon) || isNaN(lat)) return null;

  const highway = normalizeHighway(getSimpleData(schemaDataEl, '國道名稱'));
  const direction = normalizeDirection(getSimpleData(schemaDataEl, '方向'));
  const mileage = parseNum(getSimpleData(schemaDataEl, '里程'));
  const stakeNo = getSimpleData(schemaDataEl, '樁號');
  const roadWidth = parseNum(getSimpleData(schemaDataEl, '路幅寬'));
  const laneCount = Math.floor(parseNum(getSimpleData(schemaDataEl, '車道數')));
  const pavementType = getSimpleData(schemaDataEl, '鋪面種類');

  // 車道寬
  const laneWidths: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const w = parseNum(getSimpleData(schemaDataEl, `車道${i}寬`));
    if (w > 0) laneWidths.push(w);
  }

  // 槽化區
  const channelStr = getSimpleData(schemaDataEl, '槽化區');
  const hasChannelization = channelStr === '有';
  const channelizationWidth = parseNum(getSimpleData(schemaDataEl, '槽化區寬'));

  // 曲率與坡度
  const curvatureRadius = parseNum(getSimpleData(schemaDataEl, '曲率半徑'));
  const longitudinalSlope = parseNum(getSimpleData(schemaDataEl, '縱向坡度'));
  const lateralSlope = parseNum(getSimpleData(schemaDataEl, '橫向坡度'));

  if (isRamp) {
    return {
      isRamp: true,
      highway,
      direction,
      mileage,
      stakeNo,
      rampId: getSimpleData(schemaDataEl, '匝道編號'),
      rampIdOld: getSimpleData(schemaDataEl, '匝道編號 (舊)') || getSimpleData(schemaDataEl, '匝道編號 ('),
      interchangeName: getSimpleData(schemaDataEl, '交流道名稱'),
      rampDescription: getSimpleData(schemaDataEl, '匝道中文描述') || getSimpleData(schemaDataEl, '匝道中文描'),
      entryExit: getSimpleData(schemaDataEl, '出入國道'),
      pavementType,
      distFromRampStart: parseNum(getSimpleData(schemaDataEl, '與匝道起點距離') || getSimpleData(schemaDataEl, '與匝道起點')),
      roadWidth,
      laneCount,
      laneWidths,
      hasChannelization,
      channelizationWidth,
      curvatureRadius,
      longitudinalSlope,
      lateralSlope,
      lon,
      lat,
    };
  } else {
    // 內路肩
    const innerStr = getSimpleData(schemaDataEl, '內路肩');
    const hasInnerShoulder = innerStr === '有';
    const innerShoulderWidth = parseNum(getSimpleData(schemaDataEl, '內路肩寬'));

    // 外路肩
    const outerStr = getSimpleData(schemaDataEl, '外路肩');
    const hasOuterShoulder = outerStr === '有';
    const outerShoulderWidth = parseNum(getSimpleData(schemaDataEl, '外路肩寬'));

    // 輔助車道
    const auxiliaryLanes: { name: string; width: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const nameKey1 = `輔助車道${i}`;
      const widthKey1 = `輔助車道${i}寬`;
      const widthKey2 = `輔助車道${i}_1`;
      const auxName = getSimpleData(schemaDataEl, nameKey1);
      const auxWidth = parseNum(getSimpleData(schemaDataEl, widthKey1) || getSimpleData(schemaDataEl, widthKey2));
      if (auxName && auxName !== '無' && auxWidth > 0) {
        auxiliaryLanes.push({ name: auxName, width: auxWidth });
      }
    }

    // 避車彎
    const hasPullover = getSimpleData(schemaDataEl, '避車彎') === '有';

    const fullRoadWidth = parseNum(getSimpleData(schemaDataEl, '全路幅寬'));
    const roadType = getSimpleData(schemaDataEl, '道路型式');

    return {
      isRamp: false,
      highway,
      direction,
      mileage,
      stakeNo,
      roadType,
      pavementType,
      roadWidth,
      fullRoadWidth: fullRoadWidth || roadWidth,
      laneCount,
      laneWidths,
      hasChannelization,
      channelizationWidth,
      hasInnerShoulder,
      innerShoulderWidth,
      hasOuterShoulder,
      outerShoulderWidth,
      auxiliaryLanes,
      hasPullover,
      curvatureRadius,
      longitudinalSlope,
      lateralSlope,
      lon,
      lat,
    };
  }
}

/**
 * 解析整個 KML 文字為 KmlPoint 陣列
 */
export function parseKmlToPoints(kmlText: string): KmlPoint[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
  const placemarks = xmlDoc.getElementsByTagName('Placemark');

  const points: KmlPoint[] = [];
  for (let i = 0; i < placemarks.length; i++) {
    // 只處理有 Point 的 Placemark（排除 LineString）
    const pointEl = placemarks[i].getElementsByTagName('Point')[0];
    if (!pointEl) continue;

    const pt = parsePlacemark(placemarks[i]);
    if (pt && pt.mileage > 0) {
      points.push(pt);
    }
  }

  return points;
}

// ── 查詢索引 ──────────────────────────────────────────────────────

export interface KmlIndex {
  /** 主線索引: { '國道1號': { '北上車道': [sortedByMileage], '南下車道': [...] } } */
  mainline: Record<string, Record<string, KmlMainlinePoint[]>>;
  /** 匝道索引: { '國道1號': KmlRampPoint[] } */
  ramp: Record<string, KmlRampPoint[]>;
  /** 所有主線點 (for GPS line building) */
  allMainlinePoints: KmlMainlinePoint[];
}

/**
 * 建立查詢索引，將 KmlPoint[] 按 (國道, 方向) 分桶並排序
 */
export function buildKmlIndex(points: KmlPoint[]): KmlIndex {
  const mainline: Record<string, Record<string, KmlMainlinePoint[]>> = {};
  const ramp: Record<string, KmlRampPoint[]> = {};
  const allMainlinePoints: KmlMainlinePoint[] = [];

  for (const pt of points) {
    if (pt.isRamp) {
      const rampPt = pt as KmlRampPoint;
      if (!ramp[rampPt.highway]) ramp[rampPt.highway] = [];
      ramp[rampPt.highway].push(rampPt);
    } else {
      const mainPt = pt as KmlMainlinePoint;
      if (!mainline[mainPt.highway]) mainline[mainPt.highway] = {};
      if (!mainline[mainPt.highway][mainPt.direction]) mainline[mainPt.highway][mainPt.direction] = [];
      mainline[mainPt.highway][mainPt.direction].push(mainPt);
      allMainlinePoints.push(mainPt);
    }
  }

  // 排序所有桶 by mileage
  for (const hw of Object.values(mainline)) {
    for (const dir of Object.keys(hw)) {
      hw[dir].sort((a, b) => a.mileage - b.mileage);
    }
  }
  for (const key of Object.keys(ramp)) {
    ramp[key].sort((a, b) => a.mileage - b.mileage);
  }

  return { mainline, ramp, allMainlinePoints };
}

/**
 * 在已排序的主線點陣列中，用二分搜尋找到最接近目標里程的點
 */
function binarySearchNearest(arr: KmlMainlinePoint[], targetMileage: number): KmlMainlinePoint | null {
  if (arr.length === 0) return null;

  let lo = 0;
  let hi = arr.length - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid].mileage < targetMileage) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // lo 是第一個 >= targetMileage 的元素
  // 比較 lo 和 lo-1 誰更近
  if (lo === 0) return arr[0];
  const prev = arr[lo - 1];
  const curr = arr[lo];
  return Math.abs(prev.mileage - targetMileage) <= Math.abs(curr.mileage - targetMileage) ? prev : curr;
}

/**
 * 根據國道 + 方向 + 里程，查找最近的主線測量點
 * @param tolerance 容許誤差（公尺），超過此距離回傳 null
 */
export function findNearestMainlinePoint(
  index: KmlIndex,
  highway: string,
  direction: string,
  mileage: number,
  tolerance = 100,
): KmlMainlinePoint | null {
  const hwData = index.mainline[highway];
  if (!hwData) return null;

  const dirData = hwData[direction];
  if (!dirData || dirData.length === 0) return null;

  const nearest = binarySearchNearest(dirData, mileage);
  if (!nearest) return null;

  // 檢查容許誤差
  if (Math.abs(nearest.mileage - mileage) > tolerance) return null;

  return nearest;
}

/**
 * 在匝道點中，根據國道 + 里程 + 方向 查找最近的匝道點
 * 匝道不一定有明確方向區分，所以用里程+國道來找
 */
export function findNearestRampPoint(
  index: KmlIndex,
  highway: string,
  mileage: number,
  tolerance = 200,
): KmlRampPoint | null {
  const rampData = index.ramp[highway];
  if (!rampData || rampData.length === 0) return null;

  let best: KmlRampPoint | null = null;
  let bestDist = Infinity;

  for (const pt of rampData) {
    const dist = Math.abs(pt.mileage - mileage);
    if (dist < bestDist) {
      bestDist = dist;
      best = pt;
    }
  }

  if (best && bestDist <= tolerance) return best;
  return null;
}

/**
 * 綜合查詢：先查主線，若未命中再查匝道
 * 回傳 { point, type: 'mainline'|'ramp'|null }
 */
export function findNearestPoint(
  index: KmlIndex,
  highway: string,
  direction: string,
  mileage: number,
): { point: KmlPoint | null; type: 'mainline' | 'ramp' | null } {
  // 先查主線
  const mainPt = findNearestMainlinePoint(index, highway, direction, mileage, 50);
  if (mainPt) return { point: mainPt, type: 'mainline' };

  // 主線沒找到（可能在匝道區域），查匝道
  const rampPt = findNearestRampPoint(index, highway, mileage, 200);
  if (rampPt) return { point: rampPt, type: 'ramp' };

  // 放寬主線容許誤差再找一次
  const mainPtLoose = findNearestMainlinePoint(index, highway, direction, mileage, 500);
  if (mainPtLoose) return { point: mainPtLoose, type: 'mainline' };

  return { point: null, type: null };
}
