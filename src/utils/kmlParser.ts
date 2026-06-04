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
  /** 匝道二級索引: { 'R01-001': KmlRampPoint[] } — 按 rampId 分組並按 distFromRampStart 排序 */
  rampByRampId: Record<string, KmlRampPoint[]>;
  /** 所有主線點 (for GPS line building) */
  allMainlinePoints: KmlMainlinePoint[];
  /** 所有匝道點 */
  allRampPoints: KmlRampPoint[];
}

/**
 * 建立查詢索引，將 KmlPoint[] 按 (國道, 方向) 分桶並排序
 */
export function buildKmlIndex(points: KmlPoint[]): KmlIndex {
  const mainline: Record<string, Record<string, KmlMainlinePoint[]>> = {};
  const ramp: Record<string, KmlRampPoint[]> = {};
  const rampByRampId: Record<string, KmlRampPoint[]> = {};
  const allMainlinePoints: KmlMainlinePoint[] = [];
  const allRampPoints: KmlRampPoint[] = [];

  for (const pt of points) {
    if (pt.isRamp) {
      const rampPt = pt as KmlRampPoint;
      if (!ramp[rampPt.highway]) ramp[rampPt.highway] = [];
      ramp[rampPt.highway].push(rampPt);
      allRampPoints.push(rampPt);
      // 二級索引：按 rampId 分組
      if (rampPt.rampId) {
        if (!rampByRampId[rampPt.rampId]) rampByRampId[rampPt.rampId] = [];
        rampByRampId[rampPt.rampId].push(rampPt);
      }
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
  // 匝道二級索引按 distFromRampStart 排序（更精準的匝道內定位）
  for (const key of Object.keys(rampByRampId)) {
    rampByRampId[key].sort((a, b) => a.distFromRampStart - b.distFromRampStart);
  }

  return { mainline, ramp, rampByRampId, allMainlinePoints, allRampPoints };
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
  mode: 'auto' | 'mainline' | 'ramp' = 'auto'
): { point: KmlPoint | null; type: 'mainline' | 'ramp' | null } {
  if (mode === 'mainline') {
    const mainPtLoose = findNearestMainlinePoint(index, highway, direction, mileage, 500);
    if (mainPtLoose) return { point: mainPtLoose, type: 'mainline' };
    return { point: null, type: null };
  }

  if (mode === 'ramp') {
    const rampPtLoose = findNearestRampPoint(index, highway, mileage, 500);
    if (rampPtLoose) return { point: rampPtLoose, type: 'ramp' };
    return { point: null, type: null };
  }
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

// ── Haversine 距離 (公尺) ──────────────────────────────────────────
function haversineMeters(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── 方位角計算 (degree, 0=北, 順時鐘) ──────────────────────────────
function bearingDeg(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ── 兩個角度的最小夾角 (0~180) ──────────────────────────────────────
function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * 根據 KML 相鄰點計算某點的路段方位角（取前後點的平均方位角）
 */
function getSegmentBearing(
  pt: KmlPoint,
  sameLineArr: KmlPoint[],
): number | null {
  const idx = sameLineArr.indexOf(pt);
  if (idx === -1) return null;

  const prev = idx > 0 ? sameLineArr[idx - 1] : null;
  const next = idx < sameLineArr.length - 1 ? sameLineArr[idx + 1] : null;

  if (prev && next) {
    // 取前→後的方位角（沿里程遞增方向）
    return bearingDeg(prev.lon, prev.lat, next.lon, next.lat);
  } else if (next) {
    return bearingDeg(pt.lon, pt.lat, next.lon, next.lat);
  } else if (prev) {
    return bearingDeg(prev.lon, prev.lat, pt.lon, pt.lat);
  }
  return null;
}

// ── 里程增減 → 行車方向推斷（硬規則）──────────────────────────────
// 國道行車方向：里程遞增 = 南下/東向，里程遞減 = 北上/西向
const INCREASING_DIRS = ['南下車道', '東向車道'];
const DECREASING_DIRS = ['北上車道', '西向車道'];

function isDirectionConsistentWithDelta(direction: string, mileageDelta: number): boolean {
  if (mileageDelta > 0) return INCREASING_DIRS.includes(direction);
  if (mileageDelta < 0) return DECREASING_DIRS.includes(direction);
  return true; // delta === 0 → 無法判定，全部一致
}

/**
 * 從 GPS 經緯度，在所有主線(或匝道)點中找最近的，並透過鄰近點計算更精確的里程。
 * 
 * 利用多層訊號提升定位準確性：
 * 1. 里程增減推斷方向（最強 — 物理硬規則，里程增=南下/東向，減=北上/西向）
 * 2. GPS heading 與路段方位角比對（主線 + 匝道共用）
 * 3. 方向穩定性 hysteresis（主線）
 * 4. 匝道連續性 hysteresis（prevRampId — 避免跳匝道）
 * 5. 匝道 distFromRampStart 遞增一致性（行進方向檢查）
 *
 * @param prevMileage 上次定位的里程值，null 表示無歷史（用於推斷行車方向：里程增=南下/東向）
 * @param prevRampId 上次定位的匝道編號，null 表示不在匝道上
 * @param prevDistFromRampStart 上次匝道內距離，用於判斷匝道行進方向一致性
 */
export function findNearestPointByGps(
  index: KmlIndex,
  lon: number,
  lat: number,
  maxDistanceMeters = 500,
  mode: 'auto' | 'mainline' | 'ramp' = 'auto',
  heading: number | null = null,
  prevDirection: string | null = null,
  prevMileage: number | null = null,
  prevRampId: string | null = null,
  prevDistFromRampStart: number | null = null,
): { point: KmlPoint; distanceM: number; exactMileage: number } | null {
  let pointsToSearch: KmlPoint[] = [];
  
  if (mode === 'ramp') {
    pointsToSearch = index.allRampPoints;
  } else if (mode === 'mainline') {
    pointsToSearch = index.allMainlinePoints;
  } else {
    // auto 預設先看所有點，找出最近的
    pointsToSearch = [...index.allMainlinePoints, ...index.allRampPoints];
  }

  if (pointsToSearch.length === 0) return null;

  // ── 1. 收集 top-N 候選點（距離在最近點的 2 倍或 80m 以內）──
  const candidates: { pt: KmlPoint; dist: number; idx: number }[] = [];
  for (let i = 0; i < pointsToSearch.length; i++) {
    const pt = pointsToSearch[i];
    const d = haversineMeters(lon, lat, pt.lon, pt.lat);
    if (d <= maxDistanceMeters) {
      candidates.push({ pt, dist: d, idx: i });
    }
  }

  if (candidates.length === 0) return null;

  // 排序，取最近的 top-N
  candidates.sort((a, b) => a.dist - b.dist);
  const closestDist = candidates[0].dist;
  // 候選範圍：最近距離 × 2 或 80m 內，至少取 top 20
  const candidateThreshold = Math.max(closestDist * 2, 80);
  const topCandidates = candidates.filter(c => c.dist <= candidateThreshold).slice(0, 20);

  // ── 2. 里程增減硬規則 + heading + 穩定性綜合評分 ──
  let bestCandidate = topCandidates[0];

  // 里程增減是否可用（需要有上次里程紀錄）
  const hasPrevMileage = prevMileage !== null;
  const hasHeading = heading !== null && !isNaN(heading);
  const hasPrevRamp = prevRampId !== null && prevRampId !== '';
  const hasPrevRampDist = prevDistFromRampStart !== null;
  const needsScoring = topCandidates.length > 1 && (hasPrevMileage || hasHeading || prevDirection || hasPrevRamp);

  if (needsScoring) {
    let bestScore = Infinity;

    for (const cand of topCandidates) {
      const pt = cand.pt;
      
      // 取得該點所屬的同方向/同匝道排序陣列
      let lineArr: KmlPoint[] = [];
      if (pt.isRamp) {
        const rampPt = pt as KmlRampPoint;
        // 優先用 rampByRampId（同一匝道的點序列），fallback 到 highway 級
        if (rampPt.rampId && index.rampByRampId[rampPt.rampId]) {
          lineArr = index.rampByRampId[rampPt.rampId];
        } else if (index.ramp[pt.highway]) {
          lineArr = index.ramp[pt.highway];
        }
      } else if (index.mainline[pt.highway]?.[pt.direction]) {
        lineArr = index.mainline[pt.highway][pt.direction] as KmlPoint[];
      }

      // ── A. 里程增減方向一致性（最強訊號，僅主線）──
      // 里程增加 → 必定南下/東向；里程減少 → 必定北上/西向
      let mileageDirPenalty = 0;
      if (hasPrevMileage && !pt.isRamp) {
        const delta = pt.mileage - prevMileage!;
        // 只有移動距離 >50m 才算有意義，避免 GPS 飄移噪聲
        if (Math.abs(delta) > 50) {
          const consistent = isDirectionConsistentWithDelta(pt.direction, delta);
          mileageDirPenalty = consistent ? 0 : 1; // 不一致 → 重罰
        }
      }

      // ── A2. 匝道 distFromRampStart 行進方向一致性 ──
      // 若上次也在匝道上且有 distFromRampStart，檢查是否在同一匝道上連續行進
      let rampDirPenalty = 0;
      if (pt.isRamp && hasPrevRamp && hasPrevRampDist) {
        const rampPt = pt as KmlRampPoint;
        if (rampPt.rampId === prevRampId) {
          // 同一匝道，distFromRampStart 應該單調遞增（正常行駛）
          const distDelta = rampPt.distFromRampStart - prevDistFromRampStart!;
          // 回頭行駛（距離遞減超過 10m）→ 輕微懲罰（不像主線那麼嚴格，匝道較短）
          if (distDelta < -10) {
            rampDirPenalty = 0.3;
          }
        }
      }

      // ── B. GPS heading 與路段方位角一致性（主線+匝道共用）──
      let headingScore = 0;
      if (hasHeading) {
        const segBearing = lineArr.length > 1 ? getSegmentBearing(pt, lineArr) : null;
        if (segBearing !== null) {
          const diff = angleDiff(heading!, segBearing);
          const alignDiff = Math.min(diff, Math.abs(180 - diff)); // 0 = 完美對齊, 90 = 垂直
          headingScore = alignDiff / 90;
        }
      }

      // ── C. 距離分數 ──
      const distScore = cand.dist / candidateThreshold;

      // ── D. 方向穩定性 / 匝道連續性 (hysteresis) ──
      let stabilityBonus = 0;
      if (pt.isRamp) {
        // 匝道連續性：如果上次也在同一匝道，給予 bonus 避免跳匝道
        if (hasPrevRamp && (pt as KmlRampPoint).rampId === prevRampId) {
          stabilityBonus = -0.15; // 比主線方向穩定性更強，匝道短小容易跳
        }
      } else {
        // 主線方向穩定性
        if (prevDirection && pt.direction === prevDirection) {
          stabilityBonus = -0.1;
        }
      }

      // ── 綜合評分 ──
      // 里程方向/匝道行進   35%（硬規則）
      // heading             25%
      // 距離                25%
      // 穩定性/匝道連續     15%
      const dirPenalty = pt.isRamp ? rampDirPenalty : mileageDirPenalty;
      const score = dirPenalty * 0.35
                  + headingScore * 0.25
                  + distScore * 0.25
                  + stabilityBonus;

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }
  }

  const bestPt = bestCandidate.pt;
  const bestDist = bestCandidate.dist;

  // ── 3. 精準里程內插 ──
  // 匝道使用 rampByRampId（同一匝道內的點序列更連續、更精準）
  let sameLineArr: KmlPoint[] = [];
  if (bestPt.isRamp) {
    const rampPt = bestPt as KmlRampPoint;
    if (rampPt.rampId && index.rampByRampId[rampPt.rampId]) {
      sameLineArr = index.rampByRampId[rampPt.rampId];
    } else if (index.ramp[bestPt.highway]) {
      sameLineArr = index.ramp[bestPt.highway];
    }
  } else if (index.mainline[bestPt.highway] && index.mainline[bestPt.highway][bestPt.direction]) {
    sameLineArr = index.mainline[bestPt.highway][bestPt.direction] as KmlPoint[];
  }

  let exactMileage = bestPt.mileage;

  if (sameLineArr.length > 1) {
    const idx = sameLineArr.findIndex(p => p === bestPt);
    if (idx !== -1) {
      const prev = idx > 0 ? sameLineArr[idx - 1] : null;
      const next = idx < sameLineArr.length - 1 ? sameLineArr[idx + 1] : null;

      let partner: KmlPoint | null = null;
      if (prev && next) {
        const distPrev = haversineMeters(lon, lat, prev.lon, prev.lat);
        const distNext = haversineMeters(lon, lat, next.lon, next.lat);
        partner = distPrev < distNext ? prev : next;
      } else {
        partner = prev || next;
      }

      if (partner) {
        const dx = partner.lon - bestPt.lon;
        const dy = partner.lat - bestPt.lat;
        const segLenSq = dx * dx + dy * dy;

        if (segLenSq > 1e-12) {
          const vx = lon - bestPt.lon;
          const vy = lat - bestPt.lat;
          let t = (vx * dx + vy * dy) / segLenSq;
          t = Math.max(0, Math.min(1, t));
          exactMileage = bestPt.mileage + t * (partner.mileage - bestPt.mileage);
        }
      }
    }
  }

  return { point: bestPt, distanceM: bestDist, exactMileage };
}
