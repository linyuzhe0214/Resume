import { toPng } from 'html-to-image';

/**
 * 遍歷元素及其子元素，將所有計算後的顏色（包含 oklch, oklab 等）強行轉換為 RGB 內嵌樣式。
 * 解決 Tailwind v4 新顏色格式在 html-to-image 無法解析的問題。
 */
const convertToComputedRgb = (element: HTMLElement) => {
  const elements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  const savedStyles: Array<{ el: HTMLElement; style: string }> = [];
  const updates: Array<{ el: HTMLElement; prop: string; value: string }> = [];

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
  const expandContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar, .overflow-hidden, .flex-1, .min-h-0');
  const originalExpandStyles = Array.from(expandContainers).map((el: any) => el.style.cssText);

  try {
    // 1. 簡單展開容器 (移除 width: max-content 防止跑版)
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    // 強制桌面寬度避免跑版
    element.style.setProperty('min-width', '900px', 'important'); 
    
    expandContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('min-height', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('flex', 'none', 'important');
      if (el.scrollTop) el.scrollTop = 0;
    });
    element.style.setProperty('flex', 'none', 'important');

    const stickyElements = element.querySelectorAll('.sticky');
    const originalStickyStyles = Array.from(stickyElements).map((el: any) => el.style.getPropertyValue('position'));
    stickyElements.forEach((el: any) => {
      el.style.setProperty('position', 'relative', 'important');
    });

    // 2. 轉換顏色為 RGB
    restoreColors = convertToComputedRgb(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const targetHeight = element.scrollHeight;
    const targetWidth = Math.max(element.scrollWidth, 900);
    
    // 電腦版大幅提升畫質，預設使用 3 倍解析度。若高度太長則稍微降低以符合 Canvas 限制
    const pixelRatio = 3;
    const MAX_CANVAS_HEIGHT = 16000;

    if (targetHeight * pixelRatio > MAX_CANVAS_HEIGHT) {
      alert(`⚠️ 國道全段長度超過單張圖片硬體極限，系統將保持最高畫質，並自動為您無縫分段下載為多張圖片（各段可完美拼接）。`);
      
      const chunkDOMHeight = Math.floor(MAX_CANVAS_HEIGHT / pixelRatio);
      const totalChunks = Math.ceil(targetHeight / chunkDOMHeight);
      
      for (let i = 0; i < totalChunks; i++) {
        const currentY = i * chunkDOMHeight;
        const currentChunkHeight = Math.min(chunkDOMHeight, targetHeight - currentY);
        
        const dataUrl = await toPng(element, {
          backgroundColor: '#ffffff',
          pixelRatio: pixelRatio,
          width: targetWidth,
          height: currentChunkHeight,
          skipFonts: true,
          style: {
            transform: `translateY(-${currentY}px)`,
            transition: 'none'
          }
        });
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${filename}_部分${i + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } else {
      const dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: pixelRatio,
        width: targetWidth,
        height: targetHeight,
        skipFonts: true,
        style: {
          transform: 'none',
          transition: 'none'
        }
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

  } catch (err: any) {
    console.error('Failed to export image:', err);
    const errMsg = (err instanceof Event) ? '處理圖片時發生不明的 Event 錯誤' : (err.message || err);
    alert(`匯出圖片失敗：${errMsg}`);
  } finally {
    // 3. 復原一切
    if (restoreColors) restoreColors();
    element.style.cssText = originalStyle;
    expandContainers.forEach((el: any, i) => {
      el.style.cssText = originalExpandStyles[i];
    });
    stickyElements.forEach((el: any, i) => {
      if (originalStickyStyles[i]) {
        el.style.setProperty('position', originalStickyStyles[i]);
      } else {
        el.style.removeProperty('position');
      }
    });
  }
};

/**
 * 合併多個 DOM 元素垂直拼接後匯出為一張圖片
 */
export const exportMultipleAsImage = async (elementIds: string[], filename: string) => {
  const elements = elementIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  if (elements.length === 0) {
    console.error('No elements found:', elementIds);
    return;
  }

  const restoreFns: Array<() => void> = [];
  const originalStyles = elements.map(el => el.style.cssText);
  const allScrollContainers: Array<{ el: any; style: string }[]> = [];

  // 強制桌面版 layout
  const mobileCards = Array.from(document.querySelectorAll('.lg\\:hidden')) as HTMLElement[];
  const desktopTables = Array.from(document.querySelectorAll('.hidden.lg\\:block')) as HTMLElement[];
  const savedMobile: string[] = mobileCards.map(el => el.style.display);
  const savedDesktop: string[] = desktopTables.map(el => el.style.display);

  mobileCards.forEach(el => el.style.setProperty('display', 'none', 'important'));
  desktopTables.forEach(el => el.style.setProperty('display', 'block', 'important'));

  try {
    elements.forEach((element, idx) => {
      const scrollContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar');
      const saved = Array.from(scrollContainers).map((el: any) => ({ el, style: el.style.cssText }));
      allScrollContainers.push(saved);

      element.style.setProperty('height', 'max-content', 'important');
      element.style.setProperty('overflow', 'visible', 'important');
      element.style.setProperty('min-width', '900px', 'important');
      scrollContainers.forEach((el: any) => {
        el.style.setProperty('height', 'max-content', 'important');
        el.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('flex', 'none', 'important');
      });

      restoreFns.push(convertToComputedRgb(element));
    });

    await new Promise(resolve => setTimeout(resolve, 80));

    const FIXED_WIDTH = Math.max(...elements.map(el => Math.max(el.scrollWidth, 900)));
    const totalRawHeight = elements.reduce((acc, el) => acc + el.scrollHeight, 0);
    
    let pixelRatio = 3;
    if (totalRawHeight * pixelRatio > 16000) {
      pixelRatio = Math.max(1.5, 16000 / totalRawHeight);
    }
    
    const images: HTMLImageElement[] = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const url = await toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: pixelRatio,
        width: FIXED_WIDTH,
        height: el.scrollHeight,
        skipFonts: true,
        style: { transform: 'none', transition: 'none' }
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`第 ${i + 1} 個區塊合併時發生錯誤。`));
        img.src = url;
      });
      images.push(img);
    }

    const totalHeight = images.reduce((acc, img, i) => acc + elements[i].scrollHeight * pixelRatio, 0);

    const canvas = document.createElement('canvas');
    canvas.width = FIXED_WIDTH * pixelRatio;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 0;
    images.forEach((img, i) => {
      ctx.drawImage(img, 0, y);
      y += elements[i].scrollHeight * pixelRatio;
    });

    const finalDataUrl = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.href = finalDataUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (err: any) {
    console.error('Failed to export images:', err);
    const errMsg = (err instanceof Event) ? '處理圖片時發生不明的 Event 錯誤' : (err.message || err);
    alert(`匯出圖片失敗：${errMsg}`);
  } finally {
    restoreFns.forEach(fn => fn());
    elements.forEach((el, i) => { el.style.cssText = originalStyles[i]; });
    allScrollContainers.forEach(containers => {
      containers.forEach(({ el, style }) => { el.style.cssText = style; });
    });
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
