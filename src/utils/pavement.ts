import { PavementLayer } from '../types';

/**
 * 根據鋪面材質與厚度獲取精確顏色 (對齊圖片配色邏輯)
 */
export function getPavementColor(combinedType: string, thickness: number): string {
  const type = combinedType.toUpperCase();
  
  // OG 系列
  if (type === 'OG' || type === 'OGAC') {
    if (thickness <= 2) return '#ffff00'; // 黃色
  }
  
  // OG+DG 系列
  if (type.includes('OG') && type.includes('DG')) {
    if (thickness <= 5) return '#d9d9d9';  // 淺灰
    if (thickness <= 7) return '#fff2cc';  // 奶油色
    if (thickness <= 12) return '#ffd966'; // 金黃
    if (thickness <= 17) return '#f4b183'; // 橘色
    return '#c55a11'; // 深褐 (22cm)
  }
  
  // PAC 系列
  if (type === 'PAC') {
    if (thickness <= 3) return '#00b0f0'; // 深青色
  }
  
  // PAC+DG 系列
  if (type.includes('PAC') && type.includes('DG')) {
    if (type.includes('GUSS')) return '#e2efda'; // 粉綠 (11cm)
    if (thickness <= 8) return '#ddebf7';  // 極淺藍
    if (thickness <= 13) return '#9bc2e6'; // 淺藍
    if (thickness <= 18) return '#5b9bd5'; // 中藍
    return '#2f75b5'; // 深藍 (22-23cm)
  }

  // 其他個別材質預設
  if (type.includes('SMA')) return '#7030a0';    // 紫色
  if (type.includes('GUSS')) return '#c00000';   // 深紅
  if (type.includes('BTB')) return '#843c0c';    // 棕色
  if (type.includes('AB')) return '#7f7f7f';     // 灰色
  
  return '#e7e6e6'; // 預設灰色
}

/**
 * 計算指定月份的鋪面總厚度與組合材料名稱
 */
export function getPavementDisplayInfo(layers: PavementLayer[], targetMonth?: string) {
  const relevantLayers = targetMonth 
    ? layers.filter(l => l.month === targetMonth)
    : layers;

  const thickness = relevantLayers.reduce((acc, curr) => acc + curr.thickness, 0);
  const types = Array.from(new Set(relevantLayers.map(l => l.type.split('(')[0].trim().toUpperCase())));
  const combinedType = types.join('+');

  return {
    thickness,
    combinedType,
    color: getPavementColor(combinedType, thickness)
  };
}

/**
 * 根據標籤解析厚度並獲取顏色
 */
export function getColorFromLabel(label: string): string {
  const thicknessMatch = label.match(/(\d+)cm/);
  const thickness = thicknessMatch ? parseInt(thicknessMatch[1], 10) : 0;
  const cleanLabel = label.replace(/\d+cm/gi, '').replace(/局部|銑削|刨除|加鋪|milling|REINFORCE|REINFORCEMENT/gi, '').trim().toUpperCase();
  return getPavementColor(cleanLabel, thickness);
}
