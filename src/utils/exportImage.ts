import { toPng } from 'html-to-image';

/**
 * 遍歷元素及其子元素，將所有計算後的顏色（包含 oklch, oklab 等）強行轉換為 RGB 內嵌樣式。
 * 這是為了解決截圖套件無法解析 Tailwind v4 新顏色格式的問題。
 */
const convertToComputedRgb = (element: HTMLElement) => {
  const elements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  const savedStyles: Array<{ el: HTMLElement; style: string }> = [];
  const updates: Array<{ el: HTMLElement; prop: string; value: string }> = [];

  // Phase 1: Read all computed styles
  elements.forEach((el) => {
    const style = window.getComputedStyle(el);
    const colorProps = ['backgroundColor', 'color', 'borderColor', 'boxShadow', 'outlineColor', 'textDecorationColor'];
    
    savedStyles.push({ el, style: el.style.cssText });

    colorProps.forEach((prop) => {
      const value = (style as any)[prop];
      if (value && (value.includes('oklch') || value.includes('oklab') || value.includes('var('))) {
        updates.push({
          el,
          prop: prop === 'backgroundColor' ? 'background-color' : 
                prop === 'borderColor' ? 'border-color' : 
                prop === 'boxShadow' ? 'box-shadow' : 
                prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
          value
        });
      }
    });
  });

  // Phase 2: Write all styles (prevents layout thrashing)
  updates.forEach(({ el, prop, value }) => {
    el.style.setProperty(prop, value, 'important');
  });

  return () => {
    savedStyles.forEach(({ el, style }) => {
      el.style.cssText = style;
    });
  };
};

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }
  
  let restoreColors: (() => void) | null = null;
  const originalStyle = element.style.cssText;
  const scrollContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar');
  const originalScrollStyles = Array.from(scrollContainers).map((el: any) => el.style.cssText);

  try {
    // 1. 展開容器
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('width', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    
    scrollContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('width', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('max-width', 'none', 'important');
    });

    // 2. 轉換顏色為 RGB，避免截圖套件解析失敗
    restoreColors = convertToComputedRgb(element);

    // 等待 DOM 更新 (縮短等待時間加速匯出)
    await new Promise(resolve => setTimeout(resolve, 30));

    const targetHeight = element.scrollHeight;
    // 大幅降低門檻以提速：超過 1500px 即採用單倍解析度
    const pixelRatio = targetHeight > 1500 ? 1 : 2; 

    // console.time('toPng'); // 用於效能追蹤
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: pixelRatio,
      width: element.scrollWidth,
      height: element.scrollHeight,
      skipFonts: true,
      style: {
        transform: 'none',
        // 確保在導出時不顯示某些過渡動畫
        transition: 'none'
      }
    });
    // console.timeEnd('toPng');
    
    const link = document.createElement('a');
    link.download = `${filename}_${new Date().getTime()}.png`;
    link.href = dataUrl;
    link.click();

  } catch (err: any) {
    console.error('Failed to export image:', err);
    alert(`匯出圖片失敗：${err.message || err} \n請檢查 F12 主控台錯誤訊息。`);
  } finally {
    // 3. 復原一切
    if (restoreColors) restoreColors();
    element.style.cssText = originalStyle;
    scrollContainers.forEach((el: any, i) => {
      el.style.cssText = originalScrollStyles[i];
    });
  }
};
