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

/**
 * 下載圖片 — 使用 Blob URL 解決手機版無法下載或預覽的問題
 */
const downloadDataUrl = (dataUrl: string, filename: string) => {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: mime });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${filename}_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 稍後釋放 object URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (e) {
    // fallback
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}_${new Date().getTime()}.png`;
    link.click();
  }
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
    // 1. 簡單展開容器 (還原至原本不會出錯的寫法)
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('width', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    // 強制桌面寬度避免跑版
    element.style.setProperty('min-width', '900px', 'important'); 
    
    scrollContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('width', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('max-width', 'none', 'important');
    });

    // 2. 轉換顏色為 RGB，避免 Tailwind v4 色彩解析失敗
    restoreColors = convertToComputedRgb(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const targetHeight = element.scrollHeight;
    // 超長圖片自動降解析度以避免超出 GPU 極限
    const pixelRatio = targetHeight > 2000 ? 1 : 1.5; 

    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: pixelRatio,
      width: Math.max(element.scrollWidth, 900),
      height: element.scrollHeight,
      skipFonts: true,
      style: {
        transform: 'none',
        transition: 'none'
      }
    });

    downloadDataUrl(dataUrl, filename);

  } catch (err: any) {
    console.error('Failed to export image:', err);
    alert(`匯出圖片失敗：${err.message || err}`);
  } finally {
    // 3. 復原一切
    if (restoreColors) restoreColors();
    element.style.cssText = originalStyle;
    scrollContainers.forEach((el: any, i) => {
      el.style.cssText = originalScrollStyles[i];
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
      element.style.setProperty('width', 'max-content', 'important');
      element.style.setProperty('overflow', 'visible', 'important');
      element.style.setProperty('min-width', '900px', 'important');
      scrollContainers.forEach((el: any) => {
        el.style.setProperty('height', 'max-content', 'important');
        el.style.setProperty('width', 'max-content', 'important');
        el.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('max-width', 'none', 'important');
      });

      restoreFns.push(convertToComputedRgb(element));
    });

    await new Promise(resolve => setTimeout(resolve, 80));

    const FIXED_WIDTH = Math.max(...elements.map(el => Math.max(el.scrollWidth, 900)));
    
    const dataUrls = await Promise.all(elements.map(el =>
      toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
        width: FIXED_WIDTH,
        height: el.scrollHeight,
        skipFonts: true,
        style: { transform: 'none', transition: 'none' }
      })
    ));

    const images = await Promise.all(dataUrls.map(url => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    }));

    const totalHeight = images.reduce((acc, img, i) => acc + elements[i].scrollHeight * 1.5, 0);
    const canvas = document.createElement('canvas');
    canvas.width = FIXED_WIDTH * 1.5;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 0;
    images.forEach((img, i) => {
      ctx.drawImage(img, 0, y);
      y += elements[i].scrollHeight * 1.5;
    });

    const finalDataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(finalDataUrl, filename);

  } catch (err: any) {
    console.error('Failed to export images:', err);
    alert(`匯出圖片失敗：${err.message || err}`);
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
