import { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import {
  parseKmlToPoints,
  buildKmlIndex,
  findNearestPoint,
  findNearestPointByGps,
  type KmlIndex,
  type KmlPoint,
  type KmlRampPoint,
} from '../utils/kmlParser';
import { getIdbItem, setIdbItem } from '../utils/idbCache';

export type SearchMode = 'auto' | 'mainline' | 'ramp';

export function useGeolocationSync() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'error'>('locating');
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // KML 相關
  const [kmlIndex, setKmlIndex] = useState<KmlIndex | null>(null);
  const [kmlLoading, setKmlLoading] = useState(true);
  // highwayLine 保留給未來地圖繪圖用
  const [highwayLine, setHighwayLine] = useState<Feature<LineString> | null>(null);
  const [currentKmlPoint, setCurrentKmlPoint] = useState<KmlPoint | null>(null);
  const [currentKmlType, setCurrentKmlType] = useState<'mainline' | 'ramp' | null>(null);

  // 定位狀態
  const [highwayName, setHighwayName] = useState<string>('國道1號');
  const [mileage, setMileage] = useState<number>(166500);
  const [direction, setDirection] = useState<string>('北上車道');
  const [searchMode, setSearchMode] = useState<SearchMode>('auto');
  const [autoTracking, setAutoTracking] = useState(true);

  // 用 ref 追蹤最新方向，給 watchPosition callback 讀取（避免 effect 依賴 direction）
  const directionRef = useRef(direction);
  useEffect(() => { directionRef.current = direction; }, [direction]);

  // 追蹤上次里程，用於計算里程增減方向（硬規則：增=南下/東向，減=北上/西向）
  const prevMileageRef = useRef<number | null>(null);
  const prevHighwayRef = useRef<string | null>(null);

  // 追蹤上次匝道資訊，用於匝道連續性 hysteresis 和行進方向一致性
  const prevRampIdRef = useRef<string | null>(null);
  const prevDistFromRampStartRef = useRef<number | null>(null);

  // ── 1. 載入 KML / JSON 資料庫（支援 IndexedDB 本地快取秒開）──
  useEffect(() => {
    let isMounted = true;

    const initIndex = (points: KmlPoint[]) => {
      if (!isMounted) return;
      const index = buildKmlIndex(points);
      setKmlIndex(index);

      // 建立第一條國道的 LineString 備用（地圖繪圖）
      for (const hw of Object.keys(index.mainline)) {
        const dirs = Object.values(index.mainline[hw]);
        if (dirs.length > 0 && dirs[0].length >= 2) {
          const coords = dirs[0].map(p => [p.lon, p.lat]);
          setHighwayLine(turf.lineString(coords));
          break;
        }
      }
      console.log(`路網資料庫載入完成: ${points.length} 個測量點`);
    };

    const loadRouteData = async () => {
      setKmlLoading(true);
      try {
        const CACHE_KEY = 'highway_route_points_v1';
        // 1. 優先從 IndexedDB 毫秒級讀取
        const cached = await getIdbItem<KmlPoint[]>(CACHE_KEY);
        if (cached && Array.isArray(cached) && cached.length > 0) {
          initIndex(cached);
          setKmlLoading(false);
          return;
        }

        const basePath = (import.meta as any).env?.BASE_URL || '/';
        const jsonPath = basePath.endsWith('/') ? `${basePath}route.json` : `${basePath}/route.json`;
        const kmlPath = basePath.endsWith('/') ? `${basePath}route.kml` : `${basePath}/route.kml`;

        let points: KmlPoint[] = [];

        // 2. 優先下載預編譯 route.json（極速解析，避免 DOMParser 阻塞）
        try {
          const res = await fetch(jsonPath);
          if (res.ok) {
            points = await res.json();
          }
        } catch {
          // 若 JSON 不存在或解析失敗則 fallback
        }

        // 3. Fallback 回 KML 解析
        if (!points || points.length === 0) {
          const res = await fetch(kmlPath);
          const kmlText = await res.text();
          points = parseKmlToPoints(kmlText);
        }

        if (points && points.length > 0) {
          initIndex(points);
          // 寫入 IndexedDB 供後續存取
          setIdbItem(CACHE_KEY, points);
        }
      } catch (err) {
        console.error('Failed to load local routing database:', err);
      } finally {
        if (isMounted) setKmlLoading(false);
      }
    };

    loadRouteData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── 2. 手動定位時（非 GPS 自動跟隨）查 KML 最近點 ──
  useEffect(() => {
    if (!kmlIndex) {
      setCurrentKmlPoint(null);
      setCurrentKmlType(null);
      return;
    }
    if (autoTracking) return; // GPS 模式下由 watchPosition 直接更新，不需要這裡查

    const result = findNearestPoint(kmlIndex, highwayName, direction, mileage, searchMode);
    setCurrentKmlPoint(result.point);
    setCurrentKmlType(result.type);
  }, [kmlIndex, highwayName, direction, mileage, searchMode, autoTracking]);

  // ── 3. GPS watchPosition — 以 Haversine 直找最近 KML 點 ──
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setLocation(pos);
        setAccuracy(pos.coords.accuracy);
        setGpsStatus('active');

        if (!autoTracking) return;

        if (kmlIndex && kmlIndex.allMainlinePoints.length > 0) {
          // 取得 GPS heading（行進方向），用於區分南下/北上車道
          const gpsHeading = (pos.coords.heading !== null && pos.coords.heading !== undefined && !isNaN(pos.coords.heading))
            ? pos.coords.heading
            : null;

          const result = findNearestPointByGps(
            kmlIndex,
            pos.coords.longitude,
            pos.coords.latitude,
            500,
            searchMode,
            gpsHeading,
            directionRef.current,
            prevMileageRef.current, // 傳入上次里程，用於推斷行車方向
            prevRampIdRef.current,  // 傳入上次匝道編號，用於匝道連續性
            prevDistFromRampStartRef.current, // 傳入上次匝道距離
            prevHighwayRef.current, // 傳入上次國道別
          );
          if (result) {
            const { point, exactMileage } = result;
            setCurrentKmlPoint(point);
            setCurrentKmlType(point.isRamp ? 'ramp' : 'mainline');
            const roundedMileage = Math.round(exactMileage);
            prevMileageRef.current = roundedMileage; // 更新上次里程
            prevHighwayRef.current = point.highway; // 更新上次國道別
            // 更新匝道追蹤狀態
            if (point.isRamp) {
              const rp = point as KmlRampPoint;
              prevRampIdRef.current = rp.rampId || null;
              prevDistFromRampStartRef.current = rp.distFromRampStart;
            } else {
              prevRampIdRef.current = null;
              prevDistFromRampStartRef.current = null;
            }
            setMileage(roundedMileage);
            setHighwayName(point.highway);
            if (point.direction) setDirection(point.direction);
            return;
          }
        }

        // fallback: 用 heading 估方向
        if (pos.coords.heading !== null) {
          setDirection(pos.coords.heading < 180 ? '北上車道' : '南下車道');
        }
      },
      err => {
        console.error(err);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [kmlIndex, autoTracking, searchMode]);

  return {
    // GPS
    location,
    gpsStatus,
    accuracy,
    // KML
    kmlIndex,
    kmlLoading,
    highwayLine,
    currentKmlPoint,
    currentKmlType,
    // 定位狀態
    highwayName,
    setHighwayName,
    mileage,
    setMileage,
    direction,
    setDirection,
    searchMode,
    setSearchMode,
    autoTracking,
    setAutoTracking,
  };
}
