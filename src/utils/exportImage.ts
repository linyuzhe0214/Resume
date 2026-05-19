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

  let viewport: HTMLDivElement | null = null;

  try {
    // 1. 暫時展開原始元素，讀取完整尺寸
    const originalStyle = element.style.cssText;
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    element.style.setProperty('min-width', '900px', 'important');
    element.style.setProperty('flex', 'none', 'important');

    const expandContainers = element.querySelectorAll(
      '.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar, .overflow-hidden, .flex-1, .min-h-0'
    );
    const originalExpandStyles = Array.from(expandContainers).map((el: any) => el.style.cssText);
    expandContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('min-height', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('flex', 'none', 'important');
      if (el.scrollTop) el.scrollTop = 0;
    });

    const stickyElements = element.querySelectorAll('.sticky');
    stickyElements.forEach((el: any) => el.style.setProperty('position', 'relative', 'important'));

    await new Promise(resolve => setTimeout(resolve, 100));

    const targetHeight = element.scrollHeight;
    const targetWidth = Math.max(element.scrollWidth, 900);

    // 復原原始元素（後面用 clone 截圖，不影響原始頁面）
    element.style.cssText = originalStyle;
    expandContainers.forEach((el: any, i) => { el.style.cssText = originalExpandStyles[i]; });
    stickyElements.forEach((el: any) => el.style.removeProperty('position'));

    // 2. 建離屏 viewport 容器（overflow:hidden，固定高度 ≤ CHUNK_DOM_HEIGHT）
    //
    //    核心原理：html-to-image 用 SVG foreignObject 渲染 DOM，
    //    當 foreignObject 高度超過瀏覽器限制（約視窗高度的幾倍）時，
    //    超出部分直接渲染成空白，不管 CSS 怎麼設都無效。
    //
    //    正確做法：讓截圖目標（viewport）永遠維持小高度，
    //    把 clone 放在裡面用 translateY 偏移，每次截不同的段。
    const pixelRatio = 3;
    const CHUNK_DOM_HEIGHT = 5000; // 5000px × 3 = 15000px canvas，安全不超限
    const totalChunks = Math.ceil(targetHeight / CHUNK_DOM_HEIGHT);

    if (totalChunks > 1) {
      alert(`⚠️ 國道全段長度較長，系統將自動分段下載為 ${totalChunks} 張圖片（各段可完美拼接）。`);
    }

    viewport = document.createElement('div');
    viewport.style.cssText = [
      `position:fixed`,
      `top:0`,
      `left:-${targetWidth + 20}px`,
      `width:${targetWidth}px`,
      `height:${CHUNK_DOM_HEIGHT}px`,
      `overflow:hidden`,
      `z-index:-9999`,
      `pointer-events:none`,
      `background:#ffffff`,
    ].join(';');
    document.body.appendChild(viewport);

    // clone 完整 DOM，清除 inline style 後重設
    const clone = element.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    clone.style.cssText = '';
    clone.style.setProperty('width', `${targetWidth}px`, 'important');
    clone.style.setProperty('height', 'max-content', 'important');
    clone.style.setProperty('overflow', 'visible', 'important');
    clone.style.setProperty('flex', 'none', 'important');
    clone.style.setProperty('transform-origin', 'top left', 'important');
    viewport.appendChild(clone);

    // 展開 clone 內所有捲動/flex 容器
    clone.querySelectorAll(
      '.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar, .overflow-hidden, .flex-1, .min-h-0'
    ).forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('min-height', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('flex', 'none', 'important');
    });
    clone.querySelectorAll('.sticky').forEach((el: any) => {
      el.style.setProperty('position', 'relative', 'important');
    });

    // bake 所有 oklch/oklab 顏色為 rgb（Tailwind v4 相容）
    convertToComputedRgb(clone);

    await new Promise(resolve => setTimeout(resolve, 150));

    // 3. 分段截圖
    const chunkDataUrls: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const offsetY = i * CHUNK_DOM_HEIGHT;
      const chunkHeight = Math.min(CHUNK_DOM_HEIGHT, targetHeight - offsetY);

      // 調整 viewport 高度，clone 往上偏移 offsetY
      viewport.style.height = `${chunkHeight}px`;
      clone.style.setProperty('transform', `translateY(-${offsetY}px)`, 'important');

      await new Promise(resolve => setTimeout(resolve, 80));

      // 截 viewport（高度 ≤ CHUNK_DOM_HEIGHT，foreignObject 不會超限）
      const dataUrl = await toPng(viewport, {
        backgroundColor: '#ffffff',
        pixelRatio,
        width: targetWidth,
        height: chunkHeight,
        skipFonts: true,
        style: { transform: 'none', transition: 'none' },
      });

      chunkDataUrls.push(dataUrl);
    }

    document.body.removeChild(viewport);
    viewport = null;

    // 4. 逐段下載
    for (let i = 0; i < chunkDataUrls.length; i++) {
      const link = document.createElement('a');
      link.href = chunkDataUrls[i];
      link.download = totalChunks > 1 ? `${filename}_部分${i + 1}.png` : `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (i < chunkDataUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

  } catch (err: any) {
    console.error('Failed to export image:', err);
    const errMsg = (err instanceof Event) ? '處理圖片時發生不明的 Event 錯誤' : (err.message || err);
    alert(`匯出圖片失敗：${errMsg}`);
  } finally {
    if (viewport && viewport.parentNode) {
      document.body.removeChild(viewport);
    }
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
