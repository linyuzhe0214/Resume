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
          prop: prop === 'backgroundColor' ? 'background-color'
              : prop === 'borderColor' ? 'border-color'
              : prop === 'boxShadow' ? 'box-shadow'
              : prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
          value,
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

  // ---- 收集需要還原的 style ----
  const originalStyle = element.style.cssText;

  const expandContainers = element.querySelectorAll(
    '.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar, .overflow-hidden, .flex-1, .min-h-0'
  );
  const originalExpandStyles = Array.from(expandContainers).map((el: any) => el.style.cssText);

  const stickyElements = element.querySelectorAll('.sticky');
  const originalStickyStyles = Array.from(stickyElements).map((el: any) => el.style.cssText);

  // 收集所有祖先（到 body 為止），後續一起展開 overflow
  const ancestors: HTMLElement[] = [];
  const ancestorStyles: string[] = [];
  let cursor = element.parentElement;
  while (cursor && cursor !== document.documentElement) {
    ancestors.push(cursor);
    ancestorStyles.push(cursor.style.cssText);
    cursor = cursor.parentElement;
  }

  let restoreColors: (() => void) | null = null;

  try {
    // 1. 展開祖先的 overflow / height 限制
    ancestors.forEach((el) => {
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('flex', 'none', 'important');
    });

    // 2. 展開元素本身
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    element.style.setProperty('min-width', '900px', 'important');
    element.style.setProperty('flex', 'none', 'important');

    expandContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('min-height', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('flex', 'none', 'important');
      if (el.scrollTop) el.scrollTop = 0;
    });

    stickyElements.forEach((el: any) => el.style.setProperty('position', 'relative', 'important'));

    // 3. bake oklch → rgb
    restoreColors = convertToComputedRgb(element);

    // 4. 等待瀏覽器 reflow
    await new Promise(resolve => setTimeout(resolve, 200));

    const targetHeight = element.scrollHeight;
    const targetWidth = Math.max(element.scrollWidth, 900);

    // 5. 計算 safePixelRatio（確保 canvas 不超 16384px 硬限制）
    const MAX_CANVAS_PX = 16384;
    const pixelRatio = 3;
    const safePixelRatio = targetHeight * pixelRatio > MAX_CANVAS_PX
      ? Math.max(1.5, Math.floor((MAX_CANVAS_PX / targetHeight) * 10) / 10)
      : pixelRatio;

    // 6. 截整張圖（⚠️ 不傳 height，讓 html-to-image 讀 getBoundingClientRect 完整高度）
    const fullDataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: safePixelRatio,
      width: targetWidth,
      skipFonts: true,
      style: { transform: 'none', transition: 'none' },
    });

    // 7. 判斷是否需要分段（截出的圖超過 16384px 才分切）
    const fullImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('圖片載入失敗'));
      img.src = fullDataUrl;
    });

    const fullW = fullImg.naturalWidth;
    const fullH = fullImg.naturalHeight;
    const CHUNK_PX = Math.floor(MAX_CANVAS_PX * 0.9);
    const totalChunks = Math.ceil(fullH / CHUNK_PX);

    if (totalChunks > 1) {
      alert(`⚠️ 圖片較長，系統將自動分段下載為 ${totalChunks} 張圖片（各段可完美拼接）。`);
    }

    for (let i = 0; i < totalChunks; i++) {
      const srcY = i * CHUNK_PX;
      const srcH = Math.min(CHUNK_PX, fullH - srcY);

      const chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = fullW;
      chunkCanvas.height = srcH;
      const ctx = chunkCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, fullW, srcH);
      ctx.drawImage(fullImg, 0, srcY, fullW, srcH, 0, 0, fullW, srcH);

      const link = document.createElement('a');
      link.href = chunkCanvas.toDataURL('image/png');
      link.download = totalChunks > 1 ? `${filename}_部分${i + 1}.png` : `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (i < totalChunks - 1) await new Promise(r => setTimeout(r, 600));
    }

  } catch (err: any) {
    console.error('Failed to export image:', err);
    const errMsg = (err instanceof Event) ? '處理圖片時發生不明的 Event 錯誤' : (err.message || err);
    alert(`匯出圖片失敗：${errMsg}`);
  } finally {
    if (restoreColors) restoreColors();
    element.style.cssText = originalStyle;
    expandContainers.forEach((el: any, i) => { el.style.cssText = originalExpandStyles[i]; });
    stickyElements.forEach((el: any, i) => { el.style.cssText = originalStickyStyles[i]; });
    ancestors.forEach((el, i) => { el.style.cssText = ancestorStyles[i]; });
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

  const mobileCards = Array.from(document.querySelectorAll('.lg\\:hidden')) as HTMLElement[];
  const desktopTables = Array.from(document.querySelectorAll('.hidden.lg\\:block')) as HTMLElement[];
  const savedMobile: string[] = mobileCards.map(el => el.style.display);
  const savedDesktop: string[] = desktopTables.map(el => el.style.display);

  mobileCards.forEach(el => el.style.setProperty('display', 'none', 'important'));
  desktopTables.forEach(el => el.style.setProperty('display', 'block', 'important'));

  try {
    elements.forEach((element) => {
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
        pixelRatio,
        width: FIXED_WIDTH,
        height: el.scrollHeight,
        skipFonts: true,
        style: { transform: 'none', transition: 'none' },
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

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
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
