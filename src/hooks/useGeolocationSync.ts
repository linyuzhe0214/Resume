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
} from '../utils/kmlParser';

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

  // ── 1. 載入 KML 資料庫 ──
  useEffect(() => {
    setKmlLoading(true);
    const basePath = (import.meta as any).env?.BASE_URL || '/';
    const fetchPath = basePath.endsWith('/') ? `${basePath}route.kml` : `${basePath}/route.kml`;
    fetch(fetchPath)
      .then(res => res.text())
      .then(kmlText => {
        const points = parseKmlToPoints(kmlText);
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
        console.log(`KML 資料庫載入完成: ${points.length} 個測量點`);
        console.log('主線國道:', Object.keys(index.mainline));
        console.log('匝道國道:', Object.keys(index.ramp));
      })
      .catch(err => console.error('Failed to load local KML routing database:', err))
      .finally(() => setKmlLoading(false));
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
          );
          if (result) {
            const { point, exactMileage } = result;
            setCurrentKmlPoint(point);
            setCurrentKmlType(point.isRamp ? 'ramp' : 'mainline');
            const roundedMileage = Math.round(exactMileage);
            prevMileageRef.current = roundedMileage; // 更新上次里程
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
