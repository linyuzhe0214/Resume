import { toPng } from 'html-to-image';

/**
 * 遍歷元素及其子元素，將所有計算後的顏色（包含 oklch, oklab 等）強行轉換為 RGB 內嵌樣式。
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
 * 用 Blob URL 下載圖片 — 桌面和手機都能直接觸發下載。
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
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}_${new Date().getTime()}.png`;
    link.click();
  }
};

/**
 * 展開元素及其父元素、子元素的所有高度限制，確保匯出內容完整。
 */
const expandConstraints = (element: HTMLElement) => {
  const restores: Array<() => void> = [];

  // 1. 展開父鏈限制 (一直到 body)
  let parent = element.parentElement;
  while (parent && parent !== document.documentElement) {
    const cs = window.getComputedStyle(parent);
    if (cs.overflow !== 'visible' || cs.overflowY !== 'visible' || cs.overflowX !== 'visible' || cs.height !== 'auto' || cs.maxHeight !== 'none') {
      const saved = parent.style.cssText;
      const p = parent;
      p.style.setProperty('overflow', 'visible', 'important');
      p.style.setProperty('height', 'max-content', 'important');
      p.style.setProperty('max-height', 'none', 'important');
      restores.push(() => { p.style.cssText = saved; });
    }
    parent = parent.parentElement;
  }

  // 2. 展開元素本身的限制
  const savedElementCss = element.style.cssText;
  element.style.setProperty('height', 'max-content', 'important');
  element.style.setProperty('max-height', 'none', 'important');
  element.style.setProperty('width', 'max-content', 'important');
  element.style.setProperty('min-width', '900px', 'important'); // 強制桌面版寬度
  element.style.setProperty('overflow', 'visible', 'important');
  restores.push(() => { element.style.cssText = savedElementCss; });

  // 3. 展開所有子元素的 scroll 限制
  const scrollContainers = element.querySelectorAll(
    '.overflow-auto, .overflow-y-auto, .overflow-x-auto, .overflow-hidden, [class*="overflow-"]'
  ) as NodeListOf<HTMLElement>;
  const savedScrollStyles = Array.from(scrollContainers).map(el => el.style.cssText);
  scrollContainers.forEach((el) => {
    el.style.setProperty('height', 'max-content', 'important');
    el.style.setProperty('max-height', 'none', 'important');
    el.style.setProperty('width', 'max-content', 'important');
    el.style.setProperty('overflow', 'visible', 'important');
  });
  restores.push(() => {
    scrollContainers.forEach((el, i) => { el.style.cssText = savedScrollStyles[i]; });
  });

  return () => {
    // 逆序還原
    for (let i = restores.length - 1; i >= 0; i--) {
      restores[i]();
    }
  };
};

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    alert('找不到匯出區域，請重新整理頁面後再試。');
    return;
  }

  let restoreColors: (() => void) | null = null;
  let restoreConstraints: (() => void) | null = null;

  try {
    // 展開所有父層與子層的 overflow 和 height 限制
    restoreConstraints = expandConstraints(element);
    
    // 將計算出的顏色轉為 inline RGB
    restoreColors = convertToComputedRgb(element);

    // 稍微等待 DOM 渲染與重新排版
    await new Promise(resolve => setTimeout(resolve, 80));

    const targetHeight = element.scrollHeight;
    const pixelRatio = targetHeight > 2000 ? 1 : (targetHeight > 1000 ? 1.5 : 2);

    // console.time('toPng');
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio,
      width: Math.max(element.scrollWidth, 900),
      height: element.scrollHeight,
      skipFonts: true,
      style: {
        transform: 'none',
        transition: 'none'
      }
    });
    // console.timeEnd('toPng');

    downloadDataUrl(dataUrl, filename);

  } catch (err: any) {
    console.error('Failed to export image:', err);
    alert(`匯出圖片失敗：${err.message || err}`);
  } finally {
    if (restoreColors) restoreColors();
    if (restoreConstraints) restoreConstraints();
  }
};

/**
 * 合併多個 DOM 元素垂直拼接後匯出，強制使用桌面版寬度（至少 900px）。
 * 匯出前強制顯示 lg:block (桌面 table) 並隱藏 lg:hidden (手機 cards)。
 */
export const exportMultipleAsImage = async (elementIds: string[], filename: string) => {
  const elements = elementIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  if (elements.length === 0) {
    console.error('No elements found:', elementIds);
    alert('找不到匯出區域，請重新整理頁面後再試。');
    return;
  }

  // 強制桌面版 layout：顯示 table、隱藏 card
  const mobileCards = Array.from(document.querySelectorAll('.lg\\:hidden')) as HTMLElement[];
  const desktopTables = Array.from(document.querySelectorAll('.hidden.lg\\:block')) as HTMLElement[];
  const savedMobile: string[] = mobileCards.map(el => el.style.display);
  const savedDesktop: string[] = desktopTables.map(el => el.style.display);

  mobileCards.forEach(el => el.style.setProperty('display', 'none', 'important'));
  desktopTables.forEach(el => el.style.setProperty('display', 'block', 'important'));

  const restoreConstraintFns: Array<() => void> = [];
  const restoreColorFns: Array<() => void> = [];

  try {
    elements.forEach((element) => {
      restoreConstraintFns.push(expandConstraints(element));
      restoreColorFns.push(convertToComputedRgb(element));
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

    const images = await Promise.all(dataUrls.map(url =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      })
    ));

    const SCALE = 1.5;
    const canvasW = Math.max(...images.map(img => img.naturalWidth));
    const canvasH = images.reduce((acc, img) => acc + img.naturalHeight, 0);

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    let y = 0;
    images.forEach(img => {
      ctx.drawImage(img, 0, y, canvasW, img.naturalHeight);
      y += img.naturalHeight;
    });

    downloadDataUrl(canvas.toDataURL('image/png'), filename);

  } catch (err: any) {
    console.error('Failed to export images:', err);
    alert(`匯出圖片失敗：${err.message || err}`);
  } finally {
    restoreColorFns.forEach(fn => fn());
    restoreConstraintFns.forEach(fn => fn());
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
