import { PavementLayer } from '../types';

/**
 * 根據鋪面材料類型獲取對應的展示顏色
 * 邏輯參考主線分類原理
 */
export function getPavementColor(combinedType: string): string {
  const type = combinedType.toUpperCase();
  
  if (type.includes('OG')) return '#ffff00';     // 黃色
  if (type.includes('PAC')) return '#00b0f0';    // 淺藍
  if (type.includes('SMA')) return '#7030a0';    // 紫色
  if (type.includes('GUSS')) return '#c00000';   // 深紅
  if (type.includes('BTB')) return '#843c0c';    // 棕色
  if (type.includes('AB')) return '#7f7f7f';     // 灰色
  if (type.includes('DG')) return '#ffc000';     // 橘黃
  
  return '#e7e6e6'; // 預設灰色（傳統/舊有）
}

/**
 * 計算指定月份的鋪面總厚度與組合材料名稱
 */
export function getPavementDisplayInfo(layers: PavementLayer[], targetMonth?: string) {
  const relevantLayers = targetMonth 
    ? layers.filter(l => l.month === targetMonth)
    : layers;

  const thickness = relevantLayers.reduce((acc, curr) => acc + curr.thickness, 0);
  const types = relevantLayers.map(l => l.type.split('(')[0].trim().toUpperCase());
  const combinedType = types.join('+');

  return {
    thickness,
    combinedType,
    color: getPavementColor(combinedType)
  };
}

/**
 * 根據文字標籤獲取顏色（用於維護紀錄等情境）
 */
export function getColorFromLabel(label: string): string {
  const cleanLabel = label.replace(/局部|銑削|刨除|加鋪|milling|REINFORCE|REINFORCEMENT/gi, '').trim().toUpperCase();
  return getPavementColor(cleanLabel);
}
