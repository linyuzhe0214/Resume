import { useState, useEffect } from 'react';
import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import { 
  parseKmlToPoints, 
  buildKmlIndex, 
  findNearestPoint, 
  findNearestPointByGps, 
  type KmlIndex, 
  type KmlPoint 
} from '../utils/kmlParser';

export function useGeolocationSync() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'error'>('locating');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  
  const [highwayLine, setHighwayLine] = useState<Feature<LineString> | null>(null);
  const [highwayName, setHighwayName] = useState<string>('國道1號');
  const [mileage, setMileage] = useState<number>(166500);
  const [direction, setDirection] = useState<string>('北上車道');
  
  const [kmlIndex, setKmlIndex] = useState<KmlIndex | null>(null);
  const [kmlLoading, setKmlLoading] = useState(true);
  const [currentKmlPoint, setCurrentKmlPoint] = useState<KmlPoint | null>(null);
  const [currentKmlType, setCurrentKmlType] = useState<'mainline' | 'ramp' | null>(null);
  const [searchMode, setSearchMode] = useState<'auto' | 'mainline' | 'ramp'>('auto');
  const [autoTracking, setAutoTracking] = useState(true);

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

        for (const hw of Object.keys(index.mainline)) {
          const dirs = Object.values(index.mainline[hw]);
          if (dirs.length > 0 && dirs[0].length >= 2) {
            const coords = dirs[0].map(p => [p.lon, p.lat]);
            setHighwayLine(turf.lineString(coords));
            break;
          }
        }

        console.log(`KML 資料庫載入完成: ${points.length} 個測量點`);
      })
      .catch(err => console.error('Failed to load local KML routing database:', err))
      .finally(() => setKmlLoading(false));
  }, []);

  useEffect(() => {
    if (!kmlIndex) {
      setCurrentKmlPoint(null);
      setCurrentKmlType(null);
      return;
    }
    if (autoTracking) return;

    const result = findNearestPoint(kmlIndex, highwayName, direction, mileage, searchMode);
    setCurrentKmlPoint(result.point);
    setCurrentKmlType(result.type);
  }, [kmlIndex, highwayName, direction, mileage, searchMode, autoTracking]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation(pos);
        setAccuracy(pos.coords.accuracy);
        setGpsStatus('active');

        if (!autoTracking) return;

        if (kmlIndex && kmlIndex.allMainlinePoints.length > 0) {
          const result = findNearestPointByGps(
            kmlIndex,
            pos.coords.longitude,
            pos.coords.latitude,
            500,
            searchMode
          );
          if (result) {
            const { point, exactMileage } = result;
            setCurrentKmlPoint(point);
            setCurrentKmlType(point.isRamp ? 'ramp' : 'mainline');
            setMileage(Math.round(exactMileage));
            setHighwayName(point.highway);
            if (point.direction) setDirection(point.direction);
            return;
          }
        }

        if (pos.coords.heading !== null) {
          setDirection(pos.coords.heading < 180 ? '北上車道' : '南下車道');
        }
      },
      (err) => {
        console.error(err);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [kmlIndex, autoTracking, searchMode]);

  return {
    location,
    gpsStatus,
    accuracy,
    highwayLine,
    highwayName,
    setHighwayName,
    mileage,
    setMileage,
    direction,
    setDirection,
    kmlIndex,
    kmlLoading,
    currentKmlPoint,
    currentKmlType,
    searchMode,
    setSearchMode,
    autoTracking,
    setAutoTracking
  };
}
