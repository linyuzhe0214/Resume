const fs = require('fs');
const path = require('path');

const kmlPath = path.resolve(__dirname, '../public/route.kml');
const jsonPath = path.resolve(__dirname, '../public/route.json');

console.log('Reading KML file:', kmlPath);
const startTime = Date.now();
const content = fs.readFileSync(kmlPath, 'utf8');
console.log(`Read ${content.length} chars in ${Date.now() - startTime}ms`);

const HIGHWAY_NAME_MAP = {
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

const DIRECTION_MAP = {
  '往南': '南下車道',
  '往北': '北上車道',
  '往東': '東向車道',
  '往西': '西向車道',
};

function parseNum(val) {
  if (!val || val === 'NULL' || val === 'null') return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// 抽取所有 Placemark
const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
const points = [];
let match;

while ((match = placemarkRegex.exec(content)) !== null) {
  const pStr = match[1];
  if (!pStr.includes('<Point>')) continue;

  const coordMatch = pStr.match(/<coordinates>\s*([^,\s]+)\s*,\s*([^,\s]+)/);
  if (!coordMatch) continue;
  const lon = parseFloat(coordMatch[1]);
  const lat = parseFloat(coordMatch[2]);
  if (isNaN(lon) || isNaN(lat)) continue;

  const schemaMatch = pStr.match(/<SchemaData[^>]*schemaUrl=["']([^"']*)["']/);
  const schemaUrl = schemaMatch ? schemaMatch[1] : '';
  const isRamp = schemaUrl.includes('匝道');

  // SimpleData 欄位抓取
  const simpleData = {};
  const sdRegex = /<SimpleData\s+name=["']([^"']+)["']>([\s\S]*?)<\/SimpleData>/g;
  let sdMatch;
  while ((sdMatch = sdRegex.exec(pStr)) !== null) {
    simpleData[sdMatch[1]] = sdMatch[2].trim();
  }

  const rawHw = simpleData['國道名稱'] || '';
  const highway = HIGHWAY_NAME_MAP[rawHw] || rawHw;
  const rawDir = simpleData['方向'] || '';
  const direction = DIRECTION_MAP[rawDir] || rawDir;
  const mileage = parseNum(simpleData['里程']);
  if (mileage <= 0) continue;

  const stakeNo = simpleData['樁號'] || '';
  const roadWidth = parseNum(simpleData['路幅寬']);
  const laneCount = Math.floor(parseNum(simpleData['車道數']));
  const pavementType = simpleData['鋪面種類'] || '';

  const laneWidths = [];
  for (let i = 1; i <= 6; i++) {
    const w = parseNum(simpleData[`車道${i}寬`]);
    if (w > 0) laneWidths.push(w);
  }

  const hasChannelization = (simpleData['槽化區'] === '有');
  const channelizationWidth = parseNum(simpleData['槽化區寬']);
  const curvatureRadius = parseNum(simpleData['曲率半徑']);
  const longitudinalSlope = parseNum(simpleData['縱向坡度']);
  const lateralSlope = parseNum(simpleData['橫向坡度']);

  if (isRamp) {
    points.push({
      isRamp: true,
      highway,
      direction,
      mileage,
      stakeNo,
      rampId: simpleData['匝道編號'] || '',
      rampIdOld: simpleData['匝道編號 (舊)'] || simpleData['匝道編號 ('] || '',
      interchangeName: simpleData['交流道名稱'] || '',
      rampDescription: simpleData['匝道中文描述'] || simpleData['匝道中文描'] || '',
      entryExit: simpleData['出入國道'] || '',
      pavementType,
      distFromRampStart: parseNum(simpleData['與匝道起點距離'] || simpleData['與匝道起點']),
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
    });
  } else {
    const hasInnerShoulder = (simpleData['內路肩'] === '有');
    const innerShoulderWidth = parseNum(simpleData['內路肩寬']);
    const hasOuterShoulder = (simpleData['外路肩'] === '有');
    const outerShoulderWidth = parseNum(simpleData['外路肩寬']);

    const auxiliaryLanes = [];
    for (let i = 1; i <= 3; i++) {
      const nameKey1 = `輔助車道${i}`;
      const widthKey1 = `輔助車道${i}寬`;
      const widthKey2 = `輔助車道${i}_1`;
      const auxName = simpleData[nameKey1];
      const auxWidth = parseNum(simpleData[widthKey1] || simpleData[widthKey2]);
      if (auxName && auxName !== '無' && auxWidth > 0) {
        auxiliaryLanes.push({ name: auxName, width: auxWidth });
      }
    }

    const hasPullover = (simpleData['避車彎'] === '有');
    const fullRoadWidth = parseNum(simpleData['全路幅寬']) || roadWidth;
    const roadType = simpleData['道路型式'] || '';

    points.push({
      isRamp: false,
      highway,
      direction,
      mileage,
      stakeNo,
      roadType,
      pavementType,
      roadWidth,
      fullRoadWidth,
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
    });
  }
}

console.log(`Parsed ${points.length} points in ${Date.now() - startTime}ms`);
fs.writeFileSync(jsonPath, JSON.stringify(points));
const jsonStat = fs.statSync(jsonPath);
console.log(`Wrote JSON: ${(jsonStat.size / 1024 / 1024).toFixed(2)} MB`);
