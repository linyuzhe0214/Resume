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
 * 將元素 clone 到 body 頂層，以完全脫離 overflow/height 限制的父容器，
 * 然後截圖，截完後移除 clone。
 * minWidth 用於強制「桌面寬度」截圖。
 */
const cloneAndCapture = async (
  element: HTMLElement,
  minWidth = 0,
  pixelRatio = 1.5
): Promise<string> => {
  // 先把顏色轉成 RGB（在原始元素上，這樣 clone 出來的 inline style 就是 rgb 了）
  const restoreColors = convertToComputedRgb(element);

  // 展開原始元素的所有內部 scroll 容器，讓 scrollHeight 正確
  const allInner = element.querySelectorAll('*') as NodeListOf<HTMLElement>;
  const savedInnerStyles: string[] = [];
  allInner.forEach(el => {
    savedInnerStyles.push(el.style.cssText);
    const cs = window.getComputedStyle(el);
    if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('height', 'max-content', 'important');
    }
  });

  await new Promise(resolve => setTimeout(resolve, 80));

  const naturalW = Math.max(element.scrollWidth, minWidth);
  const naturalH = element.scrollHeight;

  // Clone 到 body 頂層，完全脫離父容器限制
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.cssText = '';
  clone.style.position = 'fixed';
  clone.style.top = '-99999px';
  clone.style.left = '0';
  clone.style.width = `${naturalW}px`;
  clone.style.height = `${naturalH}px`;
  clone.style.overflow = 'visible';
  clone.style.zIndex = '-9999';
  clone.style.background = '#ffffff';
  document.body.appendChild(clone);

  // 展開 clone 內部所有 overflow
  const cloneInner = clone.querySelectorAll('*') as NodeListOf<HTMLElement>;
  cloneInner.forEach(el => {
    el.style.setProperty('overflow', 'visible', 'important');
    el.style.setProperty('max-height', 'none', 'important');
    el.style.removeProperty('height');
  });

  await new Promise(resolve => setTimeout(resolve, 30));

  try {
    const dataUrl = await toPng(clone, {
      backgroundColor: '#ffffff',
      pixelRatio,
      width: naturalW,
      height: clone.scrollHeight,
      skipFonts: true,
      style: { transform: 'none', transition: 'none', position: 'relative', top: '0', left: '0' }
    });
    return dataUrl;
  } finally {
    document.body.removeChild(clone);
    // restore
    restoreColors();
    allInner.forEach((el, i) => { el.style.cssText = savedInnerStyles[i]; });
  }
};

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    alert('找不到匯出區域，請重新整理頁面後再試。');
    return;
  }

  try {
    const targetH = element.scrollHeight;
    const pixelRatio = targetH > 2000 ? 1 : (targetH > 1000 ? 1.5 : 2);
    const dataUrl = await cloneAndCapture(element, 900, pixelRatio);
    downloadDataUrl(dataUrl, filename);
  } catch (err: any) {
    console.error('Failed to export image:', err);
    alert(`匯出圖片失敗：${err.message || err}`);
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

  // 短暫等待 layout 更新
  await new Promise(resolve => setTimeout(resolve, 60));

  try {
    const dataUrls = await Promise.all(
      elements.map(el => cloneAndCapture(el, 900, 1.5))
    );

    const images = await Promise.all(dataUrls.map(url =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      })
    ));

    // 以最寬的元素決定 canvas 寬度
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
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
